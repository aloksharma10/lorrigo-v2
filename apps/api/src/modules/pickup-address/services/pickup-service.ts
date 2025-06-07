import { VendorRegistrationResult } from '@/types/vendor';
import { SmartShipVendor } from '@/modules/vendors/smart-ship.vendor';
import { ShiprocketVendor, ShiprocketB2BVendor } from '@/modules/vendors/shiprocket.vendor';
import { DelhiveryVendorFactory } from '@/modules/vendors/delhivery.vendor';
import { getPincodeDetails } from '@/utils/pincode';
import { FastifyInstance } from 'fastify';
import { generateId, getFinancialYear, getFinancialYearStartDate, PickupAddress } from '@lorrigo/utils';

/**
 * Service for hub-related operations
 */
export class PickupService {
  constructor(private fastify: FastifyInstance) { }

  /**
   * Create a new hub and register it with all vendors
   * @param pickupData Hub data for creation
   * @param sellerId Seller ID
   * @returns Promise resolving to hub creation result
   */
  async createPickup(pickupData: PickupAddress, sellerId: string) {
    try {
      const { facilityName, contactPersonName, address: addressLine, isRTOAddressSame, rtoAddress, rtoCity, rtoState, rtoPincode } = pickupData;
      const pincode = Number(pickupData.pincode);
      const phone = pickupData.phone;

      // Parallel: Check hub & get pincode
      const [existingHub, pincodeDetails] = await Promise.all([
        this.fastify.prisma.hub.findFirst({
          where: { name: facilityName, user_id: sellerId }
        }),
        getPincodeDetails(pincode)
      ]);

      if (existingHub) {
        return { valid: false, message: `Hub already exists with name: ${facilityName}` };
      }

      if (!pincodeDetails) {
        return { valid: false, message: `Invalid pincode: ${pincode}` };
      }

      const { city, state } = pincodeDetails;
      const currentFinancialYear = getFinancialYear(new Date());

      const [lastSequenceNumberHub, lastSequenceNumberAddress, b2bConfig] = await Promise.all([
        this.fastify.prisma.hub.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            }
          }
        }),
        this.fastify.prisma.address.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        }),
        null
        // this.fastify.prisma.vendorConfig.findFirst({
        //   where: { vendorName: 'SHIPROCKET_B2B' },
        // }),
      ]);

      console.log(lastSequenceNumberHub, "lastSequenceNumberHub")
      const lorrigoPickupId = generateId({
        entityName: 'HUB',
        tableName: 'hub',
        lastUsedFinancialYear: currentFinancialYear,
        lastSequenceNumber: lastSequenceNumberHub + 1,
      }).id;

      const lorrigoAddressId = generateId({
        entityName: 'ADDRESS',
        tableName: 'address',
        lastUsedFinancialYear: currentFinancialYear,
        lastSequenceNumber: lastSequenceNumberAddress + 1,
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
        Promise.all(delhiveryVendors.map(vendor => vendor.registerHub(vendorPayload))),
        null
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
        savedHub = await this.fastify.prisma.$transaction(async tx => {
          const primaryAddress = await tx.address.create({
            data: {
              address: addressLine,
              city,
              state,
              pincode: pincode.toString(),
              code: lorrigoAddressId,
            }
          });

          let rtoAddressRecord = null;
          if (!isRTOAddressSame && rtoAddress && rtoCity && rtoState && rtoPincode) {
            rtoAddressRecord = await tx.address.create({
              data: {
                address: rtoAddress,
                city: rtoCity,
                state: rtoState,
                pincode: rtoPincode,
                code: `${lorrigoAddressId}-RTO`,
              }
            });
          }

          return await tx.hub.create({
            data: {
              code: lorrigoPickupId,
              hub_config: {
                create: {
                  smart_ship_hub_code_surface: smartShipResult.data?.surfaceHubId?.toString(),
                  smart_ship_hub_code_express: smartShipResult.data?.expressHubId?.toString(),
                }
              },
              user_id: sellerId,
              name: facilityName,
              contact_person_name: contactPersonName,
              phone,
              is_rto_address_same: isRTOAddressSame ?? true,
              address_id: primaryAddress.id,
              ...(rtoAddressRecord ? { rto_address_id: rtoAddressRecord.id } : {})
            }
          });
        }).catch(error => {
          console.log(error, "error")
          throw error;
        });
      } catch (error: any) {
        this.fastify.log.error("Transaction failed:", error);
        return {
          valid: false,
          message: "Request failed while creating pickup address, Please try again later!",
          // error: error.message || error,
        };
      }

      // If transaction succeeded
      return {
        valid: true,
        message: "Hub created successfully",
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
   * Get all hubs for a seller
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
}