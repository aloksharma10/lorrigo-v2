import Redis from 'ioredis';
import { APP_CONFIG } from '../config/app';

// Create a Redis client
export const redis = new Redis({
  host: APP_CONFIG.REDIS.HOST,
  port: APP_CONFIG.REDIS.PORT,
  password: APP_CONFIG.REDIS.PASSWORD,
});

// Log Redis connection events
redis.on('connect', () => {
  console.log('Redis client connected');
});

redis.on('error', (err) => {
  console.error('Redis client error:', err);
});

// Export Redis client
export default redis; 