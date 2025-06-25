import { FastifyInstance } from 'fastify';
import { prisma } from '@lorrigo/db';
import { redis } from '@/lib/redis';
import { ShipmentBucketManager } from '@lorrigo/utils';

/**
 * Service for managing courier status bucket mappings
 * Implements database-first approach with Redis caching
 */
export class BucketMappingService {
  private fastify: FastifyInstance;
  private readonly CACHE_PREFIX = 'bucket_mapping:';
  private readonly CACHE_TTL = 604800; // 1 week in seconds
  private readonly ALL_MAPPINGS_KEY = 'all_courier_mappings';

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Get bucket mapping for a specific courier status
   * First checks Redis cache, then falls back to database
   * @param courierName Courier name (e.g., 'SHIPROCKET', 'DELHIVERY')
   * @param statusCode Status code from courier
   * @returns Bucket number or null if not found
   */
  public async getBucketMapping(
    courierName: string,
    statusCode: string
  ): Promise<number | null> {
    try {
      const normalizedCourier = courierName.toUpperCase().trim();
      const normalizedStatus = statusCode.toUpperCase().trim();
      const cacheKey = `${this.CACHE_PREFIX}${normalizedCourier}:${normalizedStatus}`;

      // Try to get from Redis cache first
      const cachedBucket = await redis.get(cacheKey);
      if (cachedBucket !== null) {
        const bucket = parseInt(cachedBucket, 10);
        if (!isNaN(bucket)) {
          return bucket;
        }
      }

      // If not in cache, fetch from database
      const mapping = await prisma.courierStatusMapping.findUnique({
        where: {
          courier_name_status_code: {
            courier_name: normalizedCourier,
            status_code: normalizedStatus,
          },
        },
        select: {
          bucket: true,
          is_active: true,
          is_mapped: true,
        },
      });

      if (mapping && mapping.is_active && mapping.is_mapped) {
        // Cache the result with 1 week TTL
        await redis.set(cacheKey, mapping.bucket.toString(), 'EX', this.CACHE_TTL);
        return mapping.bucket;
      }

      // If mapping not found, log as unmapped status for admin review
      await this.logUnmappedStatus(normalizedCourier, normalizedStatus);

      // Cache null result with shorter TTL to avoid repeated DB queries
      await redis.set(cacheKey, 'null', 'EX', 3600); // 1 hour for null results

      return null;
    } catch (error) {
      console.error('Error getting bucket mapping:', error);
      return null;
    }
  }

  /**
   * Get all mappings for a specific courier and cache them
   * @param courierName Courier name
   * @returns Map of status codes to bucket numbers
   */
  public async getCourierMappings(courierName: string): Promise<Map<string, number>> {
    try {
      const normalizedCourier = courierName.toUpperCase().trim();
      const mappings = new Map<string, number>();

      // Get all mappings for this courier from database
      const courierMappings = await prisma.courierStatusMapping.findMany({
        where: {
          courier_name: normalizedCourier,
          is_active: true,
          is_mapped: true,
        },
        select: {
          status_code: true,
          bucket: true,
        },
      });

      // Cache each mapping individually and build the map
      for (const mapping of courierMappings) {
        const cacheKey = `${this.CACHE_PREFIX}${normalizedCourier}:${mapping.status_code}`;
        await redis.set(cacheKey, mapping.bucket.toString(), 'EX', this.CACHE_TTL);
        mappings.set(mapping.status_code, mapping.bucket);
      }

      return mappings;
    } catch (error) {
      console.error(`Error getting courier mappings for ${courierName}:`, error);
      return new Map();
    }
  }

