import cron from 'node-cron';
import { updateShipmentTracking } from './batch/shipmentTracking';
import { logger } from './utils/logger';

// Initialize worker
logger.info('Starting background workers...');

// Run shipment tracking updates every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  logger.info('Running scheduled shipment tracking update');
  try {
    await updateShipmentTracking();
    logger.info('Shipment tracking update completed successfully');
  } catch (error) {
    logger.error('Error in shipment tracking update:', error);
  }
});

// Add additional scheduled jobs here

logger.info('All background workers started successfully');
