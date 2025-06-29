import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { OrderController } from './controllers/orders-controller';
import { OrderService } from './services/order-service';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { initBulkOrderWorker } from './queues/bulk-order-worker';

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
            type: 'string',
            // enum: [
            //   'NEW',
            //   'CONFIRMED',
            //   'PROCESSING',
            //   'SHIPPED',
            //   'DELIVERED',
            //   'CANCELLED',
            //   'RETURNED',
            // ],
          },
          search: { type: 'string' },
          from_date: { type: 'string', format: 'date' },
          to_date: { type: 'string', format: 'date' },
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
    handler: (request: FastifyRequest<{ Params: { id: string } }>, reply) =>
      orderController.getOrderById(request, reply),
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
        required: [
          'pickupAddressId',
          'paymentMethod',
          'deliveryDetails',
          'sellerDetails',
          'packageDetails',
          'productDetails',
        ],
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

  // Bulk upload orders
  fastify.post('/bulk-upload', {
    preHandler: [authorizeRoles([Role.SELLER])],
    // schema: {
    //   tags: ['Orders'],
    //   summary: 'Bulk upload orders',
    //   security: [{ bearerAuth: [] }],
    //   body: {
    //     type: 'object',
    //     required: ['orders'],
    //     properties: {
    //       orders: {
    //         type: 'array',
    //         items: {
    //           type: 'object',
    //           required: [
    //             'orderId',
    //             'pickupAddressId',
    //             'deliveryDetails',
    //             'sellerDetails',
    //             'productDetails',
    //             'packageDetails',
    //             'paymentMethod',
    //           ],
    //           properties: {
    //             orderId: { type: 'string' },
    //             orderChannel: { type: 'string' },
    //             orderType: { type: 'string' },
    //             pickupAddressId: { type: 'string' },
    //             deliveryDetails: { type: 'object' },
    //             sellerDetails: { type: 'object' },
    //             productDetails: { type: 'object' },
    //             packageDetails: { type: 'object' },
    //             paymentMethod: { type: 'object' },
    //             amountToCollect: { type: 'number' },
    //             order_invoice_number: { type: 'string' },
    //             order_invoice_date: { type: 'string' },
    //             ewaybill: { type: 'string' },
    //           },
    //         },
    //         maxItems: 100000,
    //       },
    //     },
    //   },
    //   response: {
    //     202: {
    //       type: 'object',
    //       properties: {
    //         message: { type: 'string' },
    //         data: {
    //           type: 'object',
    //           properties: {
    //             operationId: { type: 'string' },
    //             status: { type: 'string' },
    //             totalOrders: { type: 'integer' },
    //           },
    //         },
    //       },
    //     },
    //     400: {
    //       type: 'object',
    //       properties: {
    //         message: { type: 'string' },
    //       },
    //     },
    //   },
    // },
    handler: (request, reply) => orderController.bulkUploadOrders(request, reply),
  });

  // Get bulk upload status
  fastify.get('/bulk-upload/:operationId/status', {
    preHandler: [authorizeRoles([Role.SELLER])],
    schema: {
      tags: ['Orders'],
      summary: 'Get bulk upload operation status',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['operationId'],
        properties: {
          operationId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            totalCount: { type: 'integer' },
            processedCount: { type: 'integer' },
            successCount: { type: 'integer' },
            failedCount: { type: 'integer' },
            progress: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            reportPath: { type: 'string' },
            errorMessage: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => orderController.getBulkUploadStatus(request, reply),
  });

  // Download bulk upload report
  fastify.get('/bulk-upload/:operationId/report', {
    preHandler: [authorizeRoles([Role.SELLER])],
    schema: {
      tags: ['Orders'],
      summary: 'Download bulk upload report',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['operationId'],
        properties: {
          operationId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'string',
          format: 'binary',
        },
        404: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => orderController.downloadBulkUploadReport(request, reply),
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
        required: [
          'pickupAddressId',
          'paymentMethod',
          'deliveryDetails',
          'sellerDetails',
          'packageDetails',
          'productDetails',
        ],
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
    handler: (request: FastifyRequest<{ Params: { id: string } }>, reply) =>
      orderController.updateOrder(request, reply),
  });

  // Update an order status
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Orders'],
      summary: 'Update order status',
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
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: [
              'NEW',
              'COURIER_ASSIGNED',
              'PICKUP_SCHEDULED',
              'OUT_FOR_PICKUP',
              'IN_TRANSIT',
              'OUT_FOR_DELIVERY',
              'DELIVERED',
              'NDR',
              'RETURNED',
              'EXCEPTION',
              'CANCELLED_SHIPMENT',
              'CANCELLED_ORDER',
            ],
          },
          notes: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            status: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { status: string; notes?: string };
      }>,
      reply
    ) => orderController.updateOrderStatus(request, reply),
  });
}
