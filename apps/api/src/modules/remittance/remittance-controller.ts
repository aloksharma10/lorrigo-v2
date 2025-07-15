import { FastifyRequest, FastifyReply } from 'fastify';
import { RemittanceService } from './remittance-services';

export class RemittanceController {
  constructor(private remittanceService: RemittanceService) {}


  /**
   * Get all remittances for a seller (user)
   */
 async getRemittances(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const result = await this.remittanceService.getRemittancesForUser(userId);
    return reply.send(result);
  }

  /**
   * Get a single remittance by ID
   */
   async getRemittanceById(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const result = await this.remittanceService.getRemittanceById(id);
    return reply.send(result);
  }

  /**
   * Admin: Get all remittances (with filters, pagination, search)
   */
   async getAllRemittances(req: FastifyRequest, reply: FastifyReply) {
    const { page = 1, limit = 20, status, sellerId, from, to, search } = req.query as any;
    const result = await this.remittanceService.getAllRemittances({ page, limit, status, sellerId, from, to, search });
    return reply.send(result);
  }

  /**
   * Admin: Get future remittances
   */
   async getFutureRemittances(req: FastifyRequest, reply: FastifyReply) {
    const { page = 1, limit = 20, sellerId } = req.query as any;
    const result = await this.remittanceService.getFutureRemittances({ page, limit, sellerId });
    return reply.send(result);
  }

  /**
   * Remittance analytics (admin/user)
   */
   async getRemittanceAnalytics(req: FastifyRequest, reply: FastifyReply) {
    const { sellerId, period } = req.query as any;
    const result = await this.remittanceService.getRemittanceAnalytics({ sellerId, period });
    return reply.send(result);
  }

  /**
   * Admin: Update/manage remittance (status, bank transaction ID)
   */
   async manageUserRemittance(req: FastifyRequest, reply: FastifyReply) {
    const { remittanceId, bankTransactionId, status } = req.body as any;
    const result = await this.remittanceService.manageUserRemittance({ remittanceId, bankTransactionId, status });
    return reply.send(result);
  }

  /**
   * Get user bank accounts
   */
   async getUserBankAccounts(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const result = await this.remittanceService.getUserBankAccounts(userId);
    return reply.send(result);
  }

  /**
   * Add bank account for user
   */
   async addBankAccount(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const bankAccountData = req.body as any;
    const result = await this.remittanceService.addBankAccount(userId, bankAccountData);
    return reply.send(result);
  }

  /**
   * Select bank account for remittance
   */
   async selectBankAccountForRemittance(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.userPayload!.id;
    const { bankAccountId } = req.body as any;
    const result = await this.remittanceService.selectBankAccountForRemittance(userId, bankAccountId);
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
   * Admin: Get all bank accounts (with filters)
   */
   async getAllBankAccounts(req: FastifyRequest, reply: FastifyReply) {
    const { page = 1, limit = 20, userId, is_verified } = req.query as any;
    
    try {
      const result = await this.remittanceService.getAllBankAccounts({ page, limit, userId, is_verified });
      return reply.send(result);
    } catch (error: any) {
      return reply.send({ valid: false, message: error.message });
    }
  }

  /**
   * Export remittances as CSV (admin)
   */
   async exportRemittances(req: FastifyRequest, reply: FastifyReply) {
    const filters = req.query as any;
    const { csvBuffer, filename } = await this.remittanceService.exportRemittancesAsCSV(filters);
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename=${filename}`);
    return reply.send(csvBuffer);
  }

  /**
   * Export remittance detail as CSV (admin)
   */
   async exportRemittanceDetail(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const { csvBuffer, filename } = await this.remittanceService.exportRemittanceDetailAsCSV(id);
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename=${filename}`);
    return reply.send(csvBuffer);
  }
}
