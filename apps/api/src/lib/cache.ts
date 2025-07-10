import { redis } from './redis';
import { prisma } from '@lorrigo/db';
import { APP_CONFIG } from '@/config/app';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix?: string;
  compression?: boolean;
}

export class CacheService {
  private readonly prefix: string;

  constructor(prefix = APP_CONFIG.REDIS.PREFIX) {
    this.prefix = prefix;
  }

  /**
   * Generate full cache key with prefix
   */
  private key(key: string, prefix?: string): string {
    const actualPrefix = prefix || this.prefix;
    return actualPrefix ? `${actualPrefix}:${key}` : key;
  }

  /**
   * Set cache value with TTL
   */
  async set(key: string, value: any, ttl?: number, prefix?: string): Promise<void> {
    const cacheKey = this.key(key, prefix);
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      await redis.setex(cacheKey, ttl, serializedValue);
    } else {
      await redis.set(cacheKey, serializedValue);
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string, prefix?: string): Promise<T | null> {
    const cacheKey = this.key(key, prefix);
    const value = await redis.get(cacheKey);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  /**
   * Delete cache key
   */
  async del(key: string, prefix?: string): Promise<number> {
    const cacheKey = this.key(key, prefix);
    return redis.del(cacheKey);
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string, prefix?: string): Promise<number> {
    const fullPattern = this.key(pattern, prefix);
    const keys = await redis.keys(fullPattern);
    
    if (keys.length === 0) return 0;
    
    return redis.del(...keys);
  }

  /**
   * Check if key exists
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    const cacheKey = this.key(key, prefix);
    return (await redis.exists(cacheKey)) === 1;
  }

  /**
   * Increment counter
   */
  async incr(key: string, prefix?: string): Promise<number> {
    const cacheKey = this.key(key, prefix);
    return redis.incr(cacheKey);
  }

  /**
   * Set expiration for existing key
   */
  async expire(key: string, ttl: number, prefix?: string): Promise<boolean> {
    const cacheKey = this.key(key, prefix);
    return (await redis.expire(cacheKey, ttl)) === 1;
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl = 300,
    prefix?: string
  ): Promise<T> {
    const cached = await this.get<T>(key, prefix);
    
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFunction();
    await this.set(key, fresh, ttl, prefix);
    
    return fresh;
  }

  /**
   * Cache invalidation with tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    const keys: string[] = [];
    
    for (const tag of tags) {
      const tagKeys = await redis.smembers(this.key(`tag:${tag}`));
      keys.push(...tagKeys);
      await redis.del(this.key(`tag:${tag}`));
    }

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Set cache with tags for invalidation
   */
  async setWithTags(
    key: string,
    value: any,
    tags: string[],
    ttl?: number,
    prefix?: string
  ): Promise<void> {
    const cacheKey = this.key(key, prefix);
    
    // Set the main cache entry
    await this.set(key, value, ttl, prefix);
    
    // Add key to each tag set
    for (const tag of tags) {
      await redis.sadd(this.key(`tag:${tag}`), cacheKey);
      if (ttl) {
        await redis.expire(this.key(`tag:${tag}`), ttl);
      }
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    const cacheKeys = keys.map(key => this.key(key, prefix));
    const values = await redis.mget(...cacheKeys);
    
    return values.map(value => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value as T;
      }
    });
  }

  /**
   * Batch set multiple keys
   */
  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>, prefix?: string): Promise<void> {
    for (const { key, value, ttl } of keyValuePairs) {
      await this.set(key, value, ttl, prefix);
    }
  }
}

/**
 * Application-specific cache service with business logic
 */
export class ApplicationCacheService extends CacheService {
  constructor() {
    super();
  }

