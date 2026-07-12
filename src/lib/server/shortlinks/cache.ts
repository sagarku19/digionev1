// Short-TTL in-process cache. Per-lambda + ephemeral in serverless — it only
// saves DB reads on hot links; 302s stay no-store. Stores positive AND
// negative (unknown-code) entries. `now` is injectable for tests.

interface CacheEntry<T> { value: T; expiresAt: number; }

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  constructor(private ttlMs: number, private now: () => number = Date.now) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (this.now() >= hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }
}
