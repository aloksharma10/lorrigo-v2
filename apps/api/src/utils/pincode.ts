import { redis } from '@/lib/redis';
import { prisma } from '@lorrigo/db';
import { captureException } from '@/lib/sentry';

export interface PincodeDetails {
  city: string;
  state: string;
  [key: string]: any;
}

export async function getPincodeDetails(pincode: number): Promise<PincodeDetails | null> {
  try {
    // Try to get from cache
    const cached = await redis.get(`pincode:${pincode}`);
    if (cached) return JSON.parse(cached);

    // If not in cache, fetch from database
    const details = await prisma.pincode.findUnique({
      where: { pincode: pincode },
    });

    if (details) {
      const data = {
        city: details.city,
        state: details.state,
        pincode: details.pincode.toString(),
      };
      // Cache the result for 30 days
      await redis.setex(`pincode:${pincode}`, 30 * 24 * 60 * 60, JSON.stringify(data));
      return data;
    }

    return null;
  } catch (error) {
    captureException(error as Error);
    return null;
  }
} 