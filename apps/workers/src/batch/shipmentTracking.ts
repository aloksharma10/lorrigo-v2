import { prisma, ShipmentStatus, Shipment } from '@lorrigo/db';
// import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Update shipment tracking information
 * This function would connect to courier APIs to get the latest tracking information
 */
export async function updateShipmentTracking() {
  try {
    logger.info('Starting shipment tracking update job');
    
    // Get all shipments that are in active states (not DELIVERED, RETURNED, or EXCEPTION)
    const activeShipments = await prisma.shipment.findMany({
      where: {
        status: {
          notIn: [
            ShipmentStatus.DELIVERED,
            ShipmentStatus.RETURNED,
            ShipmentStatus.EXCEPTION
          ]
        }
      },
      include: {
        courier: true,
        order: true,
      }
    });
    
    logger.info(`Found ${activeShipments.length} active shipments to update`);
    
    // Process each shipment
    for (const shipment of activeShipments) {
      try {
        // In a real implementation, this would call the courier's API
        // For demonstration, we'll simulate a status update
        await processShipmentUpdate(shipment);
      } catch (shipmentError: any) {
        logger.error(`Error updating shipment ${shipment.id}: ${shipmentError.message}`);
      }
    }
    
    logger.info('Completed shipment tracking update job');
  } catch (error: any) {
    logger.error(`Error in shipment tracking update job: ${error.message}`);
    throw error;
  }
}

/**
 * Process a single shipment update
 * In a real implementation, this would connect to the courier's API
 */
async function processShipmentUpdate(shipment : Shipment) {
  // This is a simulation of getting tracking data from a courier API
  // In production, you would implement actual API calls to the courier's tracking API
  
  // Simulate random status update for demonstration
  const currentStatus = shipment.status;
  
  // This is just a simulation - in production you'd use real courier API data
  let newStatus = simulateStatusProgress(currentStatus);
  
  // If the status has changed, update the shipment and create a tracking event
  if (newStatus !== currentStatus) {
    logger.info(`Updating shipment ${shipment.id} status from ${currentStatus} to ${newStatus}`);
    
    // Update the shipment
    await prisma.shipment.update({
      where: {
        id: shipment.id
      },
      data: {
        status: newStatus
      }
    });
    
    // Create a tracking event
    await prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        status: newStatus,
        location: 'System update',
        description: `Shipment status automatically updated to ${newStatus}`,
      }
    });
    
    // Update order status if necessary
    if (newStatus === ShipmentStatus.DELIVERED) {
      await prisma.order.update({
        where: {
          id: shipment.orderId
        },
        data: {
          status: 'DELIVERED'
        }
      });
    } else if (newStatus === ShipmentStatus.IN_TRANSIT || newStatus === ShipmentStatus.OUT_FOR_DELIVERY) {
      await prisma.order.update({
        where: {
          id: shipment.orderId
        },
        data: {
          status: 'SHIPPED'
        }
      });
    }
  }
}

/**
 * Simulate status progress for demonstration purposes
 * In a real application, this would be replaced with actual courier API data
 */
function simulateStatusProgress(currentStatus: ShipmentStatus): ShipmentStatus {
  // Define the typical flow of shipment statuses
  const statusFlow = [
    ShipmentStatus.CREATED,
    ShipmentStatus.PICKUP_SCHEDULED,
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERED
  ];
  // Find the current position in the flow
  const currentIndex = statusFlow.findIndex(status => status === currentStatus);
  
  // 80% chance of moving to the next status if not at the end
  if (currentIndex < statusFlow.length - 1 && Math.random() < 0.8) {
    return statusFlow[currentIndex + 1];
  }
  
  // Otherwise, stay in the same status
  return currentStatus;
} 