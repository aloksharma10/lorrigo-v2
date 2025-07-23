import { FastifyRequest, FastifyReply } from 'fastify';
import { captureException } from '@/lib/sentry';
import {
  orderFormSchema,
  updateOrderFormSchema,
  OrderQuerySchema,
  OrderStatsQuerySchema,
} from '@lorrigo/utils';
import { z } from 'zod';
import { checkAuth } from '@/middleware/auth';
import { OrderService } from '../services/order-service';

/**
 * Order Controller handles HTTP request/response logic
 */
export class OrderController {
  constructor(private orderService: OrderService) {}

  /**
   * Get all orders with pagination and filters
   */
  async getAllOrders(request: FastifyRequest, reply: FastifyReply) {
    try {
      // const queryParams = OrderQuerySchema.parse(request.query);
      const userId = request.userPayload!.id;

      const result = await this.orderService.getAllOrders(userId, request.query);
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

  async getReverseOrders(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const result = await this.orderService.getAllOrders(userId, request.query, true);
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
      const data = orderFormSchema.parse(request.body);
      const user_id = request.userPayload!.id;
      const userName = request.userPayload!.name;
      const order = await this.orderService.createOrder(data, user_id, userName);

      // Add job to notification queue for order creation
      // await addJob(QueueNames.NOTIFICATION, 'order-created', {
      //   orderId: order.id,
      //   orderNumber: order.order_number,
      //   userId: user_id,
      //   customerId: data.customer_id,
      // });

      // Log API request
      await request.server.prisma.apiRequest.create({
        data: {
          endpoint: '/orders',
          method: 'POST',
          ip_address: request.ip,
          user_id: user_id,
          response_status: 201,
        },
      });

      return reply.code(201).send({
        id: order.id,
        code: order.code,
        orderNumber: order.order_number,
        createdAt: order.created_at.toISOString(),
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
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  async updateOrder(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const data = orderFormSchema.parse(request.body);
      const user_id = request.userPayload!.id;
      const userName = request.userPayload!.name;
      // @ts-ignore
      const order_number = request?.body?.orderId || id;

      const order = await this.orderService.updateOrder(order_number, data, user_id, userName);

      return order;
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
        message: error instanceof Error ? error.message : 'Internal server error',
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
