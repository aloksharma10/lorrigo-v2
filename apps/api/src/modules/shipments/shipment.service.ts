import { OrderType, PrismaClient } from '@lorrigo/db';
import { DelhiveryVendorFactory } from '../vendors/delhivery.vendor';
import { ShiprocketVendor } from '../vendors/shiprocket.vendor';
import { SmartShipVendor } from '../vendors/smart-ship.vendor';
import { BaseVendor } from '../vendors/base-vendor';
import { VendorShipmentResult } from '@/types/vendor';

const prisma = new PrismaClient();

/**
 * Service for handling shipment creation across different vendors
 */
export class ShipmentService {
  /**
   * Create a shipment using the appropriate vendor based on courier selection
   * @param orderId Order ID to create a shipment for
   * @param courierId Courier ID to use for shipment
   * @param dimensions Package dimensions
   * @param isReverseOrder Reverse order flag
   * @returns Promise resolving to shipment creation result
   */
  public async createShipment(
    orderId: string,
    courierId: string,
    dimensions: {
      weight: number;
      length: number;
      width: number;
      height: number;
    },
    isReverseOrder: boolean = false
  ): Promise<VendorShipmentResult> {
    try {
      // Fetch order with related data
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          shipping_address: true,
          items: true,
          hub: {
            include: {
              address: true,
              rto_address: true,
            },
          },
          user: true,
        },
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          data: null,
        };
      }

      // Fetch courier details
      const courier = await prisma.courier.findUnique({
        where: { id: courierId },
      });

      if (!courier) {
        return {
          success: false,
          message: 'Courier not found',
          data: null,
        };
      }

      // Determine payment method
      const paymentMethod = order.payment_mode;

      // Prepare shipment data
      const shipmentData = {
        order,
        hub: order.hub,
        orderItems: order.items,
        paymentMethod,
        dimensions,
        courier,
        seller_gst: order.user.gstin || '',
        courier_id: courier.courier_code,
      };

      // Get the appropriate vendor based on courier
      const vendor = this.getVendorForCourier(courier);

      // Create shipment with the selected vendor
      const result = await vendor.createShipment(shipmentData);

      // If successful, create shipment record in database
      if (result.success && result.awb) {
        const newShipment = await prisma.shipment.create({
          data: {
            code: `SH-${Math.floor(Math.random() * 1000000)}`,
            awb: result.awb,
            status: 'CREATED',
            weight: dimensions.weight,
            number_of_boxes: 1,
            is_reverse_order: isReverseOrder,
            shipping_charge: 0, // These would be calculated based on business logic
            fw_charge: 0,
            cod_amount: paymentMethod === 'COD' ? order.total_amount : 0,
            rto_charge: 0,
            order_zone: '',
            order_id: order.id,
            user_id: order.user_id,
            courier_id: courier.id,
          },
        });

        // Create initial tracking event
        await prisma.trackingEvent.create({
          data: {
            code: `TE-${Math.floor(Math.random() * 1000000)}`,
            status: 'CREATED',
            description: 'Shipment created',
            shipment_id: newShipment.id,
          },
        });

        // Update result with shipment ID
        result.data = {
          ...result.data,
          shipment_id: newShipment.id,
        };
      }

      return result;
    } catch (error) {
      console.error('Error creating shipment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null,
      };
    }
  }

  /**
   * Get the appropriate vendor instance based on courier
   * @param courier Courier details
   * @returns Vendor instance
   */
  private getVendorForCourier(courier: any): BaseVendor {
    const courierCode = courier.courier_code.toUpperCase();

    // Delhivery couriers
    if (courierCode.includes('DELHIVERY')) {
      if (courierCode.includes('0.5')) {
        return DelhiveryVendorFactory.getVendor('0.5');
      } else if (courierCode.includes('10')) {
        return DelhiveryVendorFactory.getVendor('10');
      } else {
        return DelhiveryVendorFactory.getVendor('5');
      }
    }

    // Shiprocket courier
    if (courierCode.includes('SHIPROCKET')) {
      return new ShiprocketVendor();
    }

    // SmartShip courier
    if (courierCode.includes('SMARTSHIP')) {
      return new SmartShipVendor();
    }

    // Default to Shiprocket if no match
    return new ShiprocketVendor();
  }
}
