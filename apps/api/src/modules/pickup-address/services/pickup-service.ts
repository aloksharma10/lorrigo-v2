import { VendorRegistrationResult } from '@/types/vendor';
import { SmartShipVendor } from '@/modules/vendors/smart-ship.vendor';
import { ShiprocketVendor, ShiprocketB2BVendor } from '@/modules/vendors/shiprocket.vendor';
import { DelhiveryVendorFactory } from '@/modules/vendors/delhivery.vendor';
import { getPincodeDetails } from '@/utils/pincode';
import { FastifyInstance } from 'fastify';
import { generateId, getFinancialYear, PickupAddress } from '@lorrigo/utils';
import { AddressType } from '@lorrigo/db';

/**
 * Service for hub-related operations
 */
export class PickupService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Create a new hub and register it with all vendors
   * @param pickupData Hub data for creation
   * @param sellerId Seller ID
   * @returns Promise resolving to hub creation result
   */
  async createPickup(pickupData: PickupAddress, sellerId: string, sellerName: string) {
    try {
      const { facilityName, contactPersonName, address: addressLine, isRTOAddressSame, rtoAddress, rtoCity, rtoState, rtoPincode } = pickupData;
      const pincode = pickupData.pincode;
      const phone = pickupData.phone;

      // Parallel: Check hub & get pincode
      const [existingHub, pincodeDetails] = await Promise.all([
        this.fastify.prisma.hub.findFirst({
          where: { name: facilityName, user_id: sellerId },
        }),
        getPincodeDetails(pincode),
      ]);

      if (existingHub) {
        return { valid: false, message: `Hub already exists with name: ${facilityName}` };
      }

      if (!pincodeDetails) {
        return { valid: false, message: `Invalid pincode: ${pincode}` };
      }

      const { city, state } = pincodeDetails;

      const [lastSequenceNumberHub, lastSequenceNumberAddress, b2bConfig, lastHub, lastHubForUser] = await Promise.all([
        this.fastify.prisma.hub.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        }),
        this.fastify.prisma.address.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        }),
        null,
        this.fastify.prisma.hub.findFirst({
          orderBy: {
            created_at: 'desc',
          },
        }),
        this.fastify.prisma.hub.findFirst({
          where: {
            user_id: sellerId,
          },
        }),
      ]);

      const is_first_hub = lastHubForUser === null;

      const lorrigoPickupId = generateId({
        tableName: 'HUB',
        prefix: `HUB`,
        entityName: sellerName,
        lastUsedFinancialYear: getFinancialYear(lastHub?.created_at || new Date()),
        lastSequenceNumber: lastSequenceNumberHub,
      }).id;

      const vendorPayload = {
        ...pickupData,
        pincode: pincode.toString(),
        phone: phone.toString(),
        city,
        state,
      };

      const smartShipVendor = new SmartShipVendor();
      const shiprocketVendor = new ShiprocketVendor();
      const shiprocketB2BVendor = new ShiprocketB2BVendor();
      const delhiveryVendors = DelhiveryVendorFactory.getAllVendors();

      const [smartShipResult, shiprocketResult, delhiveryResults, shiprocketB2BResult] = await Promise.all([
        smartShipVendor.registerHubWithBothDeliveryTypes(vendorPayload),
        shiprocketVendor.registerHub(vendorPayload, lorrigoPickupId),
        Promise.all(delhiveryVendors.map((vendor) => vendor.registerHub(vendorPayload))),
        null,
        // (b2bConfig?.token && b2bConfig?.clientId)
        //   ? (shiprocketB2BVendor.setClientId(b2bConfig.clientId), shiprocketB2BVendor.registerHub(vendorPayload, lorrigoPickupId, b2bConfig.token))
        //   : Promise.resolve(null)
      ]);

      const vendorResults: Record<string, VendorRegistrationResult> = {
        smartShip: smartShipResult,
        shiprocket: shiprocketResult,
        // ...(shiprocketB2BResult ? { shiprocketB2B: shiprocketB2BResult } : {}),
      };

      delhiveryResults.forEach((result, index) => {
        vendorResults[`delhivery${index === 0 ? '0.5' : index === 1 ? '5' : '10'}`] = result;
      });

      // ---------------- Transaction Handling ----------------
      let savedHub;

      try {
        savedHub = await this.fastify.prisma
          .$transaction(async (tx) => {
            const primaryAddress = await tx.address.create({
              data: {
                address: addressLine,
                city,
                state,
                pincode: pincode.toString(),
                type: AddressType.HUB_ADDRESS,
              },
            });

            let rtoAddressRecord = null;
            if (!isRTOAddressSame && rtoAddress && rtoCity && rtoState && rtoPincode) {
              rtoAddressRecord = await tx.address.create({
                data: {
                  address: rtoAddress,
                  city: rtoCity,
                  state: rtoState,
                  pincode: rtoPincode,
                  type: AddressType.HUB_RTO,
                },
              });
            }

            return await tx.hub.create({
              data: {
                is_primary: is_first_hub,
                code: lorrigoPickupId,
                smart_ship_codes: {
                  create: {
                    surface: smartShipResult.data?.surfaceHubId?.toString(),
                    express: smartShipResult.data?.expressHubId?.toString(),
                    heavy: smartShipResult.data?.heavyHubId?.toString(),
                  },
                },
                user: {
                  connect: {
                    id: sellerId,
                  },
                },
                name: facilityName,
                contact_person_name: contactPersonName,
                phone,
                is_rto_address_same: isRTOAddressSame ?? true,
                address: {
                  connect: {
                    id: primaryAddress.id,
                  },
                },
                ...(rtoAddressRecord
                  ? {
                      rto_address: {
                        connect: {
                          id: rtoAddressRecord.id,
                        },
                      },
                    }
                  : {}),
              },
            });
          })
          .catch((error) => {
            throw error;
          });
      } catch (error: any) {
        this.fastify.log.error('Transaction failed:', error);
        return {
          valid: false,
          message: 'Request failed while creating pickup address, Please try again later!',
          // error: error.message || error,
        };
      }

      // If transaction succeeded
      return {
        valid: true,
        message: 'Hub created successfully',
        hub: savedHub,
      };
    } catch (error: any) {
      this.fastify.log.error('Error creating hub:', error);
      return {
        valid: false,
        message: 'Unexpected server error while creating hub',
        error: error.message || error,
      };
    }
  }

  /**
   * Get all hubs for a seller with advanced filtering and pagination
   * @param sellerId Seller ID
   * @param queryParams Query parameters for filtering and pagination
   * @returns Promise resolving to paginated hubs
   */
  async getAllHubs(
    sellerId: string,
    queryParams: {
      page?: number;
      limit?: number;
      search?: string;
      is_active?: string[];
      is_primary?: string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    try {
      const { 
        page = 1, 
        limit = 15, 
        search, 
        is_active, 
        is_primary,
        sortBy = 'name',
        sortOrder = 'asc'
      } = queryParams;

      const skip = (page - 1) * limit;

      // Build base where clause
      let where: any = {
        user_id: sellerId,
      };

      // Add global search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { contact_person_name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { address: { address: { contains: search, mode: 'insensitive' } } },
          { address: { city: { contains: search, mode: 'insensitive' } } },
        ];
      }

      // Add status filter
      if (is_active && is_active.length > 0) {
        where.is_active = { in: is_active.map(v => v === 'true') };
      }

      // Add primary filter
      if (is_primary && is_primary.length > 0) {
        where.is_primary = { in: is_primary.map(v => v === 'true') };
      }

      // Build order by clause
      let orderBy: any = {};
      if (sortBy === 'name') {
        orderBy.name = sortOrder;
      } else if (sortBy === 'contact_person_name') {
        orderBy.contact_person_name = sortOrder;
      } else if (sortBy === 'is_active') {
        orderBy.is_active = sortOrder;
      } else if (sortBy === 'is_primary') {
        orderBy.is_primary = sortOrder;
      } else if (sortBy === 'created_at') {
        orderBy.created_at = sortOrder;
      } else {
        orderBy.name = 'asc'; // default sorting
      }

      // Get total count for pagination
      const total = await this.fastify.prisma.hub.count({ where });

      // Get hubs with pagination
      const hubs = await this.fastify.prisma.hub.findMany({
        where,
        orderBy,
        include: {
          address: true,
          rto_address: true,
        },
        skip,
        take: limit,
      });

      const formattedHubs = hubs.map((hub) => ({
        id: hub.id,
        name: hub.name,
        code: hub.code,
        contact_person_name: hub.contact_person_name,
        phone: hub.phone,
        is_active: hub.is_active,
        is_primary: hub.is_primary,
        is_rto_address_same: hub.is_rto_address_same,
        address: hub.address,
        rto_address: hub.rto_address,
        created_at: hub.created_at,
        updated_at: hub.updated_at,
      }));

      return {
        hubs: formattedHubs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      this.fastify.log.error('Error fetching hubs:', error);
      throw error;
    }
  }

  /**
   * Get all hubs for a seller (legacy method)
   * @param sellerId Seller ID
   * @returns Promise resolving to hubs
   */
  async getHubs(sellerId: string) {
    try {
      return await this.fastify.prisma.hub.findMany({
        where: {
          user_id: sellerId,
        },
        include: {
          address: true,
        },
      });
    } catch (error) {
      this.fastify.log.error('Error fetching hubs:', error);
      throw error;
    }
  }

  /**
   * Get a hub by ID
   * @param hubId Hub ID
   * @param sellerId Seller ID
   * @returns Promise resolving to hub
   */
  async getHubById(hubId: string, sellerId: string) {
    try {
      return await this.fastify.prisma.hub.findFirst({
        where: {
          id: hubId,
          user_id: sellerId,
        },
      });
    } catch (error) {
      this.fastify.log.error('Error fetching hub:', error);
      throw error;
    }
  }

  /**
   * Update hub status (active/inactive)
   * @param hubId Hub ID
   * @param isActive New active status
   * @param sellerId Seller ID
   * @returns Promise resolving to update result
   */
  async updateHubStatus(hubId: string, isActive: boolean, sellerId: string) {
    try {
      // Check if hub exists and belongs to seller
      const hub = await this.fastify.prisma.hub.findFirst({
        where: {
          id: hubId,
          user_id: sellerId,
        },
      });

      if (!hub) {
        return {
          success: false,
          message: 'Hub not found',
        };
      }

      // Prevent disabling primary hub
      if (hub.is_primary && !isActive) {
        return {
          success: false,
          message: 'Cannot disable primary hub. Please set another hub as primary first.',
        };
      }

      // Update hub status
      await this.fastify.prisma.hub.update({
        where: {
          id: hubId,
        },
        data: {
          is_active: isActive,
        },
      });

      return {
        success: true,
        message: `Hub ${isActive ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error: any) {
      this.fastify.log.error('Error updating hub status:', error);
      return {
        success: false,
        message: 'Failed to update hub status',
        error: error.message || error,
      };
    }
  }

  /**
   * Set hub as primary
   * @param hubId Hub ID
   * @param sellerId Seller ID
   * @returns Promise resolving to update result
   */
  async setPrimaryHub(hubId: string, sellerId: string) {
    try {
      // Check if hub exists and belongs to seller
      const hub = await this.fastify.prisma.hub.findFirst({
        where: {
          id: hubId,
          user_id: sellerId,
        },
      });

      if (!hub) {
        return {
          success: false,
          message: 'Hub not found',
        };
      }

      // Check if hub is active
      if (!hub.is_active) {
        return {
          success: false,
          message: 'Cannot set inactive hub as primary. Please activate the hub first.',
        };
      }

      // Use transaction to update primary hub
      await this.fastify.prisma.$transaction(async (tx) => {
        // Remove primary status from all other hubs
        await tx.hub.updateMany({
          where: {
            user_id: sellerId,
            is_primary: true,
          },
          data: {
            is_primary: false,
          },
        });

        // Set the new primary hub
        await tx.hub.update({
          where: {
            id: hubId,
          },
          data: {
            is_primary: true,
          },
        });
      });

      return {
        success: true,
        message: 'Primary hub updated successfully',
      };
    } catch (error: any) {
      this.fastify.log.error('Error setting primary hub:', error);
      return {
        success: false,
        message: 'Failed to set primary hub',
        error: error.message || error,
      };
    }
  }
}
