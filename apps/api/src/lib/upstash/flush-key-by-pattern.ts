import redis from '../redis';

export async function flushKeysByPattern(pattern: string): Promise<void> {
  const BATCH_SIZE = 50;
  let cursor = '0';
  const keysToDelete: string[] = [];

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;
    keysToDelete.push(...keys);
  } while (cursor !== '0');

  for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
    const batch = keysToDelete.slice(i, i + BATCH_SIZE);
    await redis.del(...batch);
  }

  // if (keysToDelete.length > 0) {
  //    console.log(`Flushed ${keysToDelete.length} keys for pattern: ${pattern}`);
  // }
}
