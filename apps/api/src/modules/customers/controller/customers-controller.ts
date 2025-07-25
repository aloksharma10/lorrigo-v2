import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { captureException } from '@/lib/sentry';
import { CustomerService } from '../services/customer-services';

// Validation schemas
const createAddressSchema = z.object({
  address: z.string().min(10),
  address_2: z.string().optional(),
  city: z.string().min(10),
  state: z.string().min(10),
  pincode: z.string().min(10),
});

const createCustomerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(10),
  addresses: z.array(createAddressSchema).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

export class CustomerController {
  constructor(private customerService: CustomerService) {}

  async getAllCustomers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const isAdmin = request.userPayload?.role === 'ADMIN';
      const {
        page = 1,
        limit = 10,
        search = '',
      } = request.query as {
        page?: number;
        limit?: number;
        search?: string;
      };

      const result = await this.customerService.getAllCustomers(page, limit, search, isAdmin, userId);
      return result;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async getCustomerById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const customer = await this.customerService.getCustomerById(id);

      if ('error' in customer) {
        return reply.code(customer.status).send({ message: customer.error });
      }

      return customer;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async createCustomer(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createCustomerSchema.parse(request.body);
      const customer = await this.customerService.createCustomer(data);
      return reply.code(201).send(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async updateCustomer(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = updateCustomerSchema.parse(request.body);

      const customer = await this.customerService.updateCustomer(id, data);

      if ('error' in customer) {
        return reply.code(customer.status).send({ message: customer.error });
      }

      return customer;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async deleteCustomer(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await this.customerService.deleteCustomer(id);

      if ('error' in result) {
        return reply.code(result.status).send({ message: result.error });
      }

      return result;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async addAddress(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const addressData = request.body as {
        address: string;
        address_2?: string;
        city: string;
        state: string;
        pincode: string;
        country?: string;
        isDefault?: boolean;
      };

      const result = await this.customerService.addAddress(id, addressData);

      if ('error' in result) {
        return reply.code(result.status).send({ message: result.error });
      }

      return reply.code(201).send(result);
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async searchCustomers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { query = '' } = request.query as { query?: string };

      if (!query || query.length < 2) {
        return reply.code(400).send({
          message: 'Search query must be at least 2 characters long',
        });
      }

      const customers = await this.customerService.searchCustomers(query);
      return customers;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }
}
