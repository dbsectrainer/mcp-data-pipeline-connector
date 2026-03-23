/**
 * Sliding window in-memory rate limiter.
 *
 * @param maxRequests  Maximum number of requests allowed within windowMs.
 * @param windowMs     Duration of the sliding window in milliseconds.
 * @returns Express RequestHandler that returns 429 when the limit is exceeded.
 */
export function createRateLimiter(maxRequests, windowMs) {
    const store = new Map();
    return (req, res, next) => {
        // Identify the caller by API key header or IP address
        const key = req.headers["x-api-key"] ??
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
