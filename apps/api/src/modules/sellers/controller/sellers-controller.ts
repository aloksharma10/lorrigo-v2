import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { captureException } from '@/lib/sentry';
import { SellerService } from '../services/seller-services';

// Validation schemas
const createSellerSchema = z.object({
  name: z.string().min(2),
  gstNo: z.string().optional(),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  pincode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
});

const updateSellerSchema = createSellerSchema.partial();

export class SellerController {
  constructor(private sellerService: SellerService) {}

  async getAllSellers(request: FastifyRequest, reply: FastifyReply) {
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

      const result = await this.sellerService.getAllSellers(page, limit, search);
      return result;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async getSellerById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const seller = await this.sellerService.getSellerById(id);

      if ('error' in seller) {
        return reply.code(seller.status).send({ message: seller.error });
      }

      return seller;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }

  async createSeller(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createSellerSchema.parse(request.body);
      const seller = await this.sellerService.createSeller(data);
      return reply.code(201).send(seller);
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

  // async updateSeller(request: FastifyRequest, reply: FastifyReply) {
  //   try {
  //     const { id } = request.params as { id: string };
  //     const data = updateSellerSchema.parse(request.body);

  //     const seller = await this.sellerService.updateSeller(id, data);

  //     if ('error' in seller) {
  //       return reply.code(seller.status).send({ message: seller.error });
  //     }

  //     return seller;
  //   } catch (error) {
  //     if (error instanceof z.ZodError) {
  //       return reply.code(400).send({
  //         message: 'Validation error',
  //         errors: error.errors,
  //       });
  //     }
  //     request.log.error(error);
  //     captureException(error as Error);
  //     return reply.code(500).send({ message: 'Internal server error' });
  //   }
  // }

  async deleteSeller(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await this.sellerService.deleteSeller(id);

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

  async searchSellers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { query = '' } = request.query as { query?: string };

      if (!query || query.length < 2) {
        return reply.code(400).send({
          message: 'Search query must be at least 2 characters long',
        });
      }

      const sellers = await this.sellerService.searchSellers(query);
      return sellers;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }
}
