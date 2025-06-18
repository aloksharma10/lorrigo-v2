import { FastifyInstance } from 'fastify';
import { Prisma } from '@lorrigo/db';

interface ProductData {
  name: string;
  price: number;
  hsnCode?: string;
  description?: string;
}

interface ErrorResponse {
  error: string;
  status: number;
}

export class ProductService {
  constructor(private fastify: FastifyInstance) {}

  async getAllProducts(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;

    // Search condition
    const searchFilter = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {};

    // Group by 'name' and pick first product with that name
    const groupedProducts = await this.fastify.prisma.orderItem.groupBy({
      by: ['name'],
      where: searchFilter,
      _min: {
        id: true,
        selling_price: true,
        hsn: true,
        created_at: true,
      },
      orderBy: {
        _min: {
          created_at: 'desc',
        },
      },
      skip,
      take: limit,
    });

    // Count total unique names for pagination
    const allUnique = await this.fastify.prisma.orderItem.groupBy({
      by: ['name'],
      where: searchFilter,
    });

    const total = allUnique.length;
    const totalPages = Math.ceil(total / limit);

    // Map to return simplified product structure
    const products = groupedProducts.map((item) => ({
      name: item.name,
      id: item._min.id,
      selling_price: item._min.selling_price,
      hsn: item._min.hsn,
      created_at: item._min.created_at,
    }));

    return {
      products,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getProductById(id: string): Promise<any | ErrorResponse> {
    const product = await this.fastify.prisma.orderItem.findUnique({
      where: { id },
    });

    if (!product) {
      return {
        error: 'Product not found',
        status: 404,
      };
    }

    return product;
  }

  //   async createProduct(data: ProductData) {
  //     const product = await this.fastify.prisma.orderItem.create({
  //       data: {
  //         name: data.name,
  //         selling_price: data.price,
  //         hsn: data.hsnCode,
  //         code: data.code,
  //         order_id: data.order_id,
  //       },
  //     });

  //     return {
  //       id: product.id,
  //       name: product.name,
  //       selling_price: product.selling_price,
  //       hsn: product.hsn,
  //     };
  //   }

  async updateProduct(id: string, data: Partial<ProductData>): Promise<any | ErrorResponse> {
    // Find product to make sure it exists
    const existingProduct = await this.fastify.prisma.orderItem.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return {
        error: 'Product not found',
        status: 404,
      };
    }

    // Update product in database
    const product = await this.fastify.prisma.orderItem.update({
      where: { id },
      data,
    });

    return {
      id: product.id,
      name: product.name,
      price: product.selling_price,
      hsn: product.hsn,
      updated_at: product.updated_at,
    };
  }

  async deleteProduct(id: string): Promise<{ message: string } | ErrorResponse> {
    // Check if product exists
    const product = await this.fastify.prisma.orderItem.findUnique({
      where: { id },
    });

    if (!product) {
      return {
        error: 'Product not found',
        status: 404,
      };
    }

    // Delete product
    await this.fastify.prisma.orderItem.delete({
      where: { id },
    });

    return {
      message: 'Product deleted successfully',
    };
  }

  async searchProducts(query: string) {
    // Search for products by name, id, or hsnCode
    const products = await this.fastify.prisma.orderItem.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { hsn: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { id: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        selling_price: true,
        hsn: true,
      },
      orderBy: [{ name: 'asc' }, { created_at: 'desc' }],
      distinct: ['name'],
    });

    // Map to standardized format for frontend
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.selling_price,
      hsnCode: product.hsn,
    }));
  }
}
