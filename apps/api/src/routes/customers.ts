import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { captureException } from '../lib/sentry';

// Define request body schemas
const createCustomerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(10),
  notes: z.string().optional(),
  addresses: z
    .array(
      z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
        country: z.string().default('India'),
        isDefault: z.boolean().default(false),
      })
    )
    .optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

export default async function customers(fastify: FastifyInstance) {
  // Get all customers
  fastify.get('/', {
    schema: {
      tags: ['Customers'],
      summary: 'Get all customers',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          search: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            customers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
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
        const { page = 1, limit = 10, search = '' } = request.query as {
          page?: number;
          limit?: number;
          search?: string;
        };
        
        const skip = (page - 1) * limit;
        
        // Build the where clause based on search parameter
        const where = search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {};
        
        // Get customers with pagination
        const [customers, total] = await Promise.all([
          fastify.prisma.customer.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          }),
          fastify.prisma.customer.count({ where }),
        ]);
        
        const totalPages = Math.ceil(total / limit);
        
        return {
          customers,
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
  
  // Get a single customer by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Customers'],
      summary: 'Get a customer by ID',
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
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  street: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  postalCode: { type: 'string' },
                  country: { type: 'string' },
                  isDefault: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        
        // Get customer by ID with addresses
        const customer = await fastify.prisma.customer.findUnique({
          where: { id },
          include: {
            addresses: true,
          },
        });
        
        if (!customer) {
          return reply.code(404).send({
            message: 'Customer not found',
          });
        }
        
        return customer;
      } catch (error) {
        fastify.log.error(error);
        captureException(error as Error);
        
        return reply.code(500).send({
          message: 'Internal server error',
        });
      }
    },
  });
  
  // Create a new customer
  fastify.post('/', {
    schema: {
      tags: ['Customers'],
      summary: 'Create a new customer',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'phone'],
        properties: {
          name: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', minLength: 10 },
          notes: { type: 'string' },
          addresses: {
            type: 'array',
            items: {
              type: 'object',
              required: ['street', 'city', 'state', 'postalCode'],
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                postalCode: { type: 'string' },
                country: { type: 'string', default: 'India' },
                isDefault: { type: 'boolean', default: false },
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
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        // Validate request body
        const { name, email, phone, notes, addresses } = createCustomerSchema.parse(request.body);
        
        // Create customer in database
        const customer = await fastify.prisma.customer.create({
          data: {
            name,
            email,
            phone,
            notes,
            ...(addresses && addresses.length > 0
              ? {
                  addresses: {
                    create: addresses,
                  },
                }
              : {}),
          },
        });
        
        return reply.code(201).send({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
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
  
  // Update a customer
  fastify.put('/:id', {
    schema: {
      tags: ['Customers'],
      summary: 'Update a customer',
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
          name: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', minLength: 10 },
          notes: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        
        // Validate request body
        const validatedData = updateCustomerSchema.parse(request.body);
        
        // Find customer to make sure it exists
        const existingCustomer = await fastify.prisma.customer.findUnique({
          where: { id },
        });
        
        if (!existingCustomer) {
          return reply.code(404).send({
            message: 'Customer not found',
          });
        }
        
        // Update customer in database
        const customer = await fastify.prisma.customer.update({
          where: { id },
          data: validatedData,
        });
        
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          updatedAt: customer.updatedAt,
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
  
  // Delete a customer
  fastify.delete('/:id', {
    schema: {
      tags: ['Customers'],
      summary: 'Delete a customer',
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
            message: { type: 'string' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        
        // Check if customer exists
        const customer = await fastify.prisma.customer.findUnique({
          where: { id },
        });
        
        if (!customer) {
          return reply.code(404).send({
            message: 'Customer not found',
          });
        }
        
        // Delete all customer addresses first
        await fastify.prisma.address.deleteMany({
          where: { customerId: id },
        });
        
        // Delete customer
        await fastify.prisma.customer.delete({
          where: { id },
        });
        
        return {
          message: 'Customer deleted successfully',
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
  
  // Add an address to a customer
  fastify.post('/:id/addresses', {
    schema: {
      tags: ['Customers'],
      summary: 'Add an address to a customer',
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
        required: ['street', 'city', 'state', 'postalCode'],
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string', default: 'India' },
          isDefault: { type: 'boolean', default: false },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            street: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            isDefault: { type: 'boolean' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const addressData = request.body as {
          street: string;
          city: string;
          state: string;
          postalCode: string;
          country?: string;
          isDefault?: boolean;
        };
        
        // Check if customer exists
        const customer = await fastify.prisma.customer.findUnique({
          where: { id },
        });
        
        if (!customer) {
          return reply.code(404).send({
            message: 'Customer not found',
          });
        }
        
        // If this address is set as default, update all other addresses
        if (addressData.isDefault) {
          await fastify.prisma.address.updateMany({
            where: { customerId: id },
            data: { isDefault: false },
          });
        }
        
        // Create the address
        const address = await fastify.prisma.address.create({
          data: {
            ...addressData,
            customerId: id,
          },
        });
        
        return reply.code(201).send(address);
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