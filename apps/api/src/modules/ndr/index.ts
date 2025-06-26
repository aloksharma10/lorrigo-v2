import { FastifyInstance } from 'fastify';
import ndrRoutes from './routes';

/**
 * NDR Module
 * Registers NDR routes with /ndr prefix
 */
export default async function ndrModule(fastify: FastifyInstance) {
  await fastify.register(ndrRoutes, { prefix: '/ndr' });
}

// Export services for other modules to use
export { NDRService } from './services/ndr.service';
export { NDRController } from './controllers/ndr.controller'; 