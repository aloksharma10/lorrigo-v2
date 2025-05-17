import { Worker } from 'bullmq';
import { prisma } from '@lorrigo/db';
import { redis } from '../lib/redis';
import { QueueNames } from '../lib/queue';
import { APP_CONFIG } from '../config/app';
import { captureException } from '../lib/sentry';
import { addJob } from '../lib/queue';

// Create a worker to process shipment tracking updates
const shipmentTrackingWorker = new Worker(
  QueueNames.SHIPMENT_TRACKING,
  async (job) => {
    try {
      console.log(`Processing job ${job.id} of type ${job.name}`);
      
      const { shipmentId, status, location, description } = job.data;
      
      // Get current shipment
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          trackingEvents: true,
          order: {
            include: {
              customer: true,
            },
          },
          user: true,
        },
      });
      
      if (!shipment) {
        throw new Error(`Shipment not found: ${shipmentId}`);
      }
      
      // Add tracking event
      await prisma.trackingEvent.create({
        data: {
          status,
          location,
          description,
          shipmentId,
          code: 'ST-2505-00001',
          shipment: {
            connect: { id: shipmentId },
          },
        },
      });
      
      // Update shipment status
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { status },
      });
      
      // If status is DELIVERED, update order status
      if (status === 'DELIVERED' && shipment.order) {
        await prisma.order.update({
          where: { id: shipment.orderId },
          data: { status: 'DELIVERED' },
        });
      }
      
      // Create notification for status change
      await addJob(
        QueueNames.NOTIFICATION,
        'shipment-status-update',
        {
          recipientId: shipment.user.id,
          recipientEmail: shipment.user.email,
          recipientPhone: shipment.user.phone,
          awb: shipment.awb,
          status,
          orderNumber: shipment.order?.orderNumber,
          customerName: shipment.order?.customer.name,
        }
      );
      
      console.log(`Shipment ${shipment.awb} updated to ${status}`);
      
      return {
        success: true,
        message: `Shipment ${shipment.awb} updated to ${status}`,
      };
    } catch (error) {
      console.error('Error processing shipment tracking update:', error);
      captureException(error as Error);
      throw error;
    }
  },
  {
    connection: redis,
    prefix: APP_CONFIG.REDIS.PREFIX,
    concurrency: APP_CONFIG.QUEUE.CONCURRENCY,
    limiter: {
      max: 50, // maximum number of jobs processed in the timeWindow
      duration: 1000, // time window in milliseconds
    },
  }
);

// Handle worker events
shipmentTrackingWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

shipmentTrackingWorker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed with error: ${error.message}`);
  captureException(error);
});

export default shipmentTrackingWorker; 