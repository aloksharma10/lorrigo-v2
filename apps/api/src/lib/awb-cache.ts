import { redis } from './redis';
import { ChargeType } from '@lorrigo/db';

const PREFIX = 'awb:charges';

function buildKey(awb: string): string {
  return `${PREFIX}:${awb}`;
}

/**
 * Check if a specific charge type has already been applied to an AWB.
 */
export async function hasAppliedCharge(awb: string, charge: ChargeType | string): Promise<boolean> {
  const key = buildKey(awb);
  return (await redis.sismember(key, charge)) === 1;
}

/**
 * Mark a charge type as applied for an AWB. Uses a Redis Set for idempotency.
 * Optionally set an expiry (e.g., 90 days) to keep Redis lean.
 */
export async function addAppliedCharge(
  awb: string,
  charge: ChargeType | string,
  ttlSeconds: number = 60 * 60 * 24 * 90 // 90 days
): Promise<void> {
  const key = buildKey(awb);
  await redis.sadd(key, charge);
  await redis.expire(key, ttlSeconds);
}

/**
 * Fetch all applied charge types for an AWB.
 */
export async function getAppliedCharges(awb: string): Promise<string[]> {
  const key = buildKey(awb);
  return redis.smembers(key);
} 