import { db } from "@/db";

export class CveCache {
  /**
   * Retrieve cached data if valid and unexpired
   */
  static get<T>(key: string): T | null {
    try {
      return db.apiCache.get(key) as T | null;
    } catch {
      return null;
    }
  }

  /**
   * Store data in SQLite cache with TTL in milliseconds
   */
  static set<T>(key: string, source: string, data: T, ttlMs: number): void {
    try {
      db.apiCache.set(key, source, data, ttlMs);
    } catch (err) {
      console.warn(`[CveCache] Failed to cache key ${key}:`, err);
    }
  }
}
