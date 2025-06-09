import { FastifyInstance } from 'fastify';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { PickupService } from './services/pickup-service';
import { PickupController } from './controller/pickup-controller';

export default async function hubRoutes(fastify: FastifyInstance) {
  const pickupService = new PickupService(fastify);
  const pickupController = new PickupController(pickupService);

  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: async (request, reply) => {
      return pickupController.createHub(request, reply);
    },
  });

  /**
   * @route   GET /api/pickup-address/hub
   * @desc    Get all hubs for authenticated seller
   * @access  Private (Seller only)
   */
  fastify.get('/', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: async (request, reply) => {
      return pickupController.getHubs(request, reply);
    },
  });

  /**
   * @route   GET /api/pickup-address/hub/:id
   * @desc    Get hub by ID
   * @access  Private (Seller only)
   */
  fastify.get('/:id', {
    preHandler: [authorizeRoles([Role.SELLER])],
    handler: async (request, reply) => {
      return pickupController.getHubById(request, reply);
    },
  });
}
