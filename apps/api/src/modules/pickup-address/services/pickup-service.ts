import { VendorRegistrationResult } from '@/types/vendor';
import { SmartShipVendor } from '@/modules/vendors/smart-ship.vendor';
import { ShiprocketVendor, ShiprocketB2BVendor } from '@/modules/vendors/shiprocket.vendor';
import { DelhiveryVendorFactory } from '@/modules/vendors/delhivery.vendor';
import { getPincodeDetails } from '@/utils/pincode';
import { FastifyInstance } from 'fastify';

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
  async createPickup(pickupData: any, sellerId: string) {
    try {
      // Check if hub already exists
      const existingHub = await this.fastify.prisma.hub.findFirst({
        where: {
          name: pickupData.facilityName,
          user_id: sellerId, // Fixed: Use sellerId instead of undefined user_id
        },
      });

      if (existingHub) {
        return {
          valid: false,
          message: `Hub already exists with name: ${pickupData.facilityName}`,
        };
      }

      // Process input data
      const pincode = Number(pickupData.pincode);
      const phone = Number(pickupData.phone);

      // Fetch pincode details
      const pincodeDetails = await getPincodeDetails(pincode);

      if (!pincodeDetails) {
        return {
          valid: false,
          message: `Invalid pincode: ${pincode}`,
        };
      }

      // Set city and state from pincode details
      const city = pincodeDetails.District;
      const state = pincodeDetails.StateName;

      // Create payload for vendors
      const vendorPayload = {
        ...pickupData,
        pincode,
        phone,
        city,
        state,
      };

      // Initialize vendors
      const smartShipVendor = new SmartShipVendor();
      const shiprocketVendor = new ShiprocketVendor();
      const shiprocketB2BVendor = new ShiprocketB2BVendor();
      const delhiveryVendors = DelhiveryVendorFactory.getAllVendors();

      // Initialize results
      const vendorResults: Record<string, VendorRegistrationResult> = {};
      let hubId = 0;

      // Register with SmartShip
      const smartShipResult = await smartShipVendor.registerHubWithBothDeliveryTypes(vendorPayload);
      vendorResults.smartShip = smartShipResult;

      if (smartShipResult.success && smartShipResult.data?.hubId) {
        hubId = smartShipResult.data.hubId;
      }

      // Register with Shiprocket
      const shiprocketResult = await shiprocketVendor.registerHub(vendorPayload);
      vendorResults.shiprocket = shiprocketResult;

      // Get Shiprocket B2B config from database
      const b2bConfig = await this.fastify.prisma.vendorConfig.findFirst({
        where: {
          vendorName: 'SHIPROCKET_B2B',
        },
      });

      // If B2B config exists, register with Shiprocket B2B
      if (b2bConfig && b2bConfig.token && b2bConfig.clientId) {
        shiprocketB2BVendor.setClientId(b2bConfig.clientId);
        const shiprocketB2BResult = await shiprocketB2BVendor.registerHub(vendorPayload, b2bConfig.token);
        vendorResults.shiprocketB2B = shiprocketB2BResult;
      }

      // Register with all Delhivery weight categories
      const delhiveryResults = await Promise.all(
        delhiveryVendors.map(vendor => vendor.registerHub(vendorPayload))
      );

      delhiveryResults.forEach((result, index) => {
        vendorResults[`delhivery${index === 0 ? '0.5' : index === 1 ? '5' : '10'}`] = result;
      });

      // Create hub in database using Prisma
      const savedHub = await this.fastify.prisma.hub.create({
        data: {
          user_id:  sellerId,
          name: pickupData.name,
          contact_person_name: pickupData.contactPersonName,
          phone,
          address: pickupData.address,
          city,
          state,
          pincode,
          isRTOAddressSame: pickupData.isRTOAddressSame || true,
          rtoAddress: pickupData.rtoAddress || null,
          rtoCity: pickupData.rtoCity || null,
          rtoState: pickupData.rtoState || null,
          rtoPincode: pickupData.rtoPincode || null,
          vendorHubId: hubId,
          deliveryTypeId: 2, // Default to surface
          vendorData: JSON.stringify(vendorResults),
        },
      });

      return {
        valid: true,
        hub: savedHub,
      };
    } catch (error: any) {
      this.fastify.log.error('Error creating hub:', error);
      return {
        valid: false,
        message: 'Failed to create hub',
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