import { FastifyRequest, FastifyReply } from 'fastify';
import { WeightDisputeService } from './weight-dispute-service';

export class WeightDisputeController {
  constructor(private service: WeightDisputeService) {}

  async listDisputes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const page = parseInt((request.query as any).page || '1');
      const limit = parseInt((request.query as any).limit || '15');
      const data = await this.service.listDisputes(userId, page, limit);
      return reply.code(200).send({ success: true, data });
    } catch (error: any) {
      request.log.error(`Error listing disputes: ${error.message}`);
      return reply.code(500).send({ success: false, message: error.message });
    }
  }

  async resolveDispute(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { disputeId } = request.params as { disputeId: string };
      const userId = request.userPayload!.id;
      const body = request.body as any;
      const updated = await this.service.resolveDispute(disputeId, userId, body);
      return reply.code(200).send({ success: true, data: updated });
    } catch (error: any) {
      request.log.error(`Error resolving dispute: ${error.message}`);
      return reply.code(500).send({ success: false, message: error.message });
    }
  }

  async bulkAction(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;
      const { actionType, disputeIds } = request.body as { actionType: string; disputeIds: string[] };
      const result = await this.service.bulkAction(userId, disputeIds, actionType as any);
      return reply.code(200).send({ success: true, data: result });
    } catch (error: any) {
      request.log.error(`Error bulk action: ${error.message}`);
      return reply.code(500).send({ success: false, message: error.message });
    }
  }
} 