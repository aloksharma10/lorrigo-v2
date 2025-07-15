// BullMQ recurring job for remittance calculation
import { Worker } from 'bullmq';
import { RemittanceService } from './remittance-services';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';
  import fastify, { FastifyInstance } from 'fastify';

export enum RemittanceJobType {
  CALCULATE_REMITTANCE = 'calculate-remittance',
}

// Worker to process remittance calculation
export const remittanceWorker = new Worker(
  QueueNames.REMITTANCE_PROCESSING,
  async (job) => {
    console.log(`Processing remittance job: ${job.name}`);
    
    if (job.name === RemittanceJobType.CALCULATE_REMITTANCE) {
      // Create a Fastify instance to pass to RemittanceService
      const app: FastifyInstance = fastify();
      await new RemittanceService(app).calculateRemittanceForAllUsers();
      await app.close();
    }
  },
  { 
    connection: redis,
    concurrency: 2,
  }
);

// Handle worker events
remittanceWorker.on('completed', (job) => {
  console.log(`Remittance job ${job.name} completed successfully`);
});

remittanceWorker.on('failed', (job, err) => {
  console.error(`Remittance job ${job?.name} failed:`, err);
});
