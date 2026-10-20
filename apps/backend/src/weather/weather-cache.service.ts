import { Injectable } from "@nestjs/common";

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const MAXIMUM_CACHE_ENTRIES = 500;

@Injectable()
export class WeatherCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    this.removeExpiredEntries(Date.now());
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMilliseconds: number): void {
    const now = Date.now();
    this.removeExpiredEntries(now);
    this.entries.delete(key);

    while (this.entries.size >= MAXIMUM_CACHE_ENTRIES) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.entries.delete(oldestKey);
    }

    this.entries.set(key, {
      expiresAt: now + ttlMilliseconds,
      value,
    });
  }

  private removeExpiredEntries(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}
