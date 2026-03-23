import type { RequestHandler } from "express";
/**
 * Express middleware for API key and JWT authentication.
 *
 * - If MCP_API_KEY is set, validates the X-API-Key header.
 * - If MCP_JWT_SECRET is set, validates the Authorization: Bearer <token> header using HMAC-SHA256.
 * - If neither env var is set, all requests pass through (open access).
 */
export declare function createAuthMiddleware(): RequestHandler;
