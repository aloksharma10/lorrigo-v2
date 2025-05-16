import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { captureException } from '../lib/sentry';
import { addJob } from '../lib/queue';
import { QueueNames } from '../lib/queue';

// Define request body schemas
const createOrderSchema = z.object({
  customerId: z.string(),
  shippingAddressId: z.string(),
  returnAddressId: z.string().optional(),
  totalAmount: z.number().positive(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
    })
  ),
});

const updateOrderSchema = z.object({
  status: z.enum(['CREATED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']).optional(),
  notes: z.string().optional(),
});

export default async function orders(fastify: FastifyInstance) {
  // Get all orders
  fastify.get('/', {
    schema: {
      tags: ['Orders'],
      summary: 'Get all orders',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          status: { 
            type: 'string',
            enum: ['CREATED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']
          },
          search: { type: 'string' },
          fromDate: { type: 'string', format: 'date-time' },
          toDate: { type: 'string', format: 'date-time' },
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
                  status: { type: 'string' },
                  totalAmount: { type: 'number' },
                  customerId: { type: 'string' },
                  customerName: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
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
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { 
          page = 1, 
          limit = 10, 
          status, 
          search = '',
          fromDate,
          toDate
        } = request.query as {
          page?: number;
          limit?: number;
          status?: string;
          search?: string;
          fromDate?: string;
          toDate?: string;
        };
        
        const skip = (page - 1) * limit;
        
        // Build the where clause based on filters
        let where: any = {
          userId: request.user.id
        };
        
        // Add status filter if provided
        if (status) {
          where.status = status;
        }
        
        // Add date range filter if provided
        if (fromDate || toDate) {
          where.createdAt = {};
          
          if (fromDate) {
            where.createdAt.gte = new Date(fromDate);
          }
          
          if (toDate) {
            where.createdAt.lte = new Date(toDate);
          }
        }
        
        // Add search filter
        if (search) {
          where.OR = [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
            { customer: { email: { contains: search, mode: 'insensitive' } } },
          ];
        }
        
        // Get orders with pagination
        const [orders, total] = await Promise.all([
          fastify.prisma.order.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              customer: {
                select: {
                  name: true,
                },
              },
            },
          }),
          fastify.prisma.order.count({ where }),
        ]);
        
        // Format orders for response
        const formattedOrders = orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          customerId: order.customerId,
          customerName: order.customer.name,
          createdAt: order.createdAt,
        }));
        
        const totalPages = Math.ceil(total / limit);
        
        return {
          orders: formattedOrders,
          total,
          page,
          limit,
          totalPages,
        };
      } catch (error) {
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
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
            returnAddress: {
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
                  courier: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
            payments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  amount: { type: 'number' },
                  method: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        
        // Get order by ID with related data
        const order = await fastify.prisma.order.findUnique({
          where: { 
            id,
            userId: request.user.id 
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              }
            },
            shippingAddress: true,
            returnAddress: true,
            shipments: {
              include: {
                courier: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            },
            payments: true,
          },
        });
        
        if (!order) {
          return reply.code(404).send({
            message: 'Order not found',
          });
        }
        
        return order;
      } catch (error) {
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
  });
  
  // Create a new order
  fastify.post('/', {
    schema: {
      tags: ['Orders'],
      summary: 'Create a new order',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['customerId', 'shippingAddressId', 'totalAmount', 'items'],
        properties: {
          customerId: { type: 'string' },
          shippingAddressId: { type: 'string' },
          returnAddressId: { type: 'string' },
          totalAmount: { type: 'number' },
          notes: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['description', 'quantity', 'unitPrice'],
              properties: {
                description: { type: 'string' },
                quantity: { type: 'integer' },
                unitPrice: { type: 'number' },
              },
            },
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            status: { type: 'string' },
            customerId: { type: 'string' },
            totalAmount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        // Validate request body
        const { customerId, shippingAddressId, returnAddressId, totalAmount, notes, items } = createOrderSchema.parse(request.body);
        
        // Generate unique order number (format: ORD-YYYYMMDD-XXXX)
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
        const orderNumber = `ORD-${dateStr}-${randomStr}`;
        
        // Create order transaction to handle both order and invoice creation
        const order = await fastify.prisma.$transaction(async (tx) => {
          // Create the order
          const order = await tx.order.create({
            data: {
              orderNumber,
              status: 'CREATED',
              totalAmount,
              notes,
              customer: {
                connect: { id: customerId },
              },
              user: {
                connect: { id: request.user.id },
              },
              shippingAddress: {
                connect: { id: shippingAddressId },
              },
              ...(returnAddressId ? {
                returnAddress: {
                  connect: { id: returnAddressId },
                }
              } : {}),
            },
          });
          
          // Create invoice for the order
          const invoiceNumber = `INV-${dateStr}-${randomStr}`;
          
          await tx.invoice.create({
            data: {
              invoiceNumber,
              amount: totalAmount,
              isPaid: false,
              dueDate: new Date(today.setDate(today.getDate() + 7)), // Due in 7 days
              user: {
                connect: { id: request.user.id },
              },
              order: {
                connect: { id: order.id },
              },
              items: {
                create: items.map(item => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  amount: item.quantity * item.unitPrice,
                })),
              },
            },
          });
          
          return order;
        });
        
        // Add job to notification queue for order creation
        await addJob(
          QueueNames.NOTIFICATION,
          'order-created',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            userId: request.user.id,
            customerId,
          }
        );
        
        // Log API request
        await fastify.prisma.apiRequest.create({
          data: {
            endpoint: '/orders',
            method: 'POST',
            ipAddress: request.ip,
            userId: request.user.id,
            userAgent: request.headers['user-agent'],
            responseStatus: 201,
          },
        });
        
        return reply.code(201).send({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          customerId: order.customerId,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            message: 'Validation error',
            errors: error.errors,
          });
        }
        
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
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
            enum: ['CREATED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']
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
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { status, notes } = updateOrderSchema.parse(request.body);
        
        // Check if order exists and belongs to the user
        const existingOrder = await fastify.prisma.order.findUnique({
          where: {
            id,
            userId: request.user.id,
          },
        });
        
        if (!existingOrder) {
          return reply.code(404).send({
            message: 'Order not found',
          });
        }
        
        // Update order status
        const order = await fastify.prisma.order.update({
          where: { id },
          data: {
            status: status as any,
            ...(notes && { notes }),
          },
        });
        
        // Add job to notification queue for order status update
        if (status && status !== existingOrder.status) {
          await addJob(
            QueueNames.NOTIFICATION,
            'order-status-updated',
            {
              orderId: order.id,
              orderNumber: order.orderNumber,
              previousStatus: existingOrder.status,
              newStatus: status,
              userId: request.user.id,
              customerId: order.customerId,
            }
          );
        }
        
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          updatedAt: order.updatedAt,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            message: 'Validation error',
            errors: error.errors,
          });
        }
        
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
  });
  
  // Cancel an order
  fastify.post('/:id/cancel', {
    schema: {
      tags: ['Orders'],
      summary: 'Cancel an order',
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
        properties: {
          reason: { type: 'string' },
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
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { reason } = request.body as { reason?: string };
        
        // Check if order exists and belongs to the user
        const existingOrder = await fastify.prisma.order.findUnique({
          where: {
            id,
            userId: request.user.id,
          },
          include: {
            shipments: true,
          },
        });
        
        if (!existingOrder) {
          return reply.code(404).send({
            message: 'Order not found',
          });
        }
        
        // Check if order can be cancelled
        if (!['CREATED', 'CONFIRMED'].includes(existingOrder.status)) {
          return reply.code(400).send({
            message: 'Cannot cancel order at this stage',
          });
        }
        
        // Check if there are any shipments in progress
        const hasShipmentsInProgress = existingOrder.shipments.some(
          shipment => !['CREATED', 'CANCELLED'].includes(shipment.status)
        );
        
        if (hasShipmentsInProgress) {
          return reply.code(400).send({
            message: 'Cannot cancel order with shipments in progress',
          });
        }
        
        // Update order status to CANCELLED and add reason to notes
        const updatedNotes = reason 
          ? `${existingOrder.notes || ''}\nCancellation reason: ${reason}`.trim()
          : existingOrder.notes;
          
        const order = await fastify.prisma.order.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            notes: updatedNotes,
          },
        });
        
        // Cancel any existing shipments in CREATED status
        await fastify.prisma.shipment.updateMany({
          where: {
            orderId: id,
            status: 'CREATED',
          },
          data: {
            // status: 'CANCELLED',
          },
        });
        
        // Add job to notification queue for order cancellation
        await addJob(
          QueueNames.NOTIFICATION,
          'order-cancelled',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason,
            userId: request.user.id,
            customerId: order.customerId,
          }
        );
        
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          updatedAt: order.updatedAt,
        };
      } catch (error) {
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
  });
  
  // Get order statistics
  fastify.get('/stats', {
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
            default: 'month'
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalOrders: { type: 'integer' },
            totalAmount: { type: 'number' },
            statusCounts: {
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
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { period = 'month' } = request.query as { period?: string };
        
        // Calculate date range based on period
        const now = new Date();
        let startDate = new Date();
        
        switch (period) {
          case 'day':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        // Get total orders and amount
        const totalOrdersPromise = fastify.prisma.order.count({
          where: {
            userId: request.user.id,
            createdAt: {
              gte: startDate,
            },
          },
        });
        
        const totalAmountPromise = fastify.prisma.order.aggregate({
          where: {
            userId: request.user.id,
            createdAt: {
              gte: startDate,
            },
          },
          _sum: {
            totalAmount: true,
          },
        });
        
        // Get count of orders by status
        const statusCountsPromise = fastify.prisma.order.groupBy({
          by: ['status'],
          where: {
            userId: request.user.id,
            createdAt: {
              gte: startDate,
            },
          },
          _count: true,
        });
        
        // Wait for all promises to resolve
        const [totalOrders, totalAmountResult, statusCountsResult] = await Promise.all([
          totalOrdersPromise,
          totalAmountPromise,
          statusCountsPromise,
        ]);
        
        // Format status counts
        const statusCounts: Record<string, number> = {};
        statusCountsResult.forEach(item => {
          statusCounts[item.status] = item._count;
        });
        
        return {
          totalOrders,
          totalAmount: totalAmountResult._sum.totalAmount || 0,
          statusCounts: {
            CREATED: statusCounts.CREATED || 0,
            CONFIRMED: statusCounts.CONFIRMED || 0,
            PROCESSING: statusCounts.PROCESSING || 0,
            SHIPPED: statusCounts.SHIPPED || 0,
            DELIVERED: statusCounts.DELIVERED || 0,
            CANCELLED: statusCounts.CANCELLED || 0,
            RETURNED: statusCounts.RETURNED || 0,
          },
        };
      } catch (error) {
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
  });
} 