import { FastifyInstance } from 'fastify';
import ShopifyController from './shopify.controller';

/**
 * Register Shopify routes
 * @param fastify Fastify instance
 */
export default async function shopifyRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  // Register all Shopify routes
  ShopifyController.registerRoutes(fastify);
}
