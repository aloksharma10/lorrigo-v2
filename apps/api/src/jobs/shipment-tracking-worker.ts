import { Worker } from 'bullmq';
import { prisma } from '@lorrigo/db';
import { redis } from '@/lib/redis';
import { QueueNames } from '@/lib/queue';
import { APP_CONFIG } from '@/config/app';
import { captureException } from '@/lib/sentry';
import { addJob } from '@/lib/queue';

// Create a worker to process shipment tracking updates
const shipmentTrackingWorker = new Worker(
  QueueNames.SHIPMENT_TRACKING,
  async (job) => {
    try {
      console.log(`Processing job ${job.id} of type ${job.name}`);

      const { shipment_id, status, location, description } = job.data;

      // Get current shipment
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipment_id },
        include: {
          tracking_events: true,
          order: {
            include: {
              customer: true,
            },
          },
          user: true,
        },
      });

      if (!shipment) {
        throw new Error(`Shipment not found: ${shipment_id}`);
      }

      // Add tracking event
      await prisma.trackingEvent.create({
        data: {
          status,
          location,
          description,
          shipment_id: shipment_id,
          shipment: {
            connect: { id: shipment_id },
          },
        },
      });

      // Update shipment status
      await prisma.shipment.update({
        where: { id: shipment_id },
        data: { status },
      });

      // If status is DELIVERED, update order status
      if (status === 'DELIVERED' && shipment.order) {
        await prisma.order.update({
          where: { id: shipment.order_id },
          data: { status: 'DELIVERED' },
        });
      }

      // Create notification for status change
      await addJob(QueueNames.NOTIFICATION, 'shipment-status-update', {
        recipient_id: shipment.user_id,
        recipient_email: shipment.user.email,
        recipient_phone: shipment.user.phone,
        awb: shipment.awb,
        status,
        order_number: shipment.order?.order_number,
        customer_name: shipment.order?.customer.name,
      });

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
