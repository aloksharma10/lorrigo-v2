import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@lorrigo/db';

export class UsersController {
  constructor(private fastify: FastifyInstance) {}

  async getUsersWithPagination(request: FastifyRequest, reply: FastifyReply) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
      } = request.query as {
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

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request as any).userPayload!.id as string;

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
      return reply.code(500).send({ success: false, error: 'Failed to fetch profile' });
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
      const { name, email, company_name, address, city, state, pincode } = request.body as {
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
        },
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

      // Validate billing configuration based on cycle type
      const billingValidationError = this.validateBillingConfiguration(profileData);
      if (billingValidationError) {
        return reply.code(400).send({
          success: false,
          error: billingValidationError,
        });
      }

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

          // Seller Config
          is_d2c: profileData.is_d2c,
          is_b2b: profileData.is_b2b,
          is_cod: profileData.is_cod,
          is_fw: profileData.is_fw,
          is_rto: profileData.is_rto,
          is_cod_reversal: profileData.is_cod_reversal,

          // Billing and Remittance
          remittance_cycle: profileData.remittance_cycle,
          remittance_min_amount: profileData.remittance_min_amount,
          remittance_days_after_delivery: profileData.remittance_days_after_delivery,
          early_remittance_charge: profileData.early_remittance_charge,
          remittance_days_of_week: profileData.remittance_days_of_week,
          billing_cycle_type: profileData.billing_cycle_type,
          billing_days_of_week: profileData.billing_days_of_week,
          billing_day_of_month: profileData.billing_day_of_month,
          billing_week_of_month: profileData.billing_week_of_month,
          billing_days: profileData.billing_days,

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

          // Seller Config
          is_d2c: profileData.is_d2c !== undefined ? profileData.is_d2c : true,
          is_b2b: profileData.is_b2b !== undefined ? profileData.is_b2b : true,
          is_cod: profileData.is_cod !== undefined ? profileData.is_cod : true,
          is_fw: profileData.is_fw !== undefined ? profileData.is_fw : true,
          is_rto: profileData.is_rto !== undefined ? profileData.is_rto : true,
          is_cod_reversal: profileData.is_cod_reversal !== undefined ? profileData.is_cod_reversal : true,

          // Billing and Remittance
          remittance_cycle: profileData.remittance_cycle || 'WEEKLY',
          remittance_min_amount: profileData.remittance_min_amount || 0,
          remittance_days_after_delivery: profileData.remittance_days_after_delivery || 7,
          early_remittance_charge: profileData.early_remittance_charge || 0,
          remittance_days_of_week: profileData.remittance_days_of_week || [5],
          billing_cycle_type: profileData.billing_cycle_type || 'MONTHLY',
          billing_days_of_week: profileData.billing_days_of_week || [5],
          billing_day_of_month: profileData.billing_day_of_month || 1,
          billing_week_of_month: profileData.billing_week_of_month || 1,
          billing_days: profileData.billing_days || [5],

          // Label/Manifest Format
          label_format: profileData.label_format || 'THERMAL',
          manifest_format: profileData.manifest_format || 'THERMAL',
        },
      });

      if (profileData.max_negative_amount !== undefined) {
        await prisma.user.update({
          where: { id },
          data: {
            wallet: {
              update: { max_negative_amount: profileData.max_negative_amount ?? 0 },
            },
          },
        });
      }

      return reply.send({ success: true, profile: updatedProfile });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to update user profile' });
    }
  }

  async updateMyProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const id = (request as any).userPayload!.id as string;
      const profileData = request.body as any;

      const updatedProfile = await prisma.userProfile.upsert({
        where: { user_id: id },
        update: {
          company: profileData.company,
          company_name: profileData.company_name,
          logo_url: profileData.logo_url,
          notification_settings: profileData.notification_settings,
          business_type: profileData.business_type,
          pan: profileData.pan,
          adhaar: profileData.adhaar,
          gst_no: profileData.gst_no,
          kyc_submitted: profileData.kyc_submitted,
          kyc_verified: profileData.kyc_verified,
          is_d2c: profileData.is_d2c,
          is_b2b: profileData.is_b2b,
          is_cod: profileData.is_cod,
          is_fw: profileData.is_fw,
          is_rto: profileData.is_rto,
          is_cod_reversal: profileData.is_cod_reversal,
          remittance_cycle: profileData.remittance_cycle,
          remittance_min_amount: profileData.remittance_min_amount,
          remittance_days_after_delivery: profileData.remittance_days_after_delivery,
          early_remittance_charge: profileData.early_remittance_charge,
          remittance_days_of_week: profileData.remittance_days_of_week,
          label_format: profileData.label_format,
          manifest_format: profileData.manifest_format,
        },
        create: {
          user_id: id,
          company: profileData.company,
          company_name: profileData.company_name,
          logo_url: profileData.logo_url,
          notification_settings: profileData.notification_settings || { email: true, whatsapp: true, system: true },
          business_type: profileData.business_type,
          pan: profileData.pan,
          adhaar: profileData.adhaar,
          gst_no: profileData.gst_no,
          kyc_submitted: profileData.kyc_submitted || false,
          kyc_verified: profileData.kyc_verified || false,
          is_d2c: profileData.is_d2c !== undefined ? profileData.is_d2c : true,
          is_b2b: profileData.is_b2b !== undefined ? profileData.is_b2b : true,
          is_cod: profileData.is_cod !== undefined ? profileData.is_cod : true,
          is_fw: profileData.is_fw !== undefined ? profileData.is_fw : true,
          is_rto: profileData.is_rto !== undefined ? profileData.is_rto : true,
          is_cod_reversal: profileData.is_cod_reversal !== undefined ? profileData.is_cod_reversal : true,
          remittance_cycle: profileData.remittance_cycle || 'WEEKLY',
          remittance_min_amount: profileData.remittance_min_amount || 0,
          remittance_days_after_delivery: profileData.remittance_days_after_delivery || 7,
          early_remittance_charge: profileData.early_remittance_charge || 0,
          remittance_days_of_week: profileData.remittance_days_of_week || [5],
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

  private validateBillingConfiguration(profileData: any): string | null {
    const { billing_cycle_type, billing_days, billing_day_of_month, billing_week_of_month } = profileData;

    if (!billing_cycle_type) {
      return 'Billing cycle type is required';
    }

    switch (billing_cycle_type) {
      case 'DAILY':
        // No additional validation needed for daily
        break;

      case 'WEEKLY':
        if (!billing_days || !Array.isArray(billing_days) || billing_days.length === 0) {
          return 'At least one day of the week must be selected for weekly billing';
        }
        const invalidWeekDays = billing_days.filter((day: number) => day < 0 || day > 6);
        if (invalidWeekDays.length > 0) {
          return 'Weekly billing days must be between 0 (Sunday) and 6 (Saturday)';
        }
        break;

      case 'MONTHLY':
        if (!billing_day_of_month || billing_day_of_month < 1 || billing_day_of_month > 31) {
          return 'Valid day of month (1-31) is required for monthly billing';
        }
        break;

      case 'FORTNIGHTLY':
        if (!billing_week_of_month || billing_week_of_month < 1 || billing_week_of_month > 4) {
          return 'Valid week of month (1-4) is required for fortnightly billing';
        }
        break;

      case 'CUSTOM':
        if (!billing_days || !Array.isArray(billing_days) || billing_days.length === 0) {
          return 'At least one billing day must be selected for custom billing';
        }
        break;

      default:
        return 'Invalid billing cycle type';
    }

    return null;
  }

  /**
   * Get user bank accounts (SELLER)
   */
  async getUserBankAccounts(userId: string, { page = 1, limit = 20, search }: any) {
    const skip = (page - 1) * limit;
    const where: any = { user_id: userId };
    if (search) {
      where.OR = [
        { account_number: { contains: search, mode: 'insensitive' } },
        { ifsc: { contains: search, mode: 'insensitive' } },
        { bank_name: { contains: search, mode: 'insensitive' } },
        { account_holder: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [total, bankAccounts] = await Promise.all([
      this.fastify.prisma.userBankAccount.count({ where }),
      this.fastify.prisma.userBankAccount.findMany({
        where,
        select: {
          id: true,
          account_number: true,
          bank_name: true,
          account_holder: true,
          ifsc: true,
          is_verified: true,
          is_selected_for_remittance: true,
          created_at: true,
          user: { select: { role: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const formattedBankAccounts = bankAccounts.map((bankAccount: any) => ({
      ...bankAccount,
      account_number: bankAccount.account_number?.slice(-6),
    }));

    return {
      success: true,
      bankAccounts: formattedBankAccounts,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get all bank accounts (ADMIN/SUBADMIN)
   */
  async getAllBankAccounts({ search, page = 1, limit = 20, userId, is_verified }: any) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (userId) where.user_id = userId;
    if (is_verified !== undefined) where.is_verified = is_verified;

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { account_number: { contains: search, mode: 'insensitive' } },
        { ifsc: { contains: search, mode: 'insensitive' } },
        { bank_name: { contains: search, mode: 'insensitive' } },
        { account_holder: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, bankAccounts] = await Promise.all([
      this.fastify.prisma.userBankAccount.count({ where }),
      this.fastify.prisma.userBankAccount.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return {
      success: true,
      bankAccounts,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Add bank account for user
   */
  async addBankAccount(userId: string, bankAccountData: any) {
    const existingCount = await this.fastify.prisma.userBankAccount.count({ where: { user_id: userId } });
    if (existingCount >= 10) {
      return { valid: false, message: 'Maximum 10 bank accounts allowed' };
    }
    const existingAccount = await this.fastify.prisma.userBankAccount.findFirst({
      where: { user_id: userId, account_number: bankAccountData.account_number },
    });
    if (existingAccount) {
      return { valid: false, message: 'Bank account already exists' };
    }
    const bankAccount = await this.fastify.prisma.userBankAccount.create({
      data: {
        user_id: userId,
        account_number: bankAccountData.account_number,
        ifsc: bankAccountData.ifsc,
        bank_name: bankAccountData.bank_name,
        account_holder: bankAccountData.account_holder,
      },
    });
    return { valid: true, bankAccount };
  }


  /**
   * Verify bank account (ADMIN/SUBADMIN)
   */
  async verifyBankAccount(bankAccountId: string, isVerified: boolean, adminId: string) {
    const bankAccount = await this.fastify.prisma.userBankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }
    const updateData: any = { is_verified: isVerified };
    if (isVerified) {
      updateData.verified_by = adminId;
      updateData.verified_at = new Date();
    } else {
      updateData.verified_by = null;
      updateData.verified_at = null;
    }
    const updatedBankAccount = await this.fastify.prisma.userBankAccount.update({
      where: { id: bankAccountId },
      data: updateData,
    });
    return updatedBankAccount;
  }

  async deleteBankAccount(bankAccountId: string) {
    const bankAccount = await this.fastify.prisma.userBankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }
    await this.fastify.prisma.userBankAccount.delete({ where: { id: bankAccountId } });
    return { success: true, message: 'Bank account deleted successfully' };
  }

  async updateBankAccountForUser(userId: string, bankAccountId: string, data: any) {
    const bankAccount = await this.fastify.prisma.userBankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAccount || bankAccount.user_id !== userId) {
      throw new Error('Bank account not found');
    }
    const updated = await this.fastify.prisma.userBankAccount.update({
      where: { id: bankAccountId },
      data: {
        account_number: data.account_number,
        ifsc: data.ifsc,
        bank_name: data.bank_name,
        account_holder: data.account_holder,
      },
    });
    return { success: true, bankAccount: updated };
  }

  async deleteBankAccountForUser(userId: string, bankAccountId: string) {
    const bankAccount = await this.fastify.prisma.userBankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAccount || bankAccount.user_id !== userId) {
      throw new Error('Bank account not found');
    }
    await this.fastify.prisma.userBankAccount.delete({ where: { id: bankAccountId } });
    return { success: true, message: 'Bank account deleted successfully' };
  }
}
