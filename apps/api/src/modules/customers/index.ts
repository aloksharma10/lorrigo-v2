import { FastifyInstance } from 'fastify';
import { CustomerController } from './controller/customers-controller';
import { CustomerService } from './services/customer-services';

export default async function customerRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);
  // Initialize services and controllers
  const customerService = new CustomerService(fastify);
  const customerController = new CustomerController(customerService);

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
                  address: {
                    type: 'object',
                    properties: {
                      address: { type: 'string' },
                      address_2: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      pincode: { type: 'string' },
                    },
                    nullable: true,
                  },
                  created_at: { type: 'string', format: 'date-time' },
                  _count: {
                    type: 'object',
                    properties: {
                      orders: { type: 'integer' },
                    },
                  },
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
    handler: (request, reply) => customerController.getAllCustomers(request, reply),
  });

  // Search customers
  fastify.get('/search', {
    schema: {
      tags: ['Customers'],
      summary: 'Search customers',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', minLength: 2 },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  address: { type: 'string' },
                  address_2: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  pincode: { type: 'string' },
                  country: { type: 'string' },
                  is_default: { type: 'boolean' },
                },
                nullable: true,
              },
            },
          },
        },
      },
    },
    handler: (request, reply) => customerController.searchCustomers(request, reply),
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
    handler: (request, reply) => customerController.getCustomerById(request, reply),
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
              required: ['address', 'city', 'state', 'pincode'],
              properties: {
                address: { type: 'string' },
                address_2: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                pincode: { type: 'string' },
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
    handler: (request, reply) => customerController.createCustomer(request, reply),
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
    handler: (request, reply) => customerController.updateCustomer(request, reply),
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
    handler: (request, reply) => customerController.deleteCustomer(request, reply),
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
        required: ['address', 'city', 'state', 'pincode'],
        properties: {
          address: { type: 'string' },
          address_2: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          pincode: { type: 'string' },
          country: { type: 'string', default: 'India' },
          isDefault: { type: 'boolean', default: false },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            address: { type: 'string' },
            address_2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            pincode: { type: 'string' },
            country: { type: 'string' },
            isDefault: { type: 'boolean' },
          },
        },
      },
    },
    handler: (request, reply) => customerController.addAddress(request, reply),
  });
}
