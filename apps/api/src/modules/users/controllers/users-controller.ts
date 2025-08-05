import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Role, prisma } from '@lorrigo/db';

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
          is_prepaid: profileData.is_prepaid,
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
          is_prepaid: profileData.is_prepaid !== undefined ? profileData.is_prepaid : true,
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

  async getUserBankAccounts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { page = 1, limit = 15, search, is_verified, is_selected_for_remittance, bank_name, account_holder, sort, filters } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = { user_id: id };

      // Global search
      if (search) {
        where.OR = [
          { account_number: { contains: search, mode: 'insensitive' } },
          { ifsc: { contains: search, mode: 'insensitive' } },
          { bank_name: { contains: search, mode: 'insensitive' } },
          { account_holder: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Specific filters
      if (is_verified !== undefined) {
        where.is_verified = is_verified === 'true';
      }

      if (is_selected_for_remittance !== undefined) {
        where.is_selected_for_remittance = is_selected_for_remittance === 'true';
      }

      if (bank_name) {
        where.bank_name = { contains: bank_name, mode: 'insensitive' };
      }

      if (account_holder) {
        where.account_holder = { contains: account_holder, mode: 'insensitive' };
      }

      // Handle column filters
      if (filters && Array.isArray(filters)) {
        filters.forEach((filter: any) => {
          if (filter.id === 'is_verified' && filter.value !== undefined) {
            where.is_verified = filter.value === 'true';
          }
          if (filter.id === 'is_selected_for_remittance' && filter.value !== undefined) {
            where.is_selected_for_remittance = filter.value === 'true';
          }
          if (filter.id === 'bank_name' && filter.value) {
            where.bank_name = { contains: filter.value, mode: 'insensitive' };
          }
          if (filter.id === 'account_holder' && filter.value) {
            where.account_holder = { contains: filter.value, mode: 'insensitive' };
          }
        });
      }

      // Handle sorting
      let orderBy: any = { created_at: 'desc' };
      if (sort && Array.isArray(sort) && sort.length > 0) {
        const sortItem = sort[0];
        const sortField = sortItem.id;
        const sortDirection = sortItem.desc ? 'desc' : 'asc';

        // Map frontend field names to database field names
        const fieldMapping: Record<string, string> = {
          account_holder: 'account_holder',
          bank_name: 'bank_name',
          account_number: 'account_number',
          ifsc: 'ifsc',
          is_verified: 'is_verified',
          is_selected_for_remittance: 'is_selected_for_remittance',
          created_at: 'created_at',
          updated_at: 'updated_at',
        };

        if (fieldMapping[sortField]) {
          orderBy = { [fieldMapping[sortField]]: sortDirection };
        }
      }

      const [total, bankAccounts] = await Promise.all([
        prisma.userBankAccount.count({ where }),
        prisma.userBankAccount.findMany({
          where,
          select: {
            id: true,
            account_number: true,
            ifsc: true,
            bank_name: true,
            account_holder: true,
            is_verified: true,
            verified_by: true,
            verified_at: true,
            is_selected_for_remittance: true,
            created_at: true,
            updated_at: true,
          },
          skip,
          take: limit,
          orderBy,
        }),
      ]);

      return reply.send({
        success: true,
        data: bankAccounts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to fetch bank accounts' });
    }
  }

  async addUserBankAccount(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { account_number, ifsc, bank_name, account_holder } = request.body as any;

      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      // Check if user already has 10 bank accounts
      const existingCount = await prisma.userBankAccount.count({ where: { user_id: id } });
      if (existingCount >= 10) {
        return reply.code(400).send({ success: false, error: 'Maximum 10 bank accounts allowed per user' });
      }

      // Check if account number already exists for this user
      const existingAccount = await prisma.userBankAccount.findFirst({
        where: { user_id: id, account_number },
      });
      if (existingAccount) {
        return reply.code(400).send({ success: false, error: 'Bank account already exists for this user' });
      }

      const bankAccount = await prisma.userBankAccount.create({
        data: {
          user_id: id,
          account_number,
          ifsc,
          bank_name,
          account_holder,
        },
      });

      return reply.send({ success: true, bankAccount });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to add bank account' });
    }
  }

  async updateUserBankAccount(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, bankAccountId } = request.params as { id: string; bankAccountId: string };
      const { account_number, ifsc, bank_name, account_holder, is_verified, is_selected_for_remittance } = request.body as any;

      // Check if bank account exists and belongs to user
      const existingAccount = await prisma.userBankAccount.findFirst({
        where: { id: bankAccountId, user_id: id },
      });
      if (!existingAccount) {
        return reply.code(404).send({ success: false, error: 'Bank account not found' });
      }

      // If updating account number, check for duplicates
      if (account_number && account_number !== existingAccount.account_number) {
        const duplicateAccount = await prisma.userBankAccount.findFirst({
          where: { user_id: id, account_number, id: { not: bankAccountId } },
        });
        if (duplicateAccount) {
          return reply.code(400).send({ success: false, error: 'Bank account number already exists for this user' });
        }
      }

      const updateData: any = {};
      if (account_number !== undefined) updateData.account_number = account_number;
      if (ifsc !== undefined) updateData.ifsc = ifsc;
      if (bank_name !== undefined) updateData.bank_name = bank_name;
      if (account_holder !== undefined) updateData.account_holder = account_holder;
      if (is_verified !== undefined) {
        updateData.is_verified = is_verified;
        if (is_verified) {
          updateData.verified_by = request.userPayload?.id;
          updateData.verified_at = new Date();
        } else {
          updateData.verified_by = null;
          updateData.verified_at = null;
        }
      }
      if (is_selected_for_remittance !== undefined) updateData.is_selected_for_remittance = is_selected_for_remittance;

      const updatedAccount = await prisma.userBankAccount.update({
        where: { id: bankAccountId },
        data: updateData,
      });

      return reply.send({ success: true, bankAccount: updatedAccount });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to update bank account' });
    }
  }

  async deleteUserBankAccount(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, bankAccountId } = request.params as { id: string; bankAccountId: string };

      // Check if bank account exists and belongs to user
      const existingAccount = await prisma.userBankAccount.findFirst({
        where: { id: bankAccountId, user_id: id },
      });
      if (!existingAccount) {
        return reply.code(404).send({ success: false, error: 'Bank account not found' });
      }

      // Check if account is being used in any remittances
      const remittanceCount = await prisma.remittance.count({
        where: { bank_account_id: bankAccountId },
      });
      if (remittanceCount > 0) {
        return reply.code(400).send({ success: false, error: 'Cannot delete bank account that is being used in remittances' });
      }

      await prisma.userBankAccount.delete({
        where: { id: bankAccountId },
      });

      return reply.send({ success: true, message: 'Bank account deleted successfully' });
    } catch (error) {
      this.fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Failed to delete bank account' });
    }
  }
}
