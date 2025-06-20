import { FastifyInstance } from 'fastify';
import { authorizeRoles, checkAuth } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { BulkOperationsController } from './controllers/bulk-operations-controller';
import { BulkOperationsService } from './services/bulk-operations-service';

export async function bulkOperationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  // Initialize services
  const bulkOperationsService = new BulkOperationsService(fastify);

  // Create controller instance
  const bulkOperationsController = new BulkOperationsController(bulkOperationsService);

  // Add auth preHandler to all routes
  const preHandler = [checkAuth, authorizeRoles([Role.ADMIN, Role.SELLER])];

  // Get all bulk operations with pagination and filters
  fastify.get('/', { preHandler }, bulkOperationsController.getAllBulkOperations.bind(bulkOperationsController));

  // Get bulk operation by ID
  fastify.get('/:id', { preHandler }, bulkOperationsController.getBulkOperation.bind(bulkOperationsController));

  // Download bulk operation report or file
  fastify.get('/:id/download', { preHandler }, bulkOperationsController.downloadFile.bind(bulkOperationsController));

  // POST routes
  // Create bulk shipments
  fastify.post('/shipments', { preHandler }, bulkOperationsController.createBulkShipments.bind(bulkOperationsController));
  
  // Schedule bulk pickups
  fastify.post('/pickups', { preHandler }, bulkOperationsController.scheduleBulkPickups.bind(bulkOperationsController));
  
  // Cancel bulk shipments
  fastify.post('/cancel', { preHandler }, bulkOperationsController.cancelBulkShipments.bind(bulkOperationsController));
  
  // Generate bulk labels
  fastify.post('/labels', { preHandler }, bulkOperationsController.generateBulkLabels.bind(bulkOperationsController));
  
  // Edit bulk pickup addresses
  fastify.post('/pickup-addresses', { preHandler }, bulkOperationsController.editBulkPickupAddresses.bind(bulkOperationsController));
} 