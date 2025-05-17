import { FastifyInstance } from 'fastify';
import { Prisma } from '@lorrigo/db';

interface CustomerData {
  name: string;
  email?: string;
  phone: string;
  addresses?: Array<{
    address: string;
    address_2?: string;
    city: string;
    state: string;
    pincode: string;
  }>;
}

interface AddressData {
  address: string;
  address_2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault?: boolean;
}

interface ErrorResponse {
  error: string;
  status: number;
}

export class CustomerService {
  constructor(private fastify: FastifyInstance) {}

  async getAllCustomers(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    
    // Build the where clause based on search parameter
    const searchCondition: Prisma.CustomerWhereInput = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { phone: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
      ],
    } : {};
    
    // Get customers with pagination
    const [customers, total] = await Promise.all([
      this.fastify.prisma.customer.findMany({
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
      this.fastify.prisma.customer.count({ where: searchCondition }),
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    return {
      customers,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getCustomerById(id: string): Promise<any | ErrorResponse> {
    const customer = await this.fastify.prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
      },
    });
    
    if (!customer) {
      return {
        error: 'Customer not found',
        status: 404,
      };
    }
    
    return customer;
  }

  async createCustomer(data: CustomerData) {
    const customer = await this.fastify.prisma.customer.create({
      data: {
        code: `CUST-${Math.random().toString(36).substring(2, 15)}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        ...(data.addresses && data.addresses.length > 0
          ? {
              addresses: {
                create: data.addresses,
              },
            }
          : {}),
      },
    });
    
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    };
  }

  async updateCustomer(id: string, data: Partial<CustomerData>): Promise<any | ErrorResponse> {
    // Find customer to make sure it exists
    const existingCustomer = await this.fastify.prisma.customer.findUnique({
      where: { id },
    });
    
    if (!existingCustomer) {
      return {
        error: 'Customer not found',
        status: 404,
      };
    }
    
    // Update customer in database
    const customer = await this.fastify.prisma.customer.update({
      where: { id },
      data: {
        ...data,
        addresses: data.addresses ? {
          deleteMany: {},
          create: data.addresses
        } : undefined
      },
    });
    
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      updated_at: customer.updated_at,
    };
  }

  async deleteCustomer(id: string): Promise<{ message: string } | ErrorResponse> {
    // Check if customer exists
    const customer = await this.fastify.prisma.customer.findUnique({
      where: { id },
    });
    
    if (!customer) {
      return {
        error: 'Customer not found',
        status: 404,
      };
    }
    
    // Delete all customer addresses first
    await this.fastify.prisma.address.deleteMany({
      where: { customer_id: id },
    });
    
    // Delete customer
    await this.fastify.prisma.customer.delete({
      where: { id },
    });
    
    return {
      message: 'Customer deleted successfully',
    };
  }

  async addAddress(customerId: string, data: AddressData): Promise<any | ErrorResponse> {
    // Check if customer exists
    const customer = await this.fastify.prisma.customer.findUnique({
      where: { id: customerId },
    });
    
    if (!customer) {
      return {
        error: 'Customer not found',
        status: 404,
      };
    }
    
    // If this address is set as default, update all other addresses
    if (data.isDefault) {
      await this.fastify.prisma.address.updateMany({
        where: { customer_id: customerId },
        data: { is_default: false },
      });
    }
    
    // Create the address
    const address = await this.fastify.prisma.address.create({
      data: {
        address: data.address,
        address_2: data.address_2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: data.country || 'India',
        is_default: data.isDefault || false,
        customer_id: customerId,
      },
    });
    
    return address;
  }
} 