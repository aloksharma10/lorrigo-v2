import { FastifyInstance } from 'fastify';
import { Role } from '@lorrigo/db';

// Types
interface CourierData {
  name: string;
  code: string;
  courier_code: string;
  is_active: boolean;
  is_reversed_courier: boolean;
  cod_charge_hard?: number;
  cod_charge_percent?: number;
  weight_slab?: number;
  weight_unit?: string;
  increment_weight?: number;
  type: 'EXPRESS' | 'SURFACE' | 'AIR';
  pickup_time?: string;
  api_credentials?: {
    api_key?: string;
    api_url?: string;
    username?: string;
    password?: string;
    account_number?: string;
  };
  channel_config_id?: string;
}

interface CourierPricingData {
  courier_id: string;
  base_price: number;
  weight_slab: number;
  zone_pricing: number;
  cod_charge_hard: number;
  cod_charge_percent: number;
}

interface ErrorResponse {
  error: string;
  status: number;
}

// Admin roles that can manage couriers
const ADMIN_ROLES = ['ADMIN', 'SUBADMIN'] as const;

export class CourierService {
  constructor(private fastify: FastifyInstance) {}

  async createCourier(data: CourierData) {
    const [existingCourier, channelConfig] = await Promise.all([
      this.fastify.prisma.courier.findUnique({
        where: {
          name_channel_config_id_is_reversed_courier_courier_code: {
            name: data.name,
            channel_config_id: data.channel_config_id || '',
            is_reversed_courier: data.is_reversed_courier,
            courier_code: data.courier_code,
          },
        },
        select: { id: true },
      }),
      data.channel_config_id
        ? this.fastify.prisma.channelConfig.findUnique({
            where: { id: data.channel_config_id },
            select: { id: true },
          })
        : null,
    ]);

    // Check for existing courier
    if (existingCourier) {
      return {
        error: 'Courier with this code already exists',
        status: 409,
      };
    }

    // Check for vendor config ID and its existence
    if (!data.channel_config_id || !channelConfig) {
      return {
        error: data.channel_config_id ? 'Vendor config not found' : 'Vendor config ID is required',
        status: data.channel_config_id ? 404 : 400,
      };
    }

    // Create the courier
    return await this.fastify.prisma.courier.create({
      data: {
        ...data,
        channel_config_id: data.channel_config_id,
      },
    });
  }