  // User cache methods
  async getUserData(userId: string): Promise<any> {
    return this.getOrSet(
      `user:${userId}`,
      async () => {
        return prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            is_active: true,
            plan_id: true,
          },
        });
      },
      600 // 10 minutes
    );
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.del(`user:${userId}`);
    await this.delPattern(`user:${userId}:*`);
  }

  // Plan cache methods
  async getPlanData(planId: string): Promise<any> {
    return this.getOrSet(
      `plan:${planId}`,
      async () => {
        return prisma.plan.findUnique({
          where: { id: planId },
          include: {
            plan_courier_pricings: {
              include: {
                courier: true,
                zone_pricing: true,
              },
            },
          },
        });
      },
      1800 // 30 minutes
    );
  }

  async invalidatePlanCache(planId: string): Promise<void> {
    await this.del(`plan:${planId}`);
    await this.delPattern(`plan:*`);
  }

  // Courier rates cache
  async getCourierRates(cacheKey: string): Promise<any> {
    return this.get(`rates:${cacheKey}`);
  }

  async setCourierRates(cacheKey: string, rates: any): Promise<void> {
    await this.set(`rates:${cacheKey}`, rates, 300); // 5 minutes
  }

  async invalidateCourierRates(userId?: string): Promise<void> {
    if (userId) {
      await this.delPattern(`rates:${userId}*`);
    } else {
      await this.delPattern('rates:*');
    }
  }

  // Pincode cache methods
  async getPincodeData(pincode: string): Promise<any> {
    return this.getOrSet(
      `pincode:${pincode}`,
      async () => {
        return prisma.pincode.findUnique({
          where: { pincode },
        });
      },
      86400 // 24 hours
    );
  }

  // Shipment tracking cache
  async getShipmentStatus(awb: string): Promise<any> {
    return this.get(`shipment:status:${awb}`);
  }

  async setShipmentStatus(awb: string, status: any): Promise<void> {
    await this.set(`shipment:status:${awb}`, status, 1800); // 30 minutes
  }

  // Order summary cache
  async getOrderSummary(userId: string, period: string): Promise<any> {
    return this.get(`order:summary:${userId}:${period}`);
  }

  async setOrderSummary(userId: string, period: string, summary: any): Promise<void> {
    await this.set(`order:summary:${userId}:${period}`, summary, 3600); // 1 hour
  }

  // Rate limiting cache
  async checkRateLimit(identifier: string, limit: number, window: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, window);
    }

    const ttl = await redis.ttl(key);
    const resetTime = Date.now() + (ttl * 1000);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetTime,
    };
  }

  // Session cache
  async setSessionData(sessionId: string, data: any): Promise<void> {
    await this.set(`session:${sessionId}`, data, 3600); // 1 hour
  }

  async getSessionData(sessionId: string): Promise<any> {
    return this.get(`session:${sessionId}`);
  }

  async deleteSessionData(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Dashboard metrics cache
  async getDashboardMetrics(userId: string): Promise<any> {
    return this.get(`dashboard:${userId}`);
  }

  async setDashboardMetrics(userId: string, metrics: any): Promise<void> {
    await this.set(`dashboard:${userId}`, metrics, 600); // 10 minutes
  }

  async invalidateDashboardMetrics(userId: string): Promise<void> {
    await this.del(`dashboard:${userId}`);
  }

  // Bulk metrics tracking
  async trackMetric(metricName: string, labels: Record<string, string> = {}): Promise<void> {
    const labelStr = Object.entries(labels).map(([k, v]) => `${k}:${v}`).join(',');
    const key = `metric:${metricName}:${labelStr}`;
    await this.incr(key);
    await this.expire(key, 86400); // 24 hours
  }

  // Lock implementation for critical sections
  async acquireLock(
    resource: string,
    ttl: number = 10,
    retryCount: number = 3,
    retryDelay: number = 100
  ): Promise<string | null> {
    const lockId = `${Date.now()}-${Math.random()}`;
    const lockKey = `lock:${resource}`;

    for (let i = 0; i < retryCount; i++) {
      const result = await redis.set(lockKey, lockId, 'PX', ttl * 1000, 'NX');
      
      if (result === 'OK') {
        return lockId;
      }

      if (i < retryCount - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    return null;
  }

  async releaseLock(resource: string, lockId: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(luaScript, 1, lockKey, lockId);
    return Number(result) === 1;
  }

  // Optimized bulk operations
  async bulkInvalidateCache(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      await redis.ping();
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }
}

// Export singleton instance
export const appCache = new ApplicationCacheService(); 