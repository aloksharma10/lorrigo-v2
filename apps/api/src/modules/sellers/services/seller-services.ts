import { FastifyInstance } from 'fastify';
import { OrderSellerDetails, Prisma } from '@lorrigo/db';

interface SellerData {
  name: string;
  gstNo?: string;
  address?: string;
  contactNumber?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface ErrorResponse {
  error: string;
  status: number;
}

export class SellerService {
  constructor(private fastify: FastifyInstance) {}

  async getAllSellers(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;

    // Build the where clause based on search parameter
    const searchCondition: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            { phone: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          ],
        }
      : {};

    // Get sellers with pagination
    const [sellers, total] = await Promise.all([
      this.fastify.prisma.user.findMany({
        where: searchCondition,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          created_at: true,
        },
      }),
      this.fastify.prisma.user.count({ where: searchCondition }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      sellers,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getSellerById(id: string): Promise<any | ErrorResponse> {
    const seller = await this.fastify.prisma.orderSellerDetails.findUnique({
      where: { id },
    });

    if (!seller) {
      return {
        error: 'Seller not found',
        status: 404,
      };
    }

    return seller;
  }

  async createSeller(data: SellerData) {
    const seller = await this.fastify.prisma.orderSellerDetails.create({
      data: {
        seller_name: data.name,
        gst_no: data.gstNo,
        contact_number: data.contactNumber,
        address: {
          create: {
            address: data.address || '',
            pincode: data.pincode || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || 'India',
            type: 'SELLER',
          },
        },
      },
    });

    return {
      id: seller.id,
      name: seller.seller_name,
      gstNo: seller.gst_no,
      contactNumber: seller.contact_number,
    };
  }

  async updateSeller(id: string, data: Partial<OrderSellerDetails>): Promise<any | ErrorResponse> {
    // Find seller to make sure it exists
    const existingSeller = await this.fastify.prisma.orderSellerDetails.findUnique({
      where: { id },
    });

    if (!existingSeller) {
      return {
        error: 'Seller not found',
        status: 404,
      };
    }

    // Update seller in database
    const seller = await this.fastify.prisma.orderSellerDetails.update({
      where: { id },
      data,
    });

    return {
      id: seller.id,
      name: seller.seller_name,
      gstNo: seller.gst_no,
      contactNumber: seller.contact_number,
      updated_at: seller.updated_at,
    };
  }

  async deleteSeller(id: string): Promise<{ message: string } | ErrorResponse> {
    // Check if seller exists
    const seller = await this.fastify.prisma.orderSellerDetails.findUnique({
      where: { id },
    });

    if (!seller) {
      return {
        error: 'Seller not found',
        status: 404,
      };
    }

    // Delete seller
    await this.fastify.prisma.orderSellerDetails.delete({
      where: { id },
    });

    return {
      message: 'Seller deleted successfully',
    };
  }

  async searchSellers(query: string) {
    // Search for sellers by name, gstNo, or contactNumber
    const sellers = await this.fastify.prisma.orderSellerDetails.findMany({
      where: {
        OR: [
          { seller_name: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { gst_no: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { contact_number: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      },
      take: 10,
      include: {
        address: {
          select: {
            address: true,
            address_2: true,
            pincode: true,
            city: true,
            state: true,
            country: true,
          },
        },
      },
      orderBy: [{ seller_name: 'asc' }, { created_at: 'desc' }],
      distinct: ['seller_name'],
    });

    return sellers.map((seller) => {
      return {
        id: seller.id,
        name: seller.seller_name,
        gstNo: seller.gst_no,
        contactNumber: seller.contact_number,
        address: seller.address?.address,
        address_2: seller.address?.address_2,
        pincode: seller.address?.pincode,
        city: seller.address?.city,
        state: seller.address?.state,
        country: seller.address?.country,
      };
    });
  }
}
