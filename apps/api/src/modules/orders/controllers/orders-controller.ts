import { FastifyRequest, FastifyReply } from 'fastify';
import { captureException } from '../../../lib/sentry';
import { OrderService } from '../services/order-service';
import {
  CreateOrderSchema,
  UpdateOrderSchema,
  OrderQuerySchema,
  OrderStatsQuerySchema,
} from '../validations';
import { z } from 'zod';
import { addJob } from '../../../lib/queue';
import { QueueNames } from '../../../lib/queue';
import { checkAuth } from '../../../middleware/auth';

/**
 * Order Controller handles HTTP request/response logic
 */
export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Get all orders with pagination and filters
   */
  async getAllOrders(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const queryParams = OrderQuerySchema.parse(request.query);
      const userId = request.userPayload!.id;

      const result = await this.orderService.getAllOrders(userId, queryParams);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }

      request.log.error(error);
      captureException(error as Error);

      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrderById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const { id } = request.params;
      const user_id = request.userPayload!.id;

      const order = await this.orderService.getOrderById(id, user_id);

      if (!order) {
        return reply.code(404).send({
          message: 'Order not found',
        });
      }

      return order;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);

      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  /**
   * Create a new order
   */
  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const data = CreateOrderSchema.parse(request.body);
      const user_id = request.userPayload!.id;

      const order = await this.orderService.createOrder(data, user_id);

      // Add job to notification queue for order creation
      await addJob(QueueNames.NOTIFICATION, 'order-created', {
        orderId: order.id,
        orderNumber: order.order_number,
        userId: user_id,
        customerId: data.customer_id,
      });

      // Log API request
      await request.server.prisma.apiRequest.create({
        data: {
          code: 'BO-2505-00001',
          endpoint: '/orders',
          method: 'POST',
          ip_address: request.ip,
          user_id: user_id,
          response_status: 201,
        },
      });

      return reply.code(201).send({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        customerId: order.customer_id,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }

      request.log.error(error);
      captureException(error as Error);

      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  /**
   * Update an order status
   */
  async updateOrderStatus(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const { id } = request.params;
      const updateData = UpdateOrderSchema.parse(request.body);
      const user_id = request.userPayload!.id;

      const existingOrder = await this.orderService.getOrderById(id, user_id);

      if (!existingOrder) {
        return reply.code(404).send({
          message: 'Order not found',
        });
      }

      const order = await this.orderService.updateOrderStatus(id, updateData);

      // Add job to notification queue for order status update
      if (updateData.status && updateData.status !== existingOrder.status) {
        await addJob(QueueNames.NOTIFICATION, 'order-status-updated', {
          orderId: order.id,
          orderNumber: order.order_number,
          previousStatus: existingOrder.status,
          newStatus: updateData.status,
          userId: user_id,
          customerId: order.customer_id,
        });
      }

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        updatedAt: order.updated_at,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }

      request.log.error(error);
      captureException(error as Error);

      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const { id } = request.params;
      const { reason } = request.body as { reason?: string };
      const user_id = request.userPayload!.id;

      const result = await this.orderService.cancelOrder(id, user_id, reason);

      if (result.error) {
        return reply.code(400).send({
          message: result.error,
        });
      }

      // Add job to notification queue for order cancellation
      await addJob(QueueNames.NOTIFICATION, 'order-cancelled', {
        orderId: result.order?.id,
        orderNumber: result.order?.order_number,
        reason,
        userId: user_id,
        customerId: result.order?.customer_id,
      });

      return {
        id: result.order?.id,
        orderNumber: result.order?.order_number,
        status: result.order?.status,
        updatedAt: result.order?.updated_at,
      };
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);

      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Check if user is authenticated
      await checkAuth(request, reply);
      
      const { period = 'month' } = OrderStatsQuerySchema.parse(request.query);
      const user_id = request.userPayload!.id;

      const stats = await this.orderService.getOrderStats(user_id, period as string);

      return stats;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);

      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }
}
