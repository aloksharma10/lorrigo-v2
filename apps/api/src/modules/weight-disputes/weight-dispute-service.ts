import { FastifyInstance } from 'fastify';
import { WeightDisputeStatus } from '@lorrigo/db';

export class WeightDisputeService {
  constructor(private fastify: FastifyInstance) {}

  async listDisputes(userId: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;

    const [disputes, total] = await this.fastify.prisma.$transaction([
      this.fastify.prisma.weightDispute.findMany({
        where: { user_id: userId },
        include: {
          order: {
            include: {
              customer: true,
              shipment: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.fastify.prisma.weightDispute.count({ where: { user_id: userId } }),
    ]);

    return {
      disputes,
      pagination: {
        page,
        pageSize: limit,
        total,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async resolveDispute(
    disputeId: string,
    userId: string,
    payload: {
      status: 'ACCEPTED' | 'REJECTED' | 'RESOLVED';
      final_weight?: number;
      resolution: string;
      revised_charges?: number;
    }
  ) {
    const dispute = await this.fastify.prisma.weightDispute.findUnique({
      where: { id: disputeId },
    });
    if (!dispute) throw new Error('Dispute not found');
    if (dispute.user_id !== userId) throw new Error('Unauthorized');
    if (dispute.status !== WeightDisputeStatus.PENDING)
      throw new Error('Dispute already processed');

    // Update dispute
    const updated = await this.fastify.prisma.weightDispute.update({
      where: { id: disputeId },
      data: {
        status: payload.status,
        final_weight: payload.final_weight,
        resolution: payload.resolution,
        resolution_date: new Date(),
      },
    });

    // Update wallet hold based on status
    const holdTx = await this.fastify.prisma.walletHoldTransaction.findFirst({
      where: { reference_id: disputeId, reference_type: 'DISPUTE' },
    });

    if (holdTx) {
      const wallet = await this.fastify.prisma.userWallet.findUnique({
        where: { id: holdTx.wallet_id },
      });
      if (wallet) {
        let holdChange = 0;
        let balanceChange = 0;

        if (payload.status === 'REJECTED') {
          // Release hold
          holdChange = -holdTx.hold_amount;
          balanceChange = 0;
          await this.fastify.prisma.walletHoldTransaction.update({
            where: { id: holdTx.id },
            data: {
              status: 'RELEASED',
              release_date: new Date(),
              release_reason: 'Seller rejected',
            },
          });
        } else {
          // For ACCEPTED / RESOLVED – convert hold into debit (forfeit)
          holdChange = -holdTx.hold_amount;
          balanceChange = -holdTx.hold_amount;
          await this.fastify.prisma.walletHoldTransaction.update({
            where: { id: holdTx.id },
            data: {
              status: 'FORFEITED',
              release_date: new Date(),
              release_reason: 'Charge applied',
            },
          });
        }

        await this.fastify.prisma.userWallet.update({
          where: { id: wallet.id },
          data: {
            hold_amount: { increment: holdChange },
            balance: { increment: balanceChange },
            usable_amount: { increment: balanceChange },
          },
        });
      }
    }

    return updated;
  }

  async bulkAction(userId: string, disputeIds: string[], action: 'ACCEPT_ALL' | 'REJECT_ALL') {
    const desiredStatus = action === 'ACCEPT_ALL' ? 'RESOLVED' : 'REJECTED';
    const updates = [];

    for (const id of disputeIds) {
      try {
        const res = await this.resolveDispute(id, userId, {
          status: desiredStatus as any,
          resolution: action,
        });
        updates.push(res);
      } catch (err) {
        this.fastify.log.error(`Bulk action failed for ${id}: ${err}`);
      }
    }

    return { count: updates.length };
  }
}
