import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { OrderController } from './controllers/orders-controller';
import { OrderService } from './services/order-service';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { initBulkOrderWorker } from './queues/bulk-order-worker';
import path from 'path';
import fs from 'fs-extra';
import { randomUUID } from 'crypto';
import { addJob, QueueNames } from '@/lib/queue';
import { BulkOrderJobType } from './queues/bulk-order-worker';
import { prisma } from '@lorrigo/db';
import { Job } from 'bullmq';

/**
 * Orders module routes
 */
export default async function ordersRoutes(fastify: FastifyInstance) {
  const orderService = new OrderService(fastify);
  const orderController = new OrderController(orderService);

  // Initialize bulk order worker
  const { bulkOrderWorker } = initBulkOrderWorker(fastify, orderService);

  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // Get all orders
  fastify.get('/', {
    preHandler: [authorizeRoles([Role.SELLER])],
    schema: {
      tags: ['Orders'],
      summary: 'Get all orders',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          sort: { type: 'string', default: 'created_at' },
          sort_order: { type: 'string', default: 'desc' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          status: {
            type: ['string', 'array'],

            items: {
              type: ['string', 'number'],
            },
          },
          search: { type: 'string' },
          from_date: { type: 'string', format: 'date' },
          to_date: { type: 'string', format: 'date' },
          payment_method: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            orders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  orderNumber: { type: 'string' },
                  awb: { type: 'string' },
                  courier: { type: 'string' },
                  courierNickname: { type: 'string' },
                  channel: { type: 'string' },
                  bucket: { type: 'number' },
                  trackingEvents: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        code: { type: 'string' },
                        status: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                  productDetails: {
                    type: 'object',
                    properties: {
                      products: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            sku: { type: 'string' },
                            quantity: { type: 'number' },
                            price: { type: 'number' },
                            taxRate: { type: 'number' },
                            hsnCode: { type: 'string' },
                          },
                        },
                      },
                      taxableValue: { type: 'number' },
                    },
                  },
                  status: { type: 'string' },
                  totalAmount: { type: 'number' },
                  packageDetails: {
                    type: 'object',
                    properties: {
                      length: { type: 'number' },
                      breadth: { type: 'number' },
                      height: { type: 'number' },
                      deadWeight: { type: 'number' },
                      volumetricWeight: { type: 'number' },
                    },
                  },
                  customer: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' },
                      phone: { type: 'string' },
                      address: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      pincode: { type: 'string' },
                    },
                  },
                  sellerDetails: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      gstNo: { type: 'string' },
                      contactNumber: { type: 'string' },
                      address: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      pincode: { type: 'string' },
                    },
                  },
                  hub: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      lorrigoPickupId: { type: 'string' },
                      name: { type: 'string' },
                      address: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      pincode: { type: 'string' },
                    },
                  },
                  orderInvoiceNumber: { type: 'string' },
                  orderInvoiceDate: { type: 'string', format: 'date-time' },
                  ewaybill: { type: 'string' },
                  paymentType: { type: 'string' },
                  amountToCollect: { type: 'number' },
                  pickupDate: { type: 'string', format: 'date-time' },
                  edd: { type: 'string' },
                  pickupId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    handler: (request, reply) => orderController.getAllOrders(request, reply),
  });

  fastify.get('/reverse-orders', {
    preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])],
    schema: {
      tags: ['Orders'],
      summary: 'Get all reverse orders',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
        },
      },
    },
    handler: (request, reply) => orderController.getReverseOrders(request, reply),
  });
  // Get a single order by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Orders'],
      summary: 'Get an order by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            status: { type: 'string' },
            totalAmount: { type: 'number' },
            notes: { type: 'string' },
            customer: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
              },
            },
            shippingAddress: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                postalCode: { type: 'string' },
                country: { type: 'string' },
              },
            },
            shipments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  trackingNumber: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: (request: FastifyRequest<{ Params: { id: string } }>, reply) => orderController.getOrderById(request, reply),
  });

  // Create a new order
  fastify.post('/', {
    preHandler: [authorizeRoles([Role.SELLER])],
    schema: {
      tags: ['Orders'],
      summary: 'Create a new order',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['pickupAddressId', 'paymentMethod', 'deliveryDetails', 'sellerDetails', 'packageDetails', 'productDetails'],
        properties: {
          pickupAddressId: { type: 'string' },
          paymentMethod: { type: 'object' },
          deliveryDetails: { type: 'object' },
          sellerDetails: { type: 'object' },
          packageDetails: { type: 'object' },
          productDetails: { type: 'object' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string' },
            orderNumber: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: (request, reply) => orderController.createOrder(request, reply),
  });

  // Get order statistics
  fastify.get('/stats', {
    preHandler: [authorizeRoles([Role.SELLER])],
    schema: {
      tags: ['Orders'],
      summary: 'Get order statistics',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['day', 'week', 'month', 'year'],
            default: 'month',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            total_orders: { type: 'integer' },
            total_amount: { type: 'number' },
            status_counts: {
              type: 'object',
              properties: {
                CREATED: { type: 'integer' },
                CONFIRMED: { type: 'integer' },
                PROCESSING: { type: 'integer' },
                SHIPPED: { type: 'integer' },
                DELIVERED: { type: 'integer' },
                CANCELLED: { type: 'integer' },
                RETURNED: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    handler: (request, reply) => orderController.getOrderStats(request, reply),
  });

  // Update an order
  fastify.patch('/:id', {
    schema: {
      tags: ['Orders'],
      summary: 'Update an order',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['pickupAddressId', 'paymentMethod', 'deliveryDetails', 'sellerDetails', 'packageDetails', 'productDetails'],
        properties: {
          pickupAddressId: { type: 'string' },
          paymentMethod: { type: 'object' },
          deliveryDetails: { type: 'object' },
          sellerDetails: { type: 'object' },
          packageDetails: { type: 'object' },
          productDetails: { type: 'object' },
        },
      },
    },
    handler: (request: FastifyRequest<{ Params: { id: string } }>, reply) => orderController.updateOrder(request, reply),
  });
}
