interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheMap = new Map<string, CacheEntry<any>>();

/**
 * Retrieves an item from the cache.
 * Returns null if missing or expired.
 */
export function getCached<T>(key: string): T | null {
  const entry = cacheMap.get(key);
  if (!entry) return null;

  // Invalidate if expired
  if (Date.now() > entry.expiresAt) {
    cacheMap.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Stores an item in the cache with a Time-To-Live.
 */
export function setCached<T>(key: string, value: T, ttlSeconds: number = 60): void {
  cacheMap.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

/**
 * Invalidates cache keys that match the given string prefix or regular expression.
 */
export function invalidateCache(pattern: string | RegExp): void {
  const keysCountBefore = cacheMap.size;
  for (const key of cacheMap.keys()) {
    const isMatch = typeof pattern === 'string' 
      ? key.startsWith(pattern) || key.includes(pattern)
      : pattern.test(key);

    if (isMatch) {
      cacheMap.delete(key);
    }
  }
  
  const deletedCount = keysCountBefore - cacheMap.size;
  if (deletedCount > 0) {
    console.log(`Cache Invalidation: Purged ${deletedCount} key(s) matching pattern [${pattern}]`);
  }
}
