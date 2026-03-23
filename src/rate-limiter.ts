import type { RequestHandler, Request, Response, NextFunction } from "express";

interface WindowEntry {
  timestamps: number[];
}

/**
 * Sliding window in-memory rate limiter.
 *
 * @param maxRequests  Maximum number of requests allowed within windowMs.
 * @param windowMs     Duration of the sliding window in milliseconds.
 * @returns Express RequestHandler that returns 429 when the limit is exceeded.
 */
export function createRateLimiter(maxRequests: number, windowMs: number): RequestHandler {
  const store = new Map<string, WindowEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Identify the caller by API key header or IP address
    const key =
      (req.headers["x-api-key"] as string | undefined) ??
      req.ip ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Evict timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= maxRequests) {
      res.status(429).json({ error: "Rate limit exceeded" });
      return;
    }

    entry.timestamps.push(now);
    next();
  };
}