  /**
   * Warm up the cache with all courier status mappings
   * This is useful during application startup or after cache invalidation
   */
  public async warmUpCache(): Promise<void> {
    try {
      console.log('Warming up bucket mapping cache...');

      const allMappings = await prisma.courierStatusMapping.findMany({
        where: {
          is_active: true,
          is_mapped: true,
        },
        select: {
          courier_name: true,
          status_code: true,
          bucket: true,
        },
      });

      // Use Redis pipeline for better performance
      const pipeline = redis.pipeline();

      for (const mapping of allMappings) {
        const cacheKey = `${this.CACHE_PREFIX}${mapping.courier_name}:${mapping.status_code}`;
        pipeline.set(cacheKey, mapping.bucket.toString(), 'EX', this.CACHE_TTL);
      }

      await pipeline.exec();

      console.log(`Cached ${allMappings.length} bucket mappings`);
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }

  /**
   * Invalidate all bucket mapping cache
   * This should be called when admin updates any courier status mapping
   */
  public async invalidateAllCache(): Promise<void> {
    try {
      console.log('Invalidating all bucket mapping cache...');

      // Get all cache keys with our prefix
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);

      if (keys.length > 0) {
        // Use pipeline for better performance
        const pipeline = redis.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();

        console.log(`Invalidated ${keys.length} cached bucket mappings`);
      }

      // Warm up cache again immediately
      await this.warmUpCache();
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Invalidate cache for a specific courier
   * @param courierName Courier name
   */
  public async invalidateCourierCache(courierName: string): Promise<void> {
    try {
      const normalizedCourier = courierName.toUpperCase().trim();
      const pattern = `${this.CACHE_PREFIX}${normalizedCourier}:*`;

      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();

        console.log(`Invalidated ${keys.length} cached mappings for ${courierName}`);
      }

      // Reload mappings for this courier
      await this.getCourierMappings(normalizedCourier);
    } catch (error) {
      console.error(`Error invalidating cache for ${courierName}:`, error);
    }
  }

  /**
   * Update or create a bucket mapping
   * This will automatically invalidate relevant cache entries
   * @param courierName Courier name
   * @param statusCode Status code
   * @param bucket Bucket number
   * @param statusLabel Optional status label
   * @param statusDescription Optional status description
   */
  public async updateBucketMapping(
    courierName: string,
    statusCode: string,
    bucket: number,
    statusLabel?: string,
    statusDescription?: string
  ): Promise<boolean> {
    try {
      const normalizedCourier = courierName.toUpperCase().trim();
      const normalizedStatus = statusCode.toUpperCase().trim();

      await prisma.courierStatusMapping.upsert({
        where: {
          courier_name_status_code: {
            courier_name: normalizedCourier,
            status_code: normalizedStatus,
          },
        },
        update: {
          bucket,
          status_label: statusLabel || undefined,
          status_description: statusDescription || undefined,
          is_mapped: true,
          updated_at: new Date(),
        },
        create: {
          courier_name: normalizedCourier,
          status_code: normalizedStatus,
          bucket,
          status_label: statusLabel || normalizedStatus,
          status_description: statusDescription || `${normalizedStatus} status`,
          is_active: true,
          is_mapped: true,
        },
      });

      // Invalidate specific cache entry
      const cacheKey = `${this.CACHE_PREFIX}${normalizedCourier}:${normalizedStatus}`;
      await redis.del(cacheKey);

      // Cache the new mapping
      await redis.set(cacheKey, bucket.toString(), 'EX', this.CACHE_TTL);

      console.log(`Updated bucket mapping: ${normalizedCourier}:${normalizedStatus} -> ${bucket}`);
      return true;
    } catch (error) {
      console.error('Error updating bucket mapping:', error);
      return false;
    }
  }

  /**
   * Log unmapped status for admin review
   * @param courierName Courier name
   * @param statusCode Status code
   */
  private async logUnmappedStatus(courierName: string, statusCode: string): Promise<void> {
    try {
      await prisma.unmappedCourierStatus.upsert({
        where: {
          courier_status_code: {
            courier: courierName,
            status_code: statusCode,
          },
        },
        update: {
          count: {
            increment: 1,
          },
          last_seen: new Date(),
        },
        create: {
          courier: courierName,
          status_code: statusCode,
          status_label: statusCode, // Use status_code as label initially
          count: 1,
          last_seen: new Date(),
        },
      });
    } catch (error) {
      console.error('Error logging unmapped status:', error);
    }
  }

  /**
   * Get unmapped statuses for admin review
   * @param courierName Optional courier filter
   * @param limit Maximum number of results
   * @returns Array of unmapped statuses
   */
  public async getUnmappedStatuses(
    courierName?: string,
    limit: number = 100
  ): Promise<Array<{
    courier: string;
    status_code: string;
    status_label: string | null;
    count: number;
    last_seen: Date;
  }>> {
    try {
      const where = courierName
        ? { courier: courierName.toUpperCase().trim() }
        : {};

      return await prisma.unmappedCourierStatus.findMany({
        where,
        select: {
          courier: true,
          status_code: true,
          status_label: true,
          count: true,
          last_seen: true,
        },
        orderBy: [
          { count: 'desc' },
          { last_seen: 'desc' },
        ],
        take: limit,
      });
    } catch (error) {
      console.error('Error getting unmapped statuses:', error);
      return [];
    }
  }

  /**
   * Enhanced bucket detection that tries multiple approaches
   * 1. Check Redis cache
   * 2. Check database mapping
   * 3. Fall back to keyword detection from ShipmentBucketManager
   * @param status Status text
   * @param statusCode Status code
   * @param courierName Courier name
   * @returns Bucket number
   */
  public async detectBucket(
    status: string,
    statusCode: string,
    courierName: string
  ): Promise<number> {
    try {
      // First try exact mapping
      const exactBucket = await this.getBucketMapping(courierName, statusCode);
      if (exactBucket !== null) {
        return exactBucket;
      }

      // Try mapping with status text if different from statusCode
      if (status && status !== statusCode) {
        const statusBucket = await this.getBucketMapping(courierName, status);
        if (statusBucket !== null) {
          return statusBucket;
        }
      }

      // Fall back to keyword-based detection
      const fallbackBucket = ShipmentBucketManager.detectBucketFromVendorStatus(
        status || '',
        statusCode || '',
        courierName
      );

      // If we got a meaningful bucket from keyword detection, consider caching it
      // But don't auto-cache as admin should review and approve mappings
      if (fallbackBucket > 0) {
        console.log(`Keyword detection found bucket ${fallbackBucket} for ${courierName}:${statusCode}`);
      }

      return fallbackBucket;
    } catch (error) {
      console.error('Error detecting bucket:', error);
      // Return a default bucket
      return 0; // NEW
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  public async getCacheStats(): Promise<{
    totalCachedMappings: number;
    courierStats: Array<{
      courier: string;
      cachedMappings: number;
    }>;
  }> {
    try {
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
      const courierStats = new Map<string, number>();

      keys.forEach(key => {
        const parts = key.replace(this.CACHE_PREFIX, '').split(':');
        if (parts.length >= 1 && parts[0]) {
          const courier = parts[0];
          courierStats.set(courier, (courierStats.get(courier) || 0) + 1);
        }
      });

      return {
        totalCachedMappings: keys.length,
        courierStats: Array.from(courierStats.entries()).map(([courier, count]) => ({
          courier,
          cachedMappings: count,
        })),
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalCachedMappings: 0,
        courierStats: [],
      };
    }
  }

  /**
   * Flush all bucket cache
   */
  public async flushAllCache(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        this.fastify.log.info(`Flushed ${keys.length} bucket mapping cache keys`);
      }

      // Also flush the all mappings cache
      await redis.del(this.ALL_MAPPINGS_KEY);
    } catch (error) {
      this.fastify.log.error('Error flushing all cache:', error);
      throw error;
    }
  }

  /**
   * Get all bucket mappings with optional filtering
   * @param filters Optional filters
   * @returns Array of courier status mappings
   */
  public async getAllMappings(filters?: {
    courier_name?: string;
    is_mapped?: boolean;
    bucket?: number;
  }): Promise<any[]> {
    try {
      const whereClause: any = {};

      if (filters?.courier_name) {
        whereClause.courier_name = filters.courier_name.toUpperCase();
      }

      if (filters?.is_mapped !== undefined) {
        whereClause.is_mapped = filters.is_mapped;
      }

      if (filters?.bucket !== undefined) {
        whereClause.bucket = filters.bucket;
      }

      const mappings = await prisma.courierStatusMapping.findMany({
        where: whereClause,
        orderBy: [
          { courier_name: 'asc' },
          { status_code: 'asc' },
        ],
      });

      return mappings;
    } catch (error) {
      this.fastify.log.error('Error getting all mappings:', error);
      throw error;
    }
  }

  /**
   * Remove bucket mapping (unmap a status)
   * @param courierName Courier name
   * @param statusCode Status code
   */
  public async removeBucketMapping(courierName: string, statusCode: string): Promise<void> {
    try {
      await prisma.courierStatusMapping.update({
        where: {
          courier_name_status_code: {
            courier_name: courierName.toUpperCase(),
            status_code: statusCode,
          },
        },
        data: {
          is_mapped: false,
          updated_at: new Date(),
        },
      });

      // Invalidate cache for this courier
      await this.invalidateCourierCache(courierName.toUpperCase());

      this.fastify.log.info(`Removed bucket mapping for ${courierName}:${statusCode}`);
    } catch (error) {
      this.fastify.log.error('Error removing bucket mapping:', error);
      throw error;
    }
  }
} 