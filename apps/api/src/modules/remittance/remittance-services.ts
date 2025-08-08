import { addDays, startOfDay, isAfter, format, parseISO } from 'date-fns';
import { exportData } from '@/utils/exportData';
import { FastifyInstance } from 'fastify';
import { Role, User, UserBankAccount, UserProfile, UserWallet } from '@lorrigo/db';
import { ShipmentBucket } from '@lorrigo/utils';
import { TransactionService, TransactionType, TransactionEntityType } from '@/modules/transactions/services/transaction-service';

export class RemittanceService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Calculate remittance for all eligible users
   */
  async calculateRemittanceForAllUsers() {
    console.log('Starting daily remittance calculation...');
    try {
      const users = await this.fastify.prisma.user.findMany({
        where: { is_active: true },
        include: { profile: true, wallet: true, user_bank_accounts: true },
      });
      console.log(`Found ${users.length} active users`);
      for (const user of users) {
        try {
          if (!user.profile || !user.wallet || !user.user_bank_accounts || user.user_bank_accounts.length === 0) {
            console.log(`User ${user.id} has no profile, wallet, or bank accounts, skipping`);
            continue;
          }
          await this.processUserRemittance(
            user as User & {
              profile: UserProfile;
              wallet: UserWallet;
              user_bank_accounts: UserBankAccount[];
            }
          );
        } catch (error) {
          this.fastify.log.error({ err: error, userId: user.id }, 'Error processing remittance for user');
        }
      }
      console.log('Daily remittance calculation completed');
    } catch (error) {
      console.error('Error in calculateRemittanceForAllUsers:', error);
      throw error;
    }
  }

  /**
   * Process remittance for a single user
   */
  private async processUserRemittance(user: User & { profile: UserProfile; wallet: UserWallet; user_bank_accounts: UserBankAccount[] }) {
    // Allow remittance calculation even if user has no bank account
    // if (user.user_bank_accounts && user.user_bank_accounts.length > 10) {
    //   console.log(`User ${user.id} has more than 10 bank accounts, skipping`);
    //   return;
    // }
    const eligibleBankAccounts = user.user_bank_accounts ? user.user_bank_accounts.filter((acc: any) => this.isBankAccountEligible(acc)) : [];
    // Select eligible bank account if available, else null
    const selectedBankAccount =
      eligibleBankAccounts.find((acc: any) => acc.is_selected_for_remittance) || eligibleBankAccounts[eligibleBankAccounts.length - 1] || null;
    const remittanceDelay = user.profile?.remittance_days_after_delivery || 7;
    const remittanceDays = user.profile?.remittance_days_of_week || [5];
    const minRemittanceAmount = user.profile?.remittance_min_amount || 0;
    const earlyRemittanceChargeRate = user.profile?.early_remittance_charge || 0;
    const eligibleOrders = await this.findEligibleOrders(user.id, remittanceDelay);
    if (eligibleOrders.length === 0) {
      console.log(`User ${user.id} has no eligible orders for remittance`);
      return;
    }
    const ordersGroupedByRemittanceDate = this.groupOrdersByRemittanceDate(eligibleOrders, remittanceDelay, remittanceDays);
    console.log(ordersGroupedByRemittanceDate, 'ordersGroupedByRemittanceDate-----');
    const today = startOfDay(new Date());
    const cutoffDate = new Date('2025-06-10');
    for (const [remittanceDateStr, ordersForRemittance] of Object.entries(ordersGroupedByRemittanceDate)) {
      const remittanceDate = parseISO(remittanceDateStr);
      if (isAfter(today, remittanceDate) || remittanceDate < cutoffDate) {
        console.log(`Skipping remittance for ${remittanceDateStr} - date is in the past or before cutoff`);
        continue;
      }
      const existingRemittance = await this.fastify.prisma.remittance.findFirst({
        where: {
          user_id: user.id,
          remittance_date: { gte: startOfDay(remittanceDate), lte: startOfDay(remittanceDate) },
        },
      });
      const remittanceCalculation = await this.calculateRemittanceAmount(ordersForRemittance, earlyRemittanceChargeRate);
      if (remittanceCalculation.totalAmount < minRemittanceAmount) {
        console.log(`Skipping remittance for ${remittanceDateStr} - amount ${remittanceCalculation.totalAmount} is below minimum ${minRemittanceAmount}`);
        continue;
      }
      if (existingRemittance && existingRemittance.status !== 'PENDING') {
        console.log(`Existing remittance for ${remittanceDateStr} is not pending (status: ${existingRemittance.status}). Skipping.`);
        continue;
      }
      if (existingRemittance) {
        console.log(`Updating existing pending remittance for ${remittanceDateStr}`);
        await this.updateRemittanceRecord(existingRemittance, user, selectedBankAccount, ordersForRemittance, remittanceCalculation);
      } else {
        console.log(`Creating new remittance for ${remittanceDateStr}`);
        await this.createRemittanceRecord(user, selectedBankAccount, ordersForRemittance, remittanceCalculation, remittanceDate);
      }
    }
  }

  /**
   * Find eligible orders for remittance
   */
  private async findEligibleOrders(userId: string, remittanceDelay: number) {
    const cutoffDate = addDays(new Date(), -remittanceDelay);
    const orders = await this.fastify.prisma.order.findMany({
      where: {
        user_id: userId,
        remittanceId: null,
        shipment: {
          status: 'DELIVERED',
          bucket: ShipmentBucket.DELIVERED,
          // delivered_date: { lte: cutoffDate },
        },
        payment_method: 'COD',
      },
      include: {
        shipment: {
          include: {
            tracking_events: {
              where: {
                bucket: ShipmentBucket.DELIVERED,
                // timestamp: { lte: cutoffDate },
              },
              orderBy: {
                created_at: 'desc',
              },
              take: 1,
            },
          },
        },
        billings: true,
      },
    });
    return orders;
  }

  /**
   * Group orders by remittance date
   */
  private groupOrdersByRemittanceDate(orders: any[], remittanceDelay: number, remittanceDays: number[]) {
    const ordersGroupedByDate: Record<string, any[]> = {};
    for (const order of orders) {
      const deliveryDate = order.shipment?.tracking_events[0]?.timestamp;
      if (!deliveryDate) continue;
      const cutoffDate = addDays(deliveryDate, remittanceDelay + 1);
      const remittanceDate = this.findNearestRemittanceDay(cutoffDate, remittanceDays);
      const remittanceDateStr = format(remittanceDate, 'yyyy-MM-dd');
      if (!ordersGroupedByDate[remittanceDateStr]) {
        ordersGroupedByDate[remittanceDateStr] = [];
      }
      ordersGroupedByDate[remittanceDateStr].push(order);
    }
    return ordersGroupedByDate;
  }

  /**
   * Find the nearest remittance day
   */
  private findNearestRemittanceDay(date: Date, remittanceDays: number[]): Date {
    let currentDate = startOfDay(date);
    let attempts = 0;
    while (attempts < 7) {
      const dayOfWeek = currentDate.getDay();
      if (remittanceDays.includes(dayOfWeek)) {
        return currentDate;
      }
      currentDate = addDays(currentDate, 1);
      attempts++;
    }
    while (currentDate.getDay() !== 5) {
      currentDate = addDays(currentDate, 1);
    }
    return currentDate;
  }

  /**
   * Calculate remittance amount with charge deductions
   */
  private async calculateRemittanceAmount(orders: any[], earlyRemittanceChargeRate: number) {
    let totalAmount = 0;
    const orderDetails = [];
    for (const order of orders) {
      let orderAmount = 0;
      if (order.payment_method === 'COD' && order.amount_to_collect) {
        orderAmount += order.amount_to_collect;
      }
      const netOrderAmount = orderAmount;
      orderDetails.push({
        orderId: order.id,
        orderAmount,
        netAmount: netOrderAmount,
      });
      totalAmount += orderAmount;
    }
    const earlyRemittanceCharge = totalAmount * (earlyRemittanceChargeRate / 100);
    const netAmount = totalAmount - earlyRemittanceCharge;
    return { totalAmount, earlyRemittanceCharge, netAmount, orderDetails };
  }

  /**
   * Create remittance record and update wallet
   */
  private async createRemittanceRecord(user: User & { profile: UserProfile; wallet: UserWallet; user_bank_accounts: UserBankAccount[] }, bankAccount: any, orders: any[], calculation: any, remittanceDate: Date) {
    console.log('Creating remittance record for user', user.id, 'with amount', calculation.netAmount);
    return await this.fastify.prisma.$transaction(async (tx) => {
      const remittance = await tx.remittance.create({
        data: {
          code: `RM-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          transaction_id: `RT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          amount: calculation.netAmount,
          status: 'PENDING',
          remittance_date: remittanceDate,
          cycle_type: user.profile?.remittance_cycle || 'WEEKLY',
          orders_count: orders.length,
          amount_before_adjustment: calculation.totalAmount,
          wallet_transfer_amount: calculation.totalCharges,
          early_remittance_charge: calculation.earlyRemittanceCharge,
          final_payout_amount: calculation.netAmount,
          user: {
            connect: { id: user.id },
          },
          created_by: 'system',
          processing_details: {
            totalAmount: calculation.totalAmount,
            totalCharges: calculation.totalCharges,
            earlyRemittanceCharge: calculation.earlyRemittanceCharge,
            netAmount: calculation.netAmount,
            orderDetails: calculation.orderDetails,
          },
        },
      });
      await tx.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { remittanceId: remittance.id },
      });

      if (user.profile?.wallet_type === 'WALLET' || user.profile?.wallet_type === 'REMITTANCE_WALLET') {
        await tx.userWallet.update({
          where: { id: user.wallet.id },
          data: {
            available_amount: { increment: calculation.netAmount },
          },
        });
      }

      // [ 16 Jul 2025 ]: Will be used later: when @nishant (owner) wants to add wallet balance to remittance
      // if (user.wallet) {
      //   const walletBalanceBefore = user.wallet.balance;
      //   const walletBalanceAfter = walletBalanceBefore + calculation.netAmount;
      //   await tx.userWallet.update({
      //     where: { id: user.wallet.id },
      //     data: {
      //       balance: walletBalanceAfter,
      //       usable_amount: walletBalanceAfter - user.wallet.hold_amount,
      //     },
      //   });
      //   await tx.remittance.update({
      //     where: { id: remittance.id },
      //     data: {
      //       wallet_balance_before: walletBalanceBefore,
      //       wallet_balance_after: walletBalanceAfter,
      //     },
      //   });
      // }
      console.log(`Created remittance ${remittance.code} for user ${user.id} with amount ${calculation.netAmount}`);
      return remittance;
    });
  }

  /**
   * Update existing remittance record
   */
  private async updateRemittanceRecord(remittance: any, user: any, bankAccount: any, orders: any[], calculation: any) {
    return await this.fastify.prisma.$transaction(async (tx) => {
      const updatedAmount = remittance.amount + calculation.netAmount;
      const updatedWalletTransferAmount = remittance.wallet_transfer_amount + calculation.totalCharges;
      const updatedAmountBeforeAdjustment = remittance.amount_before_adjustment + calculation.totalAmount;
      const updatedEarlyRemittanceCharge = remittance.early_remittance_charge + calculation.earlyRemittanceCharge;
      const updatedRemittance = await tx.remittance.update({
        where: { id: remittance.id },
        data: {
          amount: updatedAmount,
          orders_count: { increment: orders.length },
          amount_before_adjustment: updatedAmountBeforeAdjustment,
          wallet_transfer_amount: updatedWalletTransferAmount,
          early_remittance_charge: updatedEarlyRemittanceCharge,
          final_payout_amount: updatedAmount,
          processing_details: {
            totalAmount: updatedAmountBeforeAdjustment,
            totalCharges: updatedWalletTransferAmount,
            earlyRemittanceCharge: updatedEarlyRemittanceCharge,
            netAmount: updatedAmount,
            orderDetails: [...(remittance.processing_details.orderDetails || []), ...calculation.orderDetails],
          },
        },
      });
      await tx.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { remittanceId: remittance.id },
      });

      await tx.userWallet.update({
        where: { id: user.wallet.id },
        data: {
          available_amount: { increment: calculation.netAmount },
        },
      });

      // [ 16 Jul 2025 ]: Will be used later: when @nishant (owner) wants to add wallet balance to remittance
      // if (user.wallet) {
      //   const walletBalanceBefore = user.wallet.balance;
      //   const walletBalanceAfter = walletBalanceBefore + calculation.netAmount;
      //   await tx.userWallet.update({
      //     where: { id: user.wallet.id },
      //     data: {
      //       balance: walletBalanceAfter,
      //       usable_amount: walletBalanceAfter - user.wallet.hold_amount,
      //     },
      //   });
      //   await tx.remittance.update({
      //     where: { id: remittance.id },
      //     data: {
      //       wallet_balance_before: walletBalanceBefore,
      //       wallet_balance_after: walletBalanceAfter,
      //     },
      //   });
      // }
      console.log(`Updated remittance ${remittance.code} for user ${user.id} with amount ${updatedAmount}`);
      return updatedRemittance;
    });
  }

  /**
   * Check if bank account is eligible for remittance
   */
  isBankAccountEligible(bankAccount: any): boolean {
    if (!bankAccount.is_verified || !bankAccount.verified_at) {
      return false;
    }
    const ageMs = Date.now() - new Date(bankAccount.verified_at).getTime();
    const hoursOld = ageMs / (1000 * 60 * 60);
    return hoursOld > 24;
  }

  /**
   * Get remittances for a user (SELLER) or all remittances (ADMIN/SUBADMIN)
   */
  async getRemittancesForUser(userId: string, { page = 1, limit = 20, status, from, to, search }: any) {
    const skip = (page - 1) * limit;
    const where: any = { user_id: userId };
    if (status) where.status = status;
    if (from || to) {
      where.remittance_date = {};
      if (from) where.remittance_date.gte = new Date(from);
      if (to) where.remittance_date.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { transaction_id: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        {
          orders: {
            some: {
              shipment: {
                awb: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
        {
          orders: {
            some: {
              order_number: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    let warn_message = '';

    if (Number.isNaN(Number(limit))) {
      limit = 20;
      warn_message = 'Invalid limit, using default limit of 20';
    }
    if (Number.isNaN(Number(page))) {
      page = 1;
      warn_message = 'Invalid page, using default page of 1';
    }

    const [total, remittanceOrders] = await Promise.all([
      this.fastify.prisma.remittance.count({ where }),
      this.fastify.prisma.remittance.findMany({
        where,
        select: {
          id: true,
          code: true,
          remittance_date: true,
          early_remittance_charge_amount: true,
          wallet_transfer_amount: true,
          wallet_balance_before: true,
          wallet_balance_after: true,
          status: true,
          amount: true,
          bank_account_id: true,
          orders_count: true,
          processing_details: true,
        },
        skip,
        take: parseInt(limit),
        orderBy: { remittance_date: 'desc' },
      }),
    ]);
    return {
      valid: !!remittanceOrders.length,
      remittanceOrders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      warn_message,
    };
  }

  /**
   * Get all remittances (ADMIN/SUBADMIN)
   */
  async getAllRemittances({ page = 1, limit = 20, status, sellerId, from, to, search }: any) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.user_id = sellerId;
    if (from || to) {
      where.remittance_date = {};
      if (from) where.remittance_date.gte = new Date(from);
      if (to) where.remittance_date.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { transaction_id: { contains: search, mode: 'insensitive' } },
        { bank_transaction_id: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [total, remittanceOrders] = await Promise.all([
      this.fastify.prisma.remittance.count({ where }),
      this.fastify.prisma.remittance.findMany({
        where,
        select: {
          id: true,
          code: true,
          remittance_date: true,
          amount: true,
          status: true,
          wallet_transfer_amount: true,
          wallet_balance_before: true,
          wallet_balance_after: true,
          processing_details: true,
          orders: {
            select: {
              id: true,
              code: true,
              order_number: true,
              total_amount: true,
              amount_to_collect: true,
              payment_method: true,
              shipment: { select: { id: true, awb: true, status: true } },
            },
          },
          bank_account: {
            select: {
              id: true,
              account_number: true,
              bank_name: true,
              account_holder: true,
            },
          },
          user: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: parseInt(limit),
        orderBy: { remittance_date: 'desc' },
      }),
    ]);
    return {
      valid: !!remittanceOrders.length,
      remittanceOrders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      message: total ? 'Remittances fetched successfully' : 'No remittances found',
    };
  }

  /**
   * Get remittance by ID with role-based access
   */
  async getRemittanceById(id: string, userId: string, userRole: string) {
    const where: any = { id };
    if (userRole === Role.SELLER) {
      where.user_id = userId;
    }
    const remittance = await this.fastify.prisma.remittance.findUnique({
      where,
      include: {
        orders: {
          select: {
            id: true,
            code: true,
            order_number: true,
            total_amount: true,
            amount_to_collect: true,
            payment_method: true,
            shipment: { select: { id: true, awb: true, status: true } },
          },
        },
        bank_account: {
          select: {
            id: true,
            account_number: true,
            bank_name: true,
            account_holder: true,
          },
        },
        user: userRole !== Role.SELLER ? { select: { id: true, name: true, email: true } } : undefined,
      },
    });
    if (!remittance) {
      return { valid: false, message: 'No Remittance found or access denied' };
    }
    return { valid: true, remittanceOrder: remittance };
  }

  /**
   * Get remittance analytics
   */
  async getRemittanceAnalytics({ userId, period }: any) {
    const now = new Date();
    let from: Date;
    switch (period) {
      case 'week':
        from = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        from = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        from = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        from = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        from = new Date(now.setDate(now.getDate() - 30));
    }
    const where: any = { remittance_date: { gte: from, lte: new Date() } };
    if (userId) where.user_id = userId;
    const analytics = await this.fastify.prisma.remittance.groupBy({
      by: ['remittance_date'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
    return { valid: true, analytics };
  }

  /**
   * Manage user remittance (ADMIN/SUBADMIN)
   */
  async manageUserRemittance({ remittanceId, bankTransactionId, status }: any) {
    const remittance = await this.fastify.prisma.remittance.findUnique({ where: { id: remittanceId } });
    if (!remittance) {
      return { valid: false, message: 'Remittance not found' };
    }
    const updateData: any = { status };
    if (bankTransactionId) {
      updateData.bank_transaction_id = bankTransactionId;
      updateData.bank_transaction_date = new Date();
    }
    if (status === 'COMPLETED') {
      updateData.completed_at = new Date();
    } else if (status === 'FAILED') {
      updateData.failed_at = new Date();
    }
    await this.fastify.prisma.remittance.update({
      where: { id: remittanceId },
      data: updateData,
    });
    return { valid: true, message: 'Remittance updated successfully' };
  }

  /**
   * Select bank account for remittance
   */
  async selectBankAccountForRemittance(userId: string, bankAccountId: string, remittanceId: string) {
    try {
      const bankAccount = await this.fastify.prisma.userBankAccount.findFirst({
        where: { id: bankAccountId, user_id: userId },
      });
      if (!bankAccount) {
        throw new Error('Bank account not found');
      }
      if (!this.isBankAccountEligible(bankAccount)) {
        throw new Error('Bank account is not eligible for remittance');
      }

      const existingRemittance = await this.fastify.prisma.remittance.findFirst({
        where: { id: remittanceId, status: 'PENDING' },
      });
      if (!existingRemittance) {
        throw new Error('Cannot select bank account for completed remittance');
      }

      if (existingRemittance.remittance_date.toDateString() <= new Date().toDateString() && existingRemittance.bank_account_id) {
        throw new Error("Cannot change bank account for remittance with today's date when a bank account is already assigned");
      }

      await this.fastify.prisma.remittance.update({
        where: { id: remittanceId },
        data: { bank_account_id: bankAccountId },
      });

      return { valid: true, message: 'Bank account selected for remittance' };
    } catch (error) {
      return { valid: false, message: (error as Error).message };
    }
  }

  /**
   * Export remittances as CSV (ADMIN/SUBADMIN)
   */
  async exportRemittancesAsCSV(filters: any) {
    const { remittanceOrders } = await this.getAllRemittances({ ...filters, page: 1, limit: 10000 });
    const fields = [
      'id',
      'code',
      'transaction_id',
      'amount',
      'status',
      'remittance_date',
      'orders_count',
      'user_id',
      'bank_account_id',
      'user.name',
      'user.email',
    ];
    return exportData(fields, remittanceOrders, 'csv', `remittances-${Date.now()}.csv`);
  }

  /**
   * Export remittance detail as CSV (ADMIN/SUBADMIN)
   */
  async exportRemittanceDetailAsCSV(id: string) {
    const { remittanceOrder } = await this.getRemittanceById(id, '', Role.ADMIN);
    if (!remittanceOrder) {
      return { csvBuffer: Buffer.from('', 'utf-8'), filename: `remittance-${id}.csv` };
    }
    const orders = (remittanceOrder.orders || []).map((order: any) => ({
      remittance_id: remittanceOrder.id,
      remittance_code: remittanceOrder.code,
      ...order,
    }));
    const fields = ['remittance_code', 'order_number', 'total_amount', 'amount_to_collect', 'payment_method', 'awb', 'status', 'delivered date'];
    return exportData(fields, orders, 'csv', `remittance-${id}-${Date.now()}.csv`);
  }

  /**
   * Export remittances as XLSX (ADMIN/SUBADMIN)
   */
  async exportRemittancesAsXLSX(filters: any) {
    const { remittanceOrders } = await this.getAllRemittances({ ...filters, page: 1, limit: 10000 });
    const fields = [
      'id',
      'code',
      'transaction_id',
      'amount',
      'status',
      'remittance_date',
      'orders_count',
      'user_id',
      'bank_account_id',
      'user.name',
      'user.email',
    ];
    return exportData(fields, remittanceOrders, 'xlsx', `remittances-${Date.now()}.xlsx`);
  }

  /**
   * Export remittance detail as XLSX (ADMIN/SUBADMIN)
   */
  async exportRemittanceDetailAsXLSX(id: string) {
    const { remittanceOrder } = await this.getRemittanceById(id, '', Role.ADMIN);
    if (!remittanceOrder) {
      return { csvBuffer: Buffer.from('', 'utf-8'), filename: `remittance-${id}.xlsx` };
    }
    const orders = (remittanceOrder.orders || []).map((order: any) => ({
      remittance_id: remittanceOrder.id,
      remittance_code: remittanceOrder.code,
      ...order,
    }));
    const fields = ['remittance_id', 'remittance_code', 'id', 'code', 'order_number', 'total_amount', 'amount_to_collect', 'payment_method'];
    return exportData(fields, orders, 'xlsx', `remittance-${id}-${Date.now()}.xlsx`);
  }

  /**
   * Transfer remittance amount to user's wallet (WALLET type users only)
   */
  async transferRemittanceToWallet(userId: string, remittanceId: string, amount: number) {
    try {
      // Get user with profile and wallet
      const user = await this.fastify.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true, wallet: true },
      });

      if (!user) {
        return { valid: false, message: 'User not found' };
      }

      if (!user.profile || !user.wallet) {
        return { valid: false, message: 'User profile or wallet not found' };
      }

      // Check if user is WALLET type
      if (user.profile.wallet_type !== 'WALLET') {
        return { valid: false, message: 'This feature is only available for WALLET type users' };
      }

      // Get remittance
      const remittance = await this.fastify.prisma.remittance.findFirst({
        where: { 
          id: remittanceId, 
          user_id: userId,
          status: 'PENDING'
        },
        select: {
          id: true,
          code: true,
          amount: true,
          status: true,
          wallet_balance_before: true,
          wallet_balance_after: true,
          transaction_id: true,
          processing_details: true,
        },
      });

      if (!remittance) {
        return { valid: false, message: 'Remittance not found or not in pending status' };
      }

      // Check if amount is valid
      if (amount <= 0) {
        return { valid: false, message: 'Amount must be greater than 0' };
      }

      if (amount > remittance.amount) {
        return { valid: false, message: 'Amount cannot be greater than remittance amount' };
      }

      // Check if wallet transfer already done
      if (remittance.wallet_balance_before !== null && remittance.wallet_balance_after !== null) {
        return { valid: false, message: 'Wallet transfer already completed for this remittance' };
      }

      // Initialize transaction service
      const transactionService = new TransactionService(this.fastify);

      // Create remittance transaction
      const transactionResult = await transactionService.createRemittanceTransaction({
        userId,
        remittanceId,
        remittanceCode: remittance.code,
        amount,
        type: TransactionType.CREDIT,
        description: `Remittance transfer: ${remittance.code}`,
        status: 'COMPLETED',
        merchantTransactionId: `RT-${remittance.transaction_id}`,
        currency: 'INR',
      });

      if (!transactionResult.success || !transactionResult.transaction) {
        return { valid: false, message: transactionResult.error || 'Failed to create transaction' };
      }

      // Update remittance with wallet transfer details
      const updatedRemittance = await this.fastify.prisma.remittance.update({
        where: { id: remittanceId },
        data: {
          wallet_balance_before: transactionResult.transaction.before_balance,
          wallet_balance_after: transactionResult.transaction.after_balance,
          wallet_transfer_amount: amount,
          status: 'COMPLETED',
          completed_at: new Date(),
          processing_details: {
            ...(remittance.processing_details as any || {}),
            walletTransfer: {
              amount,
              balanceBefore: transactionResult.transaction.before_balance,
              balanceAfter: transactionResult.transaction.after_balance,
              transferredAt: new Date(),
              transactionId: transactionResult.transaction.id,
            },
          },
        },
      });

      return { 
        valid: true, 
        message: 'Remittance amount transferred to wallet successfully',
        remittance: updatedRemittance,
        walletBalanceAfter: transactionResult.walletBalance,
        transaction: transactionResult.transaction,
      };
    } catch (error) {
      console.error('Error transferring remittance to wallet:', error);
      return { valid: false, message: 'Failed to transfer remittance to wallet' };
    }
  }
}
