import { FastifyInstance } from 'fastify';
import { ProductController } from './controller/products-controller';
import { ProductService } from './services/product-services';

export default async function productRoutes(fastify: FastifyInstance) {
  // Initialize services and controllers
  const productService = new ProductService(fastify);
  const productController = new ProductController(productService);

  // Get all products
  fastify.get('/', {
    schema: {
      tags: ['Products'],
      summary: 'Get all products',
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
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  hsnCode: { type: 'string' },
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
    handler: (request, reply) => productController.getAllProducts(request, reply),
  });

  // Search products
  fastify.get('/search', {
    schema: {
      tags: ['Products'],
      summary: 'Search products',
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
              price: { type: 'number' },
              hsnCode: { type: 'string' },
            },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => productController.searchProducts(request, reply),
  });

  // Get a single product by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Products'],
      summary: 'Get a product by ID',
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
            price: { type: 'number' },
            hsnCode: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => productController.getProductById(request, reply),
  });

  // Create a new product
  fastify.post('/', {
    schema: {
      tags: ['Products'],
      summary: 'Create a new product',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string', minLength: 2 },
          price: { type: 'number', minimum: 0 },
          hsnCode: { type: 'string' },
          description: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            hsnCode: { type: 'string' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => productController.createProduct(request, reply),
  });

  // Update a product
  fastify.put('/:id', {
    schema: {
      tags: ['Products'],
      summary: 'Update a product',
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
          price: { type: 'number', minimum: 0 },
          hsnCode: { type: 'string' },
          description: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            hsnCode: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => productController.updateProduct(request, reply),
  });

  // Delete a product
  fastify.delete('/:id', {
    schema: {
      tags: ['Products'],
      summary: 'Delete a product',
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
    handler: (request, reply) => productController.deleteProduct(request, reply),
  });
} 