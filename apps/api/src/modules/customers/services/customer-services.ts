import { FastifyInstance } from 'fastify';
import { Prisma } from '@lorrigo/db';

interface CustomerData {
  name: string;
  email?: string;
  phone: string;
  address?: {
    address: string;
    address_2?: string;
    city: string;
    state: string;
    pincode: string;
  };
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

  async getAllCustomers(page: number, limit: number, search: string, isAdmin: boolean, userId: string) {
    const skip = (page - 1) * limit;
  
    // Build search filter
    const searchCondition: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
  
    // Add user-based filtering if not admin
    const whereCondition = isAdmin
      ? searchCondition
      : {
          ...searchCondition,
          orders: { some: { user_id: userId } },
        };
  
    // Parallel query for customers and count
    const [customers, total] = await Promise.all([
      this.fastify.prisma.customer.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: {
            select: {
              address: true,
              address_2: true,
              city: true,
            },
          },
          created_at: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
      }),
      this.fastify.prisma.customer.count({ where: whereCondition }),
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
        address: true,
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
        name: data.name,
        email: data.email,
        phone: data.phone,
        ...(data.address
          ? {
              address: {
                create: {
                  ...data.address,
                  type: 'CUSTOMER',
                },
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
        address: data.address
          ? {
              update: data.address,
            }
          : undefined,
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
        type: 'CUSTOMER',
      },
    });

    return address;
  }

  async searchCustomers(query: string) {
    // Search for customers by name, email, or phone
    const customers = await this.fastify.prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { email: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
          { phone: { contains: query, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      },
      take: 10,
      include: {
        address: true,
      },
      orderBy: [{ name: 'asc' }, { created_at: 'desc' }],
      distinct: ['id'],
    });

    return customers.map((customer) => {
      const defaultAddress = customer.address?.address;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: {
          address: defaultAddress,
          address_2: customer.address?.address_2,
          city: customer.address?.city,
          state: customer.address?.state,
          pincode: customer.address?.pincode,
          country: customer.address?.country,
          is_default: customer.address?.is_default,
        },
      };
    });
  }
}
