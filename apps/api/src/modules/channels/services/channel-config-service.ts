import { flushKeysByPattern } from '@/lib/upstash/flush-key-by-pattern';
import { Prisma, prisma } from '@lorrigo/db';

interface ChannelConfigData {
  name: string;
  nickname: string;
  is_active?: boolean;
}

interface ErrorResponse {
  error: string;
  status: number;
}

export class ChannelConfigService {
  constructor() {}

  /**
   * Get all channel configurations with pagination and search
   */
  async getAllChannelConfigs(page: number = 1, limit: number = 10, search?: string, is_active?: boolean) {
    const skip = (page - 1) * limit;

    // Build the where clause based on search parameter and active status
    const searchCondition: Prisma.ChannelConfigWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
              { nickname: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            ],
          }
        : {}),
      ...(is_active !== undefined ? { is_active } : {}),
    };

    // Get channel configs with pagination
    const [channelConfigs, total] = await Promise.all([
      prisma.channelConfig.findMany({
        where: searchCondition,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          couriers: {
            select: {
              id: true,
              name: true,
              is_active: true,
            },
          },
          _count: {
            select: {
              couriers: true,
            },
          },
        },
      }),
      prisma.channelConfig.count({ where: searchCondition }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      channelConfigs,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a single channel configuration by ID
   */
  async getChannelConfigById(id: string): Promise<any | ErrorResponse> {
    const channelConfig = await prisma.channelConfig.findUnique({
      where: { id },
      include: {
        couriers: {
          select: {
            id: true,
            name: true,
            courier_code: true,
            is_active: true,
            type: true,
            created_at: true,
          },
        },
        _count: {
          select: {
            couriers: true,
          },
        },
      },
    });

    if (!channelConfig) {
      return {
        error: 'Channel configuration not found',
        status: 404,
      };
    }

    return channelConfig;
  }

  /**
   * Get a channel configuration by name or nickname
   */
  async getChannelConfigByIdentifier(identifier: string): Promise<any | ErrorResponse> {
    const channelConfig = await prisma.channelConfig.findFirst({
      where: {
        OR: [
          { name: { equals: identifier, mode: 'insensitive' as Prisma.QueryMode } },
          { nickname: { equals: identifier, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      },
      include: {
        couriers: {
          where: { is_active: true },
          select: {
            id: true,
            name: true,
            courier_code: true,
            type: true,
          },
        },
      },
    });

    if (!channelConfig) {
      return {
        error: 'Channel configuration not found',
        status: 404,
      };
    }

    return channelConfig;
  }

  /**
   * Create a new channel configuration
   */
  async createChannelConfig(data: ChannelConfigData): Promise<any | ErrorResponse> {
    try {
      // Check if name or nickname already exists
      const existingConfig = await prisma.channelConfig.findFirst({
        where: {
          OR: [
            { name: { equals: data.name, mode: 'insensitive' as Prisma.QueryMode } },
            { nickname: { equals: data.nickname, mode: 'insensitive' as Prisma.QueryMode } },
          ],
        },
      });

      if (existingConfig) {
        return {
          error:
            existingConfig.name.toLowerCase() === data.name.toLowerCase()
              ? 'Channel configuration with this name already exists'
              : 'Channel configuration with this nickname already exists',
          status: 409,
        };
      }

      const channelConfig = await prisma.channelConfig.create({
        data: {
          name: data.name.trim(),
          nickname: data.nickname.trim().toUpperCase(),
          is_active: data.is_active ?? true,
        },
        include: {
          _count: {
            select: {
              couriers: true,
            },
          },
        },
      });

      return {
        id: channelConfig.id,
        name: channelConfig.name,
        nickname: channelConfig.nickname,
        is_active: channelConfig.is_active,
        couriers_count: channelConfig._count.couriers,
        created_at: channelConfig.created_at,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('name')) {
            return {
              error: 'Channel configuration with this name already exists',
              status: 409,
            };
          }
          if (target?.includes('nickname')) {
            return {
              error: 'Channel configuration with this nickname already exists',
              status: 409,
            };
          }
        }
      }
      throw error;
    }
  }

  /**
   * Update a channel configuration
   */
  async updateChannelConfig(id: string, data: Partial<ChannelConfigData>): Promise<any | ErrorResponse> {
    try {
      // Check if channel config exists
      const existingConfig = await prisma.channelConfig.findUnique({
        where: { id },
      });

      if (!existingConfig) {
        return {
          error: 'Channel configuration not found',
          status: 404,
        };
      }

      // Check for conflicts with name or nickname if they are being updated
      if (data.name || data.nickname) {
        const conflictConfig = await prisma.channelConfig.findFirst({
          where: {
            AND: [
              { id: { not: id } },
              {
                OR: [
                  ...(data.name ? [{ name: { equals: data.name, mode: 'insensitive' as Prisma.QueryMode } }] : []),
                  ...(data.nickname
                    ? [
                        {
                          nickname: {
                            equals: data.nickname,
                            mode: 'insensitive' as Prisma.QueryMode,
                          },
                        },
                      ]
                    : []),
                ],
              },
            ],
          },
        });

        if (conflictConfig) {
          return {
            error:
              conflictConfig.name.toLowerCase() === data.name?.toLowerCase()
                ? 'Channel configuration with this name already exists'
                : 'Channel configuration with this nickname already exists',
            status: 409,
          };
        }
      }

      // Update the channel config
      const channelConfig = await prisma.channelConfig.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.nickname && { nickname: data.nickname.trim().toUpperCase() }),
          ...(data.is_active !== undefined && { is_active: data.is_active }),
        },
        include: {
          _count: {
            select: {
              couriers: true,
            },
          },
        },
      });

      return {
        id: channelConfig.id,
        name: channelConfig.name,
        nickname: channelConfig.nickname,
        is_active: channelConfig.is_active,
        couriers_count: channelConfig._count.couriers,
        updated_at: channelConfig.updated_at,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('name')) {
            return {
              error: 'Channel configuration with this name already exists',
              status: 409,
            };
          }
          if (target?.includes('nickname')) {
            return {
              error: 'Channel configuration with this nickname already exists',
              status: 409,
            };
          }
        }
      }
      throw error;
    }
  }

  /**
   * Delete a channel configuration
   */
  async deleteChannelConfig(id: string): Promise<{ message: string } | ErrorResponse> {
    // Check if channel config exists
    const channelConfig = await prisma.channelConfig.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            couriers: true,
          },
        },
      },
    });

    if (!channelConfig) {
      return {
        error: 'Channel configuration not found',
        status: 404,
      };
    }

    // Check if channel config has associated couriers
    if (channelConfig._count.couriers > 0) {
      return {
        error: 'Cannot delete channel configuration. It has associated couriers. Please remove or reassign the couriers first.',
        status: 409,
      };
    }

    // Delete the channel config
    await prisma.channelConfig.delete({
      where: { id },
    });

    return {
      message: 'Channel configuration deleted successfully',
    };
  }

  /**
   * Toggle the active status of a channel configuration
   */
  async toggleChannelConfigStatus(id: string): Promise<any | ErrorResponse> {
    const channelConfig = await prisma.channelConfig.findUnique({
      where: { id },
      include: {
        couriers: {
          select: { id: true },
        },
      },
    });

    if (!channelConfig) {
      return {
        error: 'Channel configuration not found',
        status: 404,
      };
    }

    // 1. Toggle is_active
    const updatedConfig = await prisma.channelConfig.update({
      where: { id },
      data: {
        is_active: !channelConfig.is_active,
      },
      include: {
        _count: {
          select: {
            couriers: true,
          },
        },
      },
    });

    // 2. Get all affected courier IDs
    const courierIds = channelConfig.couriers.map((c) => c.id);

    if (courierIds.length > 0) {
      // 3. Find plans using these couriers
      const plans = await prisma.planCourierPricing.findMany({
        where: {
          courier_id: { in: courierIds },
        },
        select: {
          plan_id: true,
        },
      });

      const planIds = [...new Set(plans.map((p) => p.plan_id))];

      if (planIds.length > 0) {
        // 4. Find users assigned to these plans
        const users = await prisma.user.findMany({
          where: {
            plan_id: { in: planIds },
          },
          select: {
            id: true,
          },
        });

        // 5. Flush both serviceability and rates cache for affected users
        await Promise.all(users.map((user) => Promise.all([flushKeysByPattern(`serviceability-${user.id}-*`), flushKeysByPattern(`rates-${user.id}-*`)])));
      }
    }

    return {
      id: updatedConfig.id,
      name: updatedConfig.name,
      nickname: updatedConfig.nickname,
      is_active: updatedConfig.is_active,
      couriers_count: updatedConfig._count.couriers,
      updated_at: updatedConfig.updated_at,
    };
  }

  /**
   * Get active channel configurations (for dropdowns/selection)
   */
  async getActiveChannelConfigs() {
    const channelConfigs = await prisma.channelConfig.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nickname: true,
        _count: {
          select: {
            couriers: true,
          },
        },
      },
    });

    return channelConfigs;
  }
}
