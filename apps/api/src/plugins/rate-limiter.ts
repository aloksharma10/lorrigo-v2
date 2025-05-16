import fastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';
import { redis } from '../lib/redis';
import { APP_CONFIG } from '../config/app';
import { captureException } from '../lib/sentry';

// Define a custom type for the extended FastifyInstance with prisma

export const registerRateLimiter = async (fastify: FastifyInstance) => {
  try {
    // @ts-ignore - Fastify plugin registration type mismatch
    await fastify.register(fastifyRateLimit, {
      max: APP_CONFIG.RATE_LIMIT.MAX,
      timeWindow: APP_CONFIG.RATE_LIMIT.TIME_WINDOW,
      Redis: redis,
      nameSpace: APP_CONFIG.REDIS.PREFIX + 'rate-limit:',
      skipOnError: true, // Do not block requests when Redis is down
      // @ts-ignore - Request type mismatch
      keyGenerator: (request) => {
        // Use IP address as the key by default
        const ipAddress = request.ip;
        
        // If authenticated, use user ID as part of the key for more targeted rate limiting
        // @ts-ignore - User property type mismatch
        if (request.user && request.user.id) {
          // @ts-ignore - User property type mismatch
          return `${ipAddress}:${request.user.id}`;
        }
        
        return ipAddress;
      },
      enableDraftSpec: true,
      addHeadersOnExceeding: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
      },
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true,
      },
      // Log rate limit hits
      // @ts-ignore - Request type mismatch
      onExceeding: (request) => {
        request.log.warn({
          // @ts-ignore - Route options property access
          route: request.routeOptions.url,
          method: request.method,
          ip: request.ip,
          // @ts-ignore - User property type mismatch
          userId: request.user?.id || 'unauthenticated',
        }, 'Rate limit exceeded');
      },
      // Track API request attempts in database on overuse
      // @ts-ignore - Request type and callback signature mismatch
      onExceeded: (request, key) => {
        try {
          // Use void to handle the promise without waiting
          // @ts-ignore - Server property type mismatch
          void request.server.prisma.apiRequest.create({
            data: {
              // @ts-ignore - Route options property access
              endpoint: request.routeOptions.url,
              method: request.method,
              ipAddress: request.ip,
              // @ts-ignore - User property type mismatch
              userId: request.user?.id,
              userAgent: request.headers['user-agent'],
              responseStatus: 429, // Too Many Requests
            },
          });
        } catch (error) {
          captureException(error as Error, {
            ip: request.ip,
            // @ts-ignore - Route options property access
            route: request.routeOptions.url,
          });
        }
      },
    });

    fastify.log.info('Rate limiter registered');
  } catch (error) {
    fastify.log.error('Failed to register rate limiter plugin');
    captureException(error as Error);
  }
}; 