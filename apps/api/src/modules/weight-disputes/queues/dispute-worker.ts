import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
import { APP_CONFIG } from '@/config/app';
import { WeightDisputeStatus } from '@lorrigo/db';

export enum DisputeJobType {
  AUTO_RESOLVE = 'auto-resolve',
}

interface DisputeJobData {
  date: string;
}

export function initDisputeWorker(fastify: FastifyInstance) {
  const disputeWorker = new Worker(
    QueueNames.DISPUTE_RESOLUTION,
    async (job: Job<DisputeJobData>) => {
      fastify.log.info(`Processing dispute job ${job.id}`);
      try {
        switch (job.name) {
          case DisputeJobType.AUTO_RESOLVE:
          case 'auto-resolve':
            return await autoResolveDisputes(fastify);
          default:
            throw new Error(`Unknown dispute job type: ${job.name}`);
        }
      } catch (err) {
        fastify.log.error(`Dispute worker error: ${err}`);
        throw err;
      }
    },
    {
      connection: redis,
      prefix: APP_CONFIG.REDIS.PREFIX,
      concurrency: 1,
    }
  );

  disputeWorker.on('completed', (job) => fastify.log.info(`Dispute job ${job.id} done`));
  disputeWorker.on('failed', (job, err) =>
    fastify.log.error(`Dispute job ${job?.id} failed: ${err}`)
  );

  return { disputeWorker };
}

async function autoResolveDisputes(fastify: FastifyInstance) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const disputes = await fastify.prisma.weightDispute.findMany({
    where: {
      status: WeightDisputeStatus.PENDING,
      dispute_raised_at: { lte: sevenDaysAgo },
    },
  });

  let resolved = 0;
  for (const dispute of disputes) {
    try {
      // Reuse service logic via direct update
      await fastify.prisma.weightDispute.update({
        where: { id: dispute.id },
        data: {
          status: WeightDisputeStatus.RESOLVED,
          resolution: 'Auto-resolved after 7 days',
          resolution_date: new Date(),
        },
      });

      // Convert hold to charges (forfeited)
      const holdTx = await fastify.prisma.walletHoldTransaction.findFirst({
        where: { reference_id: dispute.id, reference_type: 'DISPUTE' },
      });
      if (holdTx && holdTx.status === 'ACTIVE') {
        await fastify.prisma.walletHoldTransaction.update({
          where: { id: holdTx.id },
          data: { status: 'FORFEITED', release_date: new Date(), release_reason: 'Auto-resolved' },
        });
        await fastify.prisma.userWallet.update({
          where: { id: holdTx.wallet_id },
          data: {
            hold_amount: { decrement: holdTx.hold_amount },
            balance: { decrement: holdTx.hold_amount },
            usable_amount: { decrement: holdTx.hold_amount },
          },
        });
      }
      resolved++;
    } catch (err) {
      fastify.log.error(`Auto resolve failed for dispute ${dispute.id}: ${err}`);
    }
  }

  return { resolved };
}
