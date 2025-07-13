import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Role, prisma } from '@lorrigo/db';

export class UsersController {
  constructor(private fastify: FastifyInstance) {}

  async getUsersWithPagination(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = 1, limit = 10, search, role } = request.query as {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
      };

      // Convert page and limit to numbers
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build the where clause
      const where: any = {};
      
      // Filter by role if provided
      if (role) {
        where.role = role;
      }
      
      // Add search filter if provided
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { company_name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      // Get users with pagination
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            plan: {
              select: {
                id: true,
                name: true,
              },
            },
            profile: true,
            _count: {
              select: {
                orders: true,
                shipments: true,
                invoice_transactions: true,
                weight_disputes: true,
                shipment_transactions: true,
                wallet_recharge_transactions: true,
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: { created_at: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      // Get wallet balances for all users
      const userIds = users.map((user) => user.id);
      const wallets = await prisma.userWallet.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, balance: true },
      });

      // Map wallets to users
      const walletMap = new Map(wallets.map((wallet) => [wallet.user_id, wallet.balance]));
      
      // Add wallet balance to each user
      const usersWithWallet = users.map((user) => ({
        ...user,
        wallet_balance: walletMap.get(user.id) || 0,
      }));

      return reply.send({
        success: true,
        data: usersWithWallet,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to fetch users with pagination' });
    }
  }

  async getUserById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
            },
          },
          profile: true,
          _count: {
            select: {
              orders: true,
              shipments: true,
              invoice_transactions: true,
              weight_disputes: true,
              shipment_transactions: true,
              wallet_recharge_transactions: true,
            },
          },
        },
      });

      if (!user) {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      // Get wallet balance
      const wallet = await prisma.userWallet.findUnique({
        where: { user_id: user.id },
        select: { balance: true },
      });

      return reply.send({
        success: true,
        user: {
          ...user,
          wallet_balance: wallet?.balance || 0,
        },
      });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to fetch user' });
    }
  }

  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const {
        name,
        email,
        company_name,
        address,
        city,
        state,
        pincode,
      } = request.body as {
        name?: string;
        email?: string;
        company_name?: string;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
      };

      // Update user
      // const updatedUser = await prisma.user.update({
      //   where: { id },
      //   data: {
      //     name,
      //     email,
      //     profile: {
      //       upsert: {
      //         create: {
      //           company_name,
      //           city,
      //           state,
      //           pincode,
      //         },
      //         update: {
      //           company_name,
                
      //           city,
      //           state,
      //           pincode,
      //         },
      //       },
      //     },
      //   },
      // });

      // return reply.send({ success: true, user: updatedUser });
      return reply.send({ success: true, user: {} });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to update user' });
    }
  }
} 