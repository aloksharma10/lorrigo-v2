import { addDays, startOfDay, isAfter, format, parseISO } from 'date-fns';
import { exportData } from '@/utils/exportData';
import { FastifyInstance } from 'fastify';
import { Role } from '@lorrigo/db';

export class RemittanceService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Calculate remittance for all eligible users
   */
  async calculateRemittanceForAllUsers() {
    console.log('Starting daily remittance calculation...');
    try {
      const users = await this.fastify.prisma.user.findMany({
        where: { is_active: true, role: "SELLER" },
        include: { profile: true, wallet: true, UserBankAccount: true },
      });
      console.log(`Found ${users.length} active users`);
      for (const user of users) {
        try {
          await this.processUserRemittance(user);
        } catch (error) {
          console.error(`Error processing remittance for user ${user.id}:`, error);
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
  private async processUserRemittance(user: any) {
    if (!user.UserBankAccount || user.UserBankAccount.length === 0) {
      console.log(`User ${user.id} has no bank accounts`);
      return;
    }
    if (user.UserBankAccount.length > 10) {
      console.log(`User ${user.id} has more than 10 bank accounts, skipping`);
      return;
    }
    const eligibleBankAccounts = user.UserBankAccount.filter((acc: any) => this.isBankAccountEligible(acc));
    if (eligibleBankAccounts.length === 0) {
      console.log(`User ${user.id} has no eligible bank accounts`);
      return;
    }
    const selectedBankAccount = eligibleBankAccounts.find((acc: any) => acc.is_selected_for_remittance) || eligibleBankAccounts[eligibleBankAccounts.length - 1];
    if (!selectedBankAccount) {
      console.log(`User ${user.id} has no selected bank account`);
      return;
    }
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
    return await this.fastify.prisma.order.findMany({
      where: {
        user_id: userId,
        remittanceId: null,
        shipment: { status: 'DELIVERED', updated_at: { lte: cutoffDate } },
        payment_method: 'COD',
      },
      include: { shipment: true, billings: true },
    });
  }

  /**
   * Group orders by remittance date
   */
  private groupOrdersByRemittanceDate(orders: any[], remittanceDelay: number, remittanceDays: number[]) {
    const ordersGroupedByDate: Record<string, any[]> = {};
    for (const order of orders) {
      const deliveryDate = order.shipment?.updated_at;
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
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
    let totalCharges = 0;
    const orderDetails = [];
    for (const order of orders) {
      let orderAmount = 0;
      let orderCharges = 0;
      if (order.payment_method === 'COD' && order.amount_to_collect) {
        orderAmount += order.amount_to_collect;
      }
      if (order.billings && order.billings.length > 0) {
        for (const billing of order.billings) {
          orderCharges += billing.fw_excess_charge || 0;
          orderCharges += billing.rto_excess_charge || 0;
          orderCharges += billing.zone_change_charge || 0;
          orderCharges += billing.cod_charge || 0;
          orderCharges += billing.fw_charge || 0;
          orderCharges += billing.rto_charge || 0;
        }
      }
      const netOrderAmount = orderAmount - orderCharges;
      orderDetails.push({
        orderId: order.id,
        orderAmount,
        orderCharges,
        netAmount: netOrderAmount,
      });
      totalAmount += orderAmount;
      totalCharges += orderCharges;
    }
    const earlyRemittanceCharge = totalAmount * (earlyRemittanceChargeRate / 100);
    const netAmount = totalAmount - totalCharges - earlyRemittanceCharge;
    return { totalAmount, totalCharges, earlyRemittanceCharge, netAmount, orderDetails };
  }

  /**
   * Create remittance record and update wallet
   */
  private async createRemittanceRecord(user: any, bankAccount: any, orders: any[], calculation: any, remittanceDate: Date) {
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
          user_id: user.id,
          bank_account_id: bankAccount.id,
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
      if (user.wallet) {
        const walletBalanceBefore = user.wallet.balance;
        const walletBalanceAfter = walletBalanceBefore + calculation.netAmount;
        await tx.userWallet.update({
          where: { id: user.wallet.id },
          data: {
            balance: walletBalanceAfter,
            usable_amount: walletBalanceAfter - user.wallet.hold_amount,
          },
        });
        await tx.remittance.update({
          where: { id: remittance.id },
          data: {
            wallet_balance_before: walletBalanceBefore,
            wallet_balance_after: walletBalanceAfter,
          },
        });
      }
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
            orderDetails: [
              ...(remittance.processing_details.orderDetails || []),
              ...calculation.orderDetails,
            ],
          },
        },
      });
      await tx.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { remittanceId: remittance.id },
      });
      if (user.wallet) {
        const walletBalanceBefore = user.wallet.balance;
        const walletBalanceAfter = walletBalanceBefore + calculation.netAmount;
        await tx.userWallet.update({
          where: { id: user.wallet.id },
          data: {
            balance: walletBalanceAfter,
            usable_amount: walletBalanceAfter - user.wallet.hold_amount,
          },
        });
        await tx.remittance.update({
          where: { id: remittance.id },
          data: {
            wallet_balance_before: walletBalanceBefore,
            wallet_balance_after: walletBalanceAfter,
          },
        });
      }
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
    return hoursOld > 72;
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
      ];
    }
    const [total, remittanceOrders] = await Promise.all([
      this.fastify.prisma.remittance.count({ where }),
      this.fastify.prisma.remittance.findMany({
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
        },
        skip,
        take: limit,
        orderBy: { remittance_date: 'desc' },
      }),
    ]);
    return {
      valid: !!remittanceOrders.length,
      remittanceOrders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
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
          user: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { remittance_date: 'desc' },
      }),
    ]);
    return {
      valid: !!remittanceOrders.length,
      remittanceOrders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
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
   * Get user bank accounts (SELLER)
   */
  async getUserBankAccounts(userId: string, { page = 1, limit = 20 }: any) {
    const skip = (page - 1) * limit;
    const [total, bankAccounts] = await Promise.all([
      this.fastify.prisma.userBankAccount.count({ where: { user_id: userId } }),
      this.fastify.prisma.userBankAccount.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          account_number: true,
          bank_name: true,
          account_holder: true,
          ifsc: true,
          is_verified: true,
          is_selected_for_remittance: true,
          created_at: true,
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return {
      valid: true,
      bankAccounts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get all bank accounts (ADMIN/SUBADMIN)
   */
  async getAllBankAccounts({ page = 1, limit = 20, userId, is_verified }: any) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (userId) where.user_id = userId;
    if (is_verified !== undefined) where.is_verified = is_verified;
    const [total, bankAccounts] = await Promise.all([
      this.fastify.prisma.userBankAccount.count({ where }),
      this.fastify.prisma.userBankAccount.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return {
      valid: true,
      bankAccounts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
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
   * Select bank account for remittance
   */
  async selectBankAccountForRemittance(userId: string, bankAccountId: string) {
    const bankAccount = await this.fastify.prisma.userBankAccount.findFirst({
      where: { id: bankAccountId, user_id: userId },
    });
    if (!bankAccount) {
      return { valid: false, message: 'Bank account not found' };
    }
    if (!this.isBankAccountEligible(bankAccount)) {
      return { valid: false, message: 'Bank account is not eligible for remittance' };
    }
    await this.fastify.prisma.userBankAccount.updateMany({
      where: { user_id: userId },
      data: { is_selected_for_remittance: false },
    });
    await this.fastify.prisma.userBankAccount.update({
      where: { id: bankAccountId },
      data: { is_selected_for_remittance: true },
    });
    return { valid: true, message: 'Bank account selected for remittance' };
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

  /**
   * Export remittances as CSV (ADMIN/SUBADMIN)
   */
  async exportRemittancesAsCSV(filters: any) {
    const { remittanceOrders } = await this.getAllRemittances({ ...filters, page: 1, limit: 10000 });
    const fields = [
      'id', 'code', 'transaction_id', 'amount', 'status', 'remittance_date', 'orders_count', 'user_id', 'bank_account_id',
      'user.name', 'user.email',
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
    const fields = [
      'remittance_id', 'remittance_code', 'id', 'code', 'order_number', 'total_amount', 'amount_to_collect', 'payment_method',
    ];
    return exportData(fields, orders, 'csv', `remittance-${id}-${Date.now()}.csv`);
  }
}