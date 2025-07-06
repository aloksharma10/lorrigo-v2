import { prisma, ShipmentStatus } from '@lorrigo/db';
import b2cOrderData from './data/b2c.order.json';

function generateCustomId(prefix: string) {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${year}${month}-${random}`;
}

// Main function to insert MongoDB order data into Prisma
async function insertOrderData(mongoData: any) {
  try {
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Insert Customer
      const customer = await tx.customer.upsert({
        where: { phone: mongoData.customerDetails.phone },
        update: {
          name: mongoData.customerDetails.name,
          email: null, // No email in MongoDB data
          updated_at: new Date(),
        },
        create: {
          name: mongoData.customerDetails.name,
          phone: mongoData.customerDetails.phone,
          email: null,
          created_at: new Date(mongoData.createdAt.$date),
          updated_at: new Date(mongoData.updatedAt.$date),
        },
      });

      // 2. Insert Customer Address
      const customerAddress = await tx.address.upsert({
        where: { customer_id: customer.id },
        update: {
          address: mongoData.customerDetails.address,
          city: mongoData.customerDetails.city,
          state: mongoData.customerDetails.state,
          pincode: mongoData.customerDetails.pincode,
          country: 'India',
          phone: mongoData.customerDetails.phone,
          name: mongoData.customerDetails.name,
          updated_at: new Date(),
        },
        create: {
          customer_id: customer.id,
          address: mongoData.customerDetails.address,
          city: mongoData.customerDetails.city,
          state: mongoData.customerDetails.state,
          pincode: mongoData.customerDetails.pincode,
          country: 'India',
          phone: mongoData.customerDetails.phone,
          name: mongoData.customerDetails.name,
          is_default: true,
          created_at: new Date(mongoData.createdAt.$date),
          updated_at: new Date(mongoData.updatedAt.$date),
        },
      });

      // 3. Insert Seller Details
      const sellerDetails = await tx.orderSellerDetails.create({
        data: {
          seller_name: mongoData.sellerDetails.sellerName,
          gst_no: mongoData.sellerDetails.sellerGSTIN || null,
          contact_number: mongoData.sellerDetails.sellerPhone || null,
          created_at: new Date(mongoData.createdAt.$date),
          updated_at: new Date(mongoData.updatedAt.$date),
        },
      });

      // 4. Insert Package
      const packageData = await tx.package.create({
        data: {
          weight: mongoData.orderWeight,
          dead_weight: mongoData.orderWeight,
          volumetric_weight:
            (mongoData.orderBoxLength * mongoData.orderBoxWidth * mongoData.orderBoxHeight) / 5000, // Example volumetric calculation
          length: mongoData.orderBoxLength,
          breadth: mongoData.orderBoxWidth,
          height: mongoData.orderBoxHeight,
          created_at: new Date(mongoData.createdAt.$date),
          updated_at: new Date(mongoData.updatedAt.$date),
        },
      });

      // 5. Insert Order Channel Config
      const orderChannelConfig = await tx.orderChannelConfig.create({
        data: {
          channel: 'CUSTOM',
          channel_order_id: mongoData.client_order_reference_id,
          created_at: new Date(mongoData.createdAt.$date),
          updated_at: new Date(mongoData.updatedAt.$date),
        },
      });

      // 6. Insert Order
      const order = await tx.order.create({
        data: {
          code: generateCustomId('OR'),
          order_number: mongoData.order_invoice_number,
          type: 'B2C',
          status: ShipmentStatus.NDR,
          payment_mode: mongoData.payment_mode === 1 ? 'COD' : 'PREPAID',
          is_reverse_order: mongoData.isReverseOrder,
          order_channel_config_id: orderChannelConfig.id,
          order_reference_id: mongoData.order_reference_id,
          ewaybill: mongoData.ewaybill || null,
          total_amount: mongoData.amount2Collect,
          amount_to_collect: mongoData.amount2Collect,
          applicable_weight: mongoData.orderWeight,
          order_invoice_date: new Date(mongoData.order_invoice_date),
          order_invoice_number: mongoData.order_invoice_number,
          user_id: 'cmcn8zp3s0000h05kwr5fxcj7',
          customer_id: customer.id,
          seller_details_id: sellerDetails.id,
          package_id: packageData.id,
          created_at: new Date(mongoData.createdAt.$date),
          updated_at: new Date(mongoData.updatedAt.$date),
        },
      });

      // 7. Insert Order Item
      const orderItem = await tx.orderItem.create({
        data: {
          code: generateCustomId('OI'),
          order_id: order.id,
          name: mongoData.orderItems[0].name,
          sku: mongoData.orderItems[0].sku,
          units: parseInt(mongoData.orderItems[0].units),
          selling_price: parseFloat(mongoData.orderItems[0].selling_price),
          discount: 0,
          tax: 0,
          hsn: null,
          created_at: new Date(mongoData.createdAt.$date),
          updated_at: new Date(mongoData.updatedAt.$date),
        },
      });

      // 8. Insert Shipment
      const shipment = await tx.shipment.create({
        data: {
          code: generateCustomId('SH'),
          awb: mongoData.awb,
          status: ShipmentStatus.NDR,
          bucket: mongoData.bucket,
          shipping_charge: mongoData.shipmentCharges,
          cod_charge: mongoData.codCharge,
          rto_charge: mongoData.rtoCharges,
          routing_code: mongoData.routingCode,
          sr_shipment_id: mongoData.shiprocket_shipment_id,
          order_id: order.id,
          user_id: 'cmcn8zp3s0000h05kwr5fxcj7',
          courier_id: 'cmcn9b22000afh09oxuiiku13',
          created_at: new Date(mongoData.createdAt.$date),
          updated_at: new Date(mongoData.updatedAt.$date),
        },
      });

      // 9. Insert Tracking Events
      const trackingEvents = await Promise.all(
        mongoData.orderStages.map(async (stage: any) => {
          return tx.trackingEvent.create({
            data: {
              status: ShipmentStatus.NDR,
              location: stage.location || null,
              description: stage.activity || stage.action,
              shipment_id: shipment.id,
              status_code: stage.stage.toString(),
              is_rto: mongoData.isReverseOrder,
              bucket: stage.stage,
              timestamp: new Date(stage.stageDateTime.$date),
              created_at: new Date(stage.stageDateTime.$date),
              updated_at: new Date(stage.stageDateTime.$date),
            },
          });
        })
      );

      return {
        order,
        customer,
        shipment,
        trackingEvents,
        orderItem,
        sellerDetails,
        customerAddress,
        packageData,
        orderChannelConfig,
      };
    });

    console.log('Data inserted successfully:', result);
    return result;
  } catch (error) {
    console.error('Error inserting data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

insertOrderData(b2cOrderData[0])
  .then(() => console.log('Migration completed'))
  .catch((err) => console.error('Migration failed:', err));
