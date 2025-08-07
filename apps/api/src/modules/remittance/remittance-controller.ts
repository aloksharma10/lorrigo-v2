import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@lorrigo/db';
import { RemittanceService } from './remittance-services';

export class RemittanceController {
  constructor(private remittanceService: RemittanceService) {}

  /**
   * Get remittances (role-based: SELLER sees own, ADMIN/SUBADMIN can filter)
   */
  async getRemittances(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const userRole = req.userPayload!.role;
    const { page = 1, limit = 20, status, sellerId, from, to, search } = req.query as any;

    if (userRole === Role.SELLER) {
      const result = await this.remittanceService.getRemittancesForUser(userId, { page, limit, status, from, to, search });
      return reply.send(result);
    } else {
      const result = await this.remittanceService.getAllRemittances({ page, limit, status, sellerId, from, to, search });
      return reply.send(result);
    }
  }

  /**
   * Get a single remittance by ID (role-based access control)
   */
  async getRemittanceById(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const userId = req.userPayload!.id;
    const userRole = req.userPayload!.role;

    const result = await this.remittanceService.getRemittanceById(id, userId, userRole);
    return reply.send(result);
  }

  /**
   * Get remittance analytics (role-based: SELLER sees own, ADMIN/SUBADMIN can specify sellerId)
   */
  async getRemittanceAnalytics(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const userRole = req.userPayload!.role;
    const { sellerId, period } = req.query as any;

    const result = await this.remittanceService.getRemittanceAnalytics({
      userId: userRole === Role.SELLER ? userId : sellerId,
      period,
    });
    return reply.send(result);
  }

  /**
   * Get bank accounts (role-based: SELLER sees own, ADMIN/SUBADMIN can filter)
   */
  async getBankAccounts(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const userRole = req.userPayload!.role;
    const { page = 1, limit = 10, userId: queryUserId, is_verified, search } = req.query as any;

    if (userRole === Role.SELLER) {
      const result = await this.remittanceService.getUserBankAccounts(userId, { page, limit, search });
      return reply.send(result);
    } else {
      const result = await this.remittanceService.getAllBankAccounts({ search, page, limit, userId: queryUserId, is_verified });
      return reply.send(result);
    }
  }

  /**
   * Add bank account for user (SELLER only)
   */
  async addBankBot(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const bankAccountData = req.body as any;
    const result = await this.remittanceService.addBankAccount(userId, bankAccountData);
    return reply.send(result);
  }

  /**
   * Select bank account for remittance (SELLER only)
   */
  async selectBankAccountForRemittance(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const { bankAccountId, remittanceId } = req.body as any;
    const result = await this.remittanceService.selectBankAccountForRemittance(userId, bankAccountId, remittanceId);
    return reply.send(result);
  }

  /**
   * Admin: Get future remittances
   */
  async getFutureRemittances(req: FastifyRequest, reply: FastifyReply) {
    const { page = 1, limit = 20, sellerId } = req.query as any;
    // const result = await this.remittanceService.getFutureRemittances({ page, limit, sellerId });
    // return reply.send(result);
    return reply.send({});
  }

  /**
   * Admin: Update/manage remittance
   */
  async manageUserRemittance(req: FastifyRequest, reply: FastifyReply) {
    const { remittanceId, bankTransactionId, status } = req.body as any;
    const result = await this.remittanceService.manageUserRemittance({ remittanceId, bankTransactionId, status });
    return reply.send(result);
  }

  /**
   * Admin: Verify bank account
   */
  async verifyBankAccount(req: FastifyRequest, reply: FastifyReply) {
    const { bankAccountId } = req.params as { bankAccountId: string };
    const { is_verified } = req.body as any;
    try {
      const bankAccount = await this.remittanceService.verifyBankAccount(bankAccountId, is_verified, req.userPayload!.id);
      return reply.send({ valid: true, bankAccount });
    } catch (error: any) {
      return reply.send({ valid: false, message: error.message });
    }
  }

  /**
   * Admin: Export remittances as CSV or XLSX
   */
  async exportRemittances(req: FastifyRequest, reply: FastifyReply) {
    const filters = req.query as any;
    const type = (filters.type || 'csv').toLowerCase();
    let result;
    if (type === 'xlsx') {
      result = await this.remittanceService.exportRemittancesAsXLSX(filters);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      result = await this.remittanceService.exportRemittancesAsCSV(filters);
      reply.header('Content-Type', 'text/csv');
    }
    reply.header('Content-Disposition', `attachment; filename=${result.filename}`);
    return reply.send(result.csvBuffer);
  }

  /**
   * Admin: Export remittance detail as CSV or XLSX
   */
  async exportRemittanceDetail(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const type = ((req.query as any).type || 'csv').toLowerCase();
    let result;
    if (type === 'xlsx') {
      result = await this.remittanceService.exportRemittanceDetailAsXLSX(id);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      result = await this.remittanceService.exportRemittanceDetailAsCSV(id);
      reply.header('Content-Type', 'text/csv');
    }
    reply.header('Content-Disposition', `attachment; filename=${result.filename}`);
    return reply.send(result.csvBuffer);
  }

  /**
   * Transfer remittance amount to wallet (SELLER only, WALLET type users)
   */
  async transferRemittanceToWallet(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const { remittanceId, amount } = req.body as any;
    
    const result = await this.remittanceService.transferRemittanceToWallet(userId, remittanceId, amount);
    return reply.send(result);
  }
}
