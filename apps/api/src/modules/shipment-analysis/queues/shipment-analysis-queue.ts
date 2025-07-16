import { Worker, Job } from 'bullmq';
import { FastifyInstance } from 'fastify';
import { ShipmentAnalysisService } from '../shipment-analysis.service';
import { ShipmentAnalysisJobType } from '../types';
import { QueueNames } from '@/lib/queue';
import { redis } from '@/lib/redis';

export interface ShipmentAnalysisJobData {
  userId: string;
  timestamp: string;
  filters?: any;
  priority?: 'high' | 'medium' | 'low';
}

export interface CacheUpdateJobData {
  userId: string;
  cacheKey: string;
  data: any;
  expiry: number;
}

export interface ReportGenerationJobData {
  userId: string;
  reportType: 'home' | 'performance' | 'realtime' | 'predictive';
  filters?: any;
  format: 'json' | 'csv' | 'pdf';
}

/**
 * Initialize the shipment analysis queue workers
 */
export function initShipmentAnalysisQueue(fastify: FastifyInstance) {
  const shipmentAnalysisService = new ShipmentAnalysisService(fastify);

  // Worker for processing home analytics
  const homeAnalyticsWorker = new Worker(
    QueueNames.REPORT_GENERATION,
    async (job: Job<ShipmentAnalysisJobData>) => {
      const { userId, timestamp } = job.data;
      
      try {
        fastify.log.info(`Processing home analytics for user ${userId}`);
        
        // Process home analytics in background
        const analytics = await shipmentAnalysisService.getHomePageAnalytics(userId);
        
        // Update cache with fresh data
        const cacheKey = `analytics:home:${userId}`;
        await redis.setex(cacheKey, 300, JSON.stringify(analytics)); // 5 minutes cache
        
        fastify.log.info(`Home analytics processed successfully for user ${userId}`);
        
        return {
          success: true,
          userId,
          timestamp,
          dataProcessed: true,
        };
      } catch (error) {
        fastify.log.error(`Error processing home analytics for user ${userId}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 5, // Process 5 jobs concurrently
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  // Worker for processing shipment performance analytics
  const performanceAnalyticsWorker = new Worker(
    QueueNames.REPORT_GENERATION,
    async (job: Job<ShipmentAnalysisJobData>) => {
      const { userId, filters, timestamp } = job.data;
      
      try {
        fastify.log.info(`Processing performance analytics for user ${userId}`);
        
        // Process performance analytics in background
        const analytics = await shipmentAnalysisService.getShipmentPerformanceAnalytics(userId, filters);
        
        // Update cache with fresh data
        const filtersHash = shipmentAnalysisService['hashFilters'](filters || {});
        const cacheKey = `analytics:shipment-performance:${userId}:${filtersHash}`;
        await redis.setex(cacheKey, 600, JSON.stringify(analytics)); // 10 minutes cache
        
        fastify.log.info(`Performance analytics processed successfully for user ${userId}`);
        
        return {
          success: true,
          userId,
          timestamp,
          filters,
          dataProcessed: true,
        };
      } catch (error) {
        fastify.log.error(`Error processing performance analytics for user ${userId}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 3, // Process 3 jobs concurrently (more resource intensive)
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  // Worker for processing real-time analytics
  const realTimeAnalyticsWorker = new Worker(
    QueueNames.REPORT_GENERATION,
    async (job: Job<ShipmentAnalysisJobData>) => {
      const { userId, timestamp } = job.data;
      
      try {
        fastify.log.info(`Processing real-time analytics for user ${userId}`);
        
        // Process real-time analytics in background
        const analytics = await shipmentAnalysisService.getRealTimeAnalytics(userId);
        
        // Update cache with fresh data
        const cacheKey = `analytics:real-time:${userId}`;
        await redis.setex(cacheKey, 60, JSON.stringify(analytics)); // 1 minute cache
        
        fastify.log.info(`Real-time analytics processed successfully for user ${userId}`);
        
        return {
          success: true,
          userId,
          timestamp,
          dataProcessed: true,
        };
      } catch (error) {
        fastify.log.error(`Error processing real-time analytics for user ${userId}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 10, // Process 10 jobs concurrently (lightweight)
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  // Worker for processing predictive analytics
  const predictiveAnalyticsWorker = new Worker(
    QueueNames.REPORT_GENERATION,
    async (job: Job<ShipmentAnalysisJobData>) => {
      const { userId, timestamp } = job.data;
      
      try {
        fastify.log.info(`Processing predictive analytics for user ${userId}`);
        
        // Process predictive analytics in background
        const analytics = await shipmentAnalysisService.getPredictiveAnalytics(userId);
        
        // Update cache with fresh data
        const cacheKey = `analytics:predictive:${userId}`;
        await redis.setex(cacheKey, 1800, JSON.stringify(analytics)); // 30 minutes cache
        
        fastify.log.info(`Predictive analytics processed successfully for user ${userId}`);
        
        return {
          success: true,
          userId,
          timestamp,
          dataProcessed: true,
        };
      } catch (error) {
        fastify.log.error(`Error processing predictive analytics for user ${userId}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 2, // Process 2 jobs concurrently (very resource intensive)
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  // Worker for cache updates
  const cacheUpdateWorker = new Worker(
    QueueNames.REPORT_GENERATION,
    async (job: Job<CacheUpdateJobData>) => {
      const { userId, cacheKey, data, expiry } = job.data;
      
      try {
        fastify.log.info(`Updating cache for user ${userId}, key: ${cacheKey}`);
        
        // Update cache with provided data
        await redis.setex(cacheKey, expiry, JSON.stringify(data));
        
        fastify.log.info(`Cache updated successfully for user ${userId}, key: ${cacheKey}`);
        
        return {
          success: true,
          userId,
          cacheKey,
          dataUpdated: true,
        };
      } catch (error) {
        fastify.log.error(`Error updating cache for user ${userId}, key: ${cacheKey}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 20, // Process 20 jobs concurrently (very lightweight)
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  // Worker for report generation
  const reportGenerationWorker = new Worker(
    QueueNames.REPORT_GENERATION,
    async (job: Job<ReportGenerationJobData>) => {
      const { userId, reportType, filters, format } = job.data;
      
      try {
        fastify.log.info(`Generating ${reportType} report for user ${userId} in ${format} format`);
        
        let analytics: any;
        
        // Get analytics data based on report type
        switch (reportType) {
          case 'home':
            analytics = await shipmentAnalysisService.getHomePageAnalytics(userId);
            break;
          case 'performance':
            analytics = await shipmentAnalysisService.getShipmentPerformanceAnalytics(userId, filters);
            break;
          case 'realtime':
            analytics = await shipmentAnalysisService.getRealTimeAnalytics(userId);
            break;
          case 'predictive':
            analytics = await shipmentAnalysisService.getPredictiveAnalytics(userId);
            break;
          default:
            throw new Error(`Invalid report type: ${reportType}`);
        }
        
        // Generate report in specified format
        let reportData: any;
        let reportFileName: string;
        
        switch (format) {
          case 'json':
            reportData = JSON.stringify(analytics, null, 2);
            reportFileName = `${reportType}-analytics-${userId}-${Date.now()}.json`;
            break;
          case 'csv':
            reportData = convertToCSV(analytics);
            reportFileName = `${reportType}-analytics-${userId}-${Date.now()}.csv`;
            break;
          case 'pdf':
            reportData = await generatePDFReport(analytics, reportType);
            reportFileName = `${reportType}-analytics-${userId}-${Date.now()}.pdf`;
            break;
          default:
            throw new Error(`Invalid format: ${format}`);
        }
        
        // Store report in Redis or file system
        const reportKey = `reports:${userId}:${reportFileName}`;
        await redis.setex(reportKey, 3600, reportData); // 1 hour cache
        
        fastify.log.info(`Report generated successfully for user ${userId}: ${reportFileName}`);
        
        return {
          success: true,
          userId,
          reportType,
          format,
          reportFileName,
          reportKey,
        };
      } catch (error) {
        fastify.log.error(`Error generating report for user ${userId}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 1, // Process 1 job at a time (resource intensive)
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 25 },
    }
  );

  // Set up job event listeners for monitoring
  [homeAnalyticsWorker, performanceAnalyticsWorker, realTimeAnalyticsWorker, predictiveAnalyticsWorker, cacheUpdateWorker, reportGenerationWorker].forEach(worker => {
    worker.on('completed', (job) => {
      fastify.log.info(`Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      fastify.log.error(`Job ${job?.id} failed:`, err);
    });

    worker.on('error', (err) => {
      fastify.log.error('Worker error:', err);
    });
  });

  fastify.log.info('Shipment analysis queue workers initialized successfully');
}

/**
 * Convert analytics data to CSV format
 */
function convertToCSV(data: any): string {
  // Simple CSV conversion - would need more sophisticated logic for complex nested objects
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }
  
  // For non-array data, convert to simple key-value pairs
  const rows = [];
  for (const [key, value] of Object.entries(data)) {
    rows.push(`${key},${value}`);
  }
  
  return rows.join('\n');
}

/**
 * Generate PDF report (mock implementation)
 */
async function generatePDFReport(data: any, reportType: string): Promise<Buffer> {
  // Mock PDF generation - would use a library like puppeteer or jsPDF in production
  const reportContent = JSON.stringify(data, null, 2);
  return Buffer.from(reportContent, 'utf-8');
}

/**
 * Add a job to the shipment analysis queue
 */
export async function addShipmentAnalysisJob(
  jobType: ShipmentAnalysisJobType,
  data: ShipmentAnalysisJobData | CacheUpdateJobData | ReportGenerationJobData,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
    jobId?: string;
  }
) {
  const { addJob } = await import('@/lib/queue');
  
  return await addJob(
    QueueNames.REPORT_GENERATION,
    jobType,
    data,
    {
      delay: options?.delay || 0,
      priority: options?.priority || 3,
      attempts: options?.attempts || 3,
      jobId: options?.jobId,
    }
  );
}

/**
 * Schedule recurring analytics jobs
 */
export async function scheduleRecurringAnalyticsJobs(fastify: FastifyInstance) {
  const { addRecurringJob } = await import('@/lib/queue');
  
  try {
    // Schedule real-time analytics updates every 5 minutes
    await addRecurringJob(
      QueueNames.REPORT_GENERATION,
      ShipmentAnalysisJobType.PROCESS_REAL_TIME_ANALYTICS,
      { timestamp: new Date().toISOString() },
      '*/5 * * * *', // Every 5 minutes
      {
        priority: 1,
        attempts: 3,
        jobId: 'realtime-analytics-cron',
      }
    );

    // Schedule home analytics updates every 15 minutes
    await addRecurringJob(
      QueueNames.REPORT_GENERATION,
      ShipmentAnalysisJobType.PROCESS_HOME_ANALYTICS,
      { timestamp: new Date().toISOString() },
      '*/15 * * * *', // Every 15 minutes
      {
        priority: 2,
        attempts: 3,
        jobId: 'home-analytics-cron',
      }
    );

    // Schedule performance analytics updates every hour
    await addRecurringJob(
      QueueNames.REPORT_GENERATION,
      ShipmentAnalysisJobType.PROCESS_SHIPMENT_PERFORMANCE,
      { timestamp: new Date().toISOString() },
      '0 * * * *', // Every hour
      {
        priority: 3,
        attempts: 3,
        jobId: 'performance-analytics-cron',
      }
    );

    // Schedule predictive analytics updates every 6 hours
    await addRecurringJob(
      QueueNames.REPORT_GENERATION,
      ShipmentAnalysisJobType.PROCESS_PREDICTIVE_ANALYTICS,
      { timestamp: new Date().toISOString() },
      '0 */6 * * *', // Every 6 hours
      {
        priority: 4,
        attempts: 3,
        jobId: 'predictive-analytics-cron',
      }
    );

    fastify.log.info('Recurring analytics jobs scheduled successfully');
  } catch (error) {
    fastify.log.error('Error scheduling recurring analytics jobs:', error);
    throw error;
  }
} 