  async getAllCouriers(
    userId: string,
    userRole: Role,
    queryParams: {
      page?: number;
      limit?: number;
      search?: string;
      is_active?: string[];
      courier_type?: ('EXPRESS' | 'SURFACE' | 'AIR')[];
      weight_slab?: number[];
      is_reversed_courier?: string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const { page = 1, limit = 15, search, is_active, courier_type, weight_slab, is_reversed_courier, sortBy = 'name', sortOrder = 'asc' } = queryParams;

    const skip = (page - 1) * limit;

    // Build base where clause
    let where: any = {};

    // Add global search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { courier_code: { contains: search, mode: 'insensitive' } },
        { channel_config: { nickname: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Add status filter
    if (is_active && is_active.length > 0) {
      where.is_active = is_active;
    }

    // Add courier type filter
    if (courier_type && courier_type.length > 0) {
      where.type = { in: courier_type };
    }

    // Add weight slab filter
    if (weight_slab && weight_slab.length > 0) {
      where.weight_slab = { in: weight_slab };
    }

    // Add forward/reverse courier filter
    if (is_reversed_courier && is_reversed_courier.length > 0) {
      where.is_reversed_courier = is_reversed_courier;
    }

    // If not an admin, only show couriers available to the specific seller
    if (!ADMIN_ROLES.includes(userRole as any)) {
      // Get all courier pricings for this user
      const courierPricings = await this.fastify.prisma.planCourierPricing.findMany({
        where: {
          plan: {
            users: {
              some: {
                id: userId,
              },
            },
          },
        },
        select: {
          courier_id: true,
        },
      });

      const courierIds = courierPricings.map((pricing) => pricing.courier_id);

      where = {
        ...where,
        id: { in: courierIds },
        is_active: true,
      };
    } else if (!is_active || is_active.length === 0) {
      // For admins, default to showing all active couriers unless explicitly filtering
      where.is_active = true;
    }

    // Build order by clause
    let orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'type') {
      orderBy.type = sortOrder;
    } else if (sortBy === 'weight_slab') {
      orderBy.weight_slab = sortOrder;
    } else if (sortBy === 'is_active') {
      orderBy.is_active = sortOrder;
    } else if (sortBy === 'is_reversed_courier') {
      orderBy.is_reversed_courier = sortOrder;
    } else if (sortBy === 'created_at') {
      orderBy.created_at = sortOrder;
    } else {
      orderBy.name = 'asc'; // default sorting
    }

    // Get total count for pagination
    const total = await this.fastify.prisma.courier.count({ where });

    // Get couriers with pagination
    const couriers = await this.fastify.prisma.courier.findMany({
      where,
      orderBy,
      include: {
        channel_config: {
          select: {
            nickname: true,
          },
        },
      },
      skip,
      take: limit,
    });

    const formattedCouriers = couriers.map((courier) => ({
      id: courier.id,
      name: courier.name,
      type: courier.type,
      is_active: courier.is_active,
      is_reversed_courier: courier.is_reversed_courier,
      weight_slab: courier.weight_slab,
      increment_weight: courier.increment_weight,
      weight_unit: courier.weight_unit,
      channel_config: courier.channel_config,
    }));

    return {
      couriers: formattedCouriers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async getCourierById(id: string, userId: string, userRole: Role): Promise<any | ErrorResponse> {
    const courier = await this.fastify.prisma.courier.findUnique({
      where: { id },
    });

    if (!courier) {
      return {
        error: 'Courier not found',
        status: 404,
      };
    }

    // If not an admin, check if this courier is available to the user
    if (!ADMIN_ROLES.includes(userRole as any)) {
      const pricing = await this.fastify.prisma.planCourierPricing.findFirst({
        where: {
          plan: {
            users: {
              some: {
                id: userId,
              },
            },
          },
          courier_id: id,
        },
      });

      if (!pricing) {
        return {
          error: 'You do not have access to this courier',
          status: 403,
        };
      }
    }

    return courier;
  }

  async updateCourier(id: string, data: Partial<CourierData>): Promise<any | ErrorResponse> {
    // Check if courier exists
    const existingCourier = await this.fastify.prisma.courier.findUnique({
      where: { id },
    });

    if (!existingCourier) {
      return {
        error: 'Courier not found',
        status: 404,
      };
    }

    // Update the courier
    return await this.fastify.prisma.courier.update({
      where: { id },
      data,
    });
  }

  async setCourierPricing(data: CourierPricingData, userId: string, userRole: Role): Promise<any | ErrorResponse> {
    // Check if courier exists
    const courier = await this.fastify.prisma.courier.findUnique({
      where: { id: data.courier_id },
    });

    if (!courier) {
      return {
        error: 'Courier not found',
        status: 404,
      };
    }

    // Check if pricing already exists for this user and courier
    const existingPricing = await this.fastify.prisma.planCourierPricing.findFirst({
      where: {
        plan: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        courier_id: data.courier_id,
      },
    });

    if (existingPricing) {
      // Update existing pricing
      // return await this.fastify.prisma.planCourierPricing.update({
      //   where: { id: existingPricing.id },
      //   data: {
      //     base_price: data.base_price,
      //     weight_slab: data.weight_slab,
      //     zone_pricing: data.zone_pricing,
      //   },
      // });
    }

    // Create new pricing
    // return await this.fastify.prisma.planCourierPricing.create({
    //   data: {
    //     code: `CP-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    //     user_id: userId,
    //     courier_id: data.courier_id,
    //     base_price: data.base_price,
    //     weight_slab: data.weight_slab,
    //     zone_pricing: data.zone_pricing,
    //   },
    // });
  }

  async getCourierPricing(courierId: string, userId: string): Promise<any | ErrorResponse> {
    // Check if courier exists
    const courier = await this.fastify.prisma.courier.findUnique({
      where: { id: courierId },
    });

    if (!courier) {
      return {
        error: 'Courier not found',
        status: 404,
      };
    }

    // Get pricing for this user and courier
    const pricing = await this.fastify.prisma.planCourierPricing.findFirst({
      where: {
        plan: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        courier_id: courierId,
      },
      include: {
        zone_pricing: true,
      },
    });

    if (!pricing) {
      return {
        error: 'Pricing not found for this courier',
        status: 404,
      };
    }

    return pricing;
  }
}
