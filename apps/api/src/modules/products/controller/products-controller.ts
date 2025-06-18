import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { captureException } from '@/lib/sentry';
import { ProductService } from '../services/product-services';

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(2),
  price: z.number().min(0),
  hsnCode: z.string().optional(),
  description: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial();

export class ProductController {
  constructor(private productService: ProductService) {}

  async getAllProducts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
      } = request.query as {
        page?: number;
        limit?: number;
        search?: string;
      };

      const result = await this.productService.getAllProducts(page, limit, search);
      return result;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async getProductById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const product = await this.productService.getProductById(id);

      if ('error' in product) {
        return reply.code(product.status).send({ message: product.error });
      }

      return product;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async createProduct(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createProductSchema.parse(request.body);
      // const product = await this.productService.createProduct(data);
      // return reply.code(201).send(product);
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

  async updateProduct(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = updateProductSchema.parse(request.body);

      const product = await this.productService.updateProduct(id, data);

      if ('error' in product) {
        return reply.code(product.status).send({ message: product.error });
      }

      return product;
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

  async deleteProduct(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await this.productService.deleteProduct(id);

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

  async searchProducts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { query = '' } = request.query as { query?: string };

      if (!query || query.length < 2) {
        return reply.code(400).send({
          message: 'Search query must be at least 2 characters long',
        });
      }

      const products = await this.productService.searchProducts(query);
      return products;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }
}
