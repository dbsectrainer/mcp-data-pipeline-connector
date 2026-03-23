import type { RequestHandler } from "express";
/**
 * Sliding window in-memory rate limiter.
 *
 * @param maxRequests  Maximum number of requests allowed within windowMs.
 * @param windowMs     Duration of the sliding window in milliseconds.
 * @returns Express RequestHandler that returns 429 when the limit is exceeded.
 */
export declare function createRateLimiter(maxRequests: number, windowMs: number): RequestHandler;
