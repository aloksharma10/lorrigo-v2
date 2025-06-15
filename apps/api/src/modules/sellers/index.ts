import { FastifyInstance } from 'fastify';
import { SellerController } from './controller/sellers-controller';
import { SellerService } from './services/seller-services';

export default async function sellerRoutes(fastify: FastifyInstance) {
  // Initialize services and controllers
  const sellerService = new SellerService(fastify);
  const sellerController = new SellerController(sellerService);

  // Get all sellers
  fastify.get('/', {
    schema: {
      tags: ['Sellers'],
      summary: 'Get all sellers',
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
            sellers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  gstNo: { type: 'string' },
                  contactNumber: { type: 'string' },
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
    handler: (request, reply) => sellerController.getAllSellers(request, reply),
  });

  // Get a single seller by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Sellers'],
      summary: 'Get a seller by ID',
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
            gstNo: { type: 'string' },
            address: { type: 'string' },
            contactNumber: { type: 'string' },
            pincode: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => sellerController.getSellerById(request, reply),
  });

  // Create a new seller
  fastify.post('/', {
    schema: {
      tags: ['Sellers'],
      summary: 'Create a new seller',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2 },
          gstNo: { type: 'string' },
          address: { type: 'string' },
          contactNumber: { type: 'string' },
          pincode: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          country: { type: 'string', default: 'India' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            gstNo: { type: 'string' },
            contactNumber: { type: 'string' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => sellerController.createSeller(request, reply),
  });

  // Update a seller
  // fastify.put('/:id', {
  //   schema: {
  //     tags: ['Sellers'],
  //     summary: 'Update a seller',
  //     security: [{ bearerAuth: [] }],
  //     params: {
  //       type: 'object',
  //       required: ['id'],
  //       properties: {
  //         id: { type: 'string' },
  //       },
  //     },
  //     body: {
  //       type: 'object',
  //       properties: {
  //         name: { type: 'string', minLength: 2 },
  //         gstNo: { type: 'string' },
  //         address: { type: 'string' },
  //         contactNumber: { type: 'string' },
  //         pincode: { type: 'string' },
  //         city: { type: 'string' },
  //         state: { type: 'string' },
  //         country: { type: 'string' },
  //       },
  //     },
  //     response: {
  //       200: {
  //         type: 'object',
  //         properties: {
  //           id: { type: 'string' },
  //           name: { type: 'string' },
  //           gstNo: { type: 'string' },
  //           contactNumber: { type: 'string' },
  //           updatedAt: { type: 'string', format: 'date-time' },
  //         },
  //       },
  //     },
  //   },
  //   preHandler: fastify.authenticate,
  //   handler: (request, reply) => sellerController.updateSeller(request, reply),
  // });

  // Delete a seller
  fastify.delete('/:id', {
    schema: {
      tags: ['Sellers'],
      summary: 'Delete a seller',
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
    handler: (request, reply) => sellerController.deleteSeller(request, reply),
  });

  // Search sellers
  fastify.get('/search', {
    schema: {
      tags: ['Sellers'],
      summary: 'Search sellers',
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
              gstNo: { type: 'string' },
              contactNumber: { type: 'string' },
              address: { type: 'string' },
              address_2: { type: 'string' },
              pincode: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              country: { type: 'string' },
            },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => sellerController.searchSellers(request, reply),
  });
} 