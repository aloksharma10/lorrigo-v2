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

      // Update user basic info
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name,
          email,
        },
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

      // Get wallet balance
      const wallet = await prisma.userWallet.findUnique({
        where: { user_id: id },
        select: { balance: true },
      });

      return reply.send({ 
        success: true, 
        user: {
          ...updatedUser,
          wallet_balance: wallet?.balance || 0,
        }
      });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to update user' });
    }
  }

  async updateUserProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const profileData = request.body as any;

      // Update or create user profile
      const updatedProfile = await prisma.userProfile.upsert({
        where: { user_id: id },
        update: {
          // Company Details
          company: profileData.company,
          company_name: profileData.company_name,
          logo_url: profileData.logo_url,
          
          // Notification Settings
          notification_settings: profileData.notification_settings,
          
          // KYC Details
          business_type: profileData.business_type,
          pan: profileData.pan,
          adhaar: profileData.adhaar,
          gst_no: profileData.gst_no,
          kyc_submitted: profileData.kyc_submitted,
          kyc_verified: profileData.kyc_verified,
          
          // Bank Details
          acc_holder_name: profileData.acc_holder_name,
          acc_number: profileData.acc_number,
          ifsc_number: profileData.ifsc_number,
          acc_type: profileData.acc_type,
          
          // Seller Config
          is_d2c: profileData.is_d2c,
          is_b2b: profileData.is_b2b,
          is_prepaid: profileData.is_prepaid,
          is_cod: profileData.is_cod,
          is_fw: profileData.is_fw,
          is_rto: profileData.is_rto,
          is_cod_reversal: profileData.is_cod_reversal,
          
          // Billing and Remittance
          payment_method: profileData.payment_method,
          remittance_cycle: profileData.remittance_cycle,
          remittance_min_amount: profileData.remittance_min_amount,
          remittance_days_after_delivery: profileData.remittance_days_after_delivery,
          early_remittance_charge: profileData.early_remittance_charge,
          remittance_days_of_week: profileData.remittance_days_of_week,
          billing_cycle_type: profileData.billing_cycle_type,
          
          // Label/Manifest Format
          label_format: profileData.label_format,
          manifest_format: profileData.manifest_format,
        },
        create: {
          user_id: id,
          // Company Details
          company: profileData.company,
          company_name: profileData.company_name,
          logo_url: profileData.logo_url,
          
          // Notification Settings
          notification_settings: profileData.notification_settings || { email: true, whatsapp: true, system: true },
          
          // KYC Details
          business_type: profileData.business_type,
          pan: profileData.pan,
          adhaar: profileData.adhaar,
          gst_no: profileData.gst_no,
          kyc_submitted: profileData.kyc_submitted || false,
          kyc_verified: profileData.kyc_verified || false,
          
          // Bank Details
          acc_holder_name: profileData.acc_holder_name,
          acc_number: profileData.acc_number,
          ifsc_number: profileData.ifsc_number,
          acc_type: profileData.acc_type,
          
          // Seller Config
          is_d2c: profileData.is_d2c !== undefined ? profileData.is_d2c : true,
          is_b2b: profileData.is_b2b !== undefined ? profileData.is_b2b : true,
          is_prepaid: profileData.is_prepaid !== undefined ? profileData.is_prepaid : true,
          is_cod: profileData.is_cod !== undefined ? profileData.is_cod : true,
          is_fw: profileData.is_fw !== undefined ? profileData.is_fw : true,
          is_rto: profileData.is_rto !== undefined ? profileData.is_rto : true,
          is_cod_reversal: profileData.is_cod_reversal !== undefined ? profileData.is_cod_reversal : true,
          
          // Billing and Remittance
          payment_method: profileData.payment_method || 'PREPAID',
          remittance_cycle: profileData.remittance_cycle || 'WEEKLY',
          remittance_min_amount: profileData.remittance_min_amount || 0,
          remittance_days_after_delivery: profileData.remittance_days_after_delivery || 7,
          early_remittance_charge: profileData.early_remittance_charge || 0,
          remittance_days_of_week: profileData.remittance_days_of_week || [5],
          billing_cycle_type: profileData.billing_cycle_type || 'MONTHLY',
          
          // Label/Manifest Format
          label_format: profileData.label_format || 'THERMAL',
          manifest_format: profileData.manifest_format || 'THERMAL',
        },
      });

      return reply.send({ success: true, profile: updatedProfile });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to update user profile' });
    }
  }
} 