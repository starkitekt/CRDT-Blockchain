// src/lib/rateLimit.ts

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS   = 5;       // max failed attempts
const WINDOW_MS      = 15 * 60 * 1000; // 15 minute sliding window
const BLOCK_DURATION = 15 * 60; // seconds to tell client to wait

export function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entry = store.get(ip);

  // No entry yet — first request, allow
  if (!entry) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // Window expired — reset counter
  if (now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // Within window — check count
  if (entry.count >= MAX_ATTEMPTS) {
    const elapsed = now - entry.windowStart;
    const retryAfterSeconds = Math.ceil((WINDOW_MS - elapsed) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // Increment and allow
  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(ip: string): void {
  store.delete(ip);
}