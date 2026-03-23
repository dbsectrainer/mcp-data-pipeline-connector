import * as crypto from "node:crypto";
/**
 * Express middleware for API key and JWT authentication.
 *
 * - If MCP_API_KEY is set, validates the X-API-Key header.
 * - If MCP_JWT_SECRET is set, validates the Authorization: Bearer <token> header using HMAC-SHA256.
 * - If neither env var is set, all requests pass through (open access).
 */
export function createAuthMiddleware() {
  return (req, res, next) => {
    const apiKey = process.env["MCP_API_KEY"];
    const jwtSecret = process.env["MCP_JWT_SECRET"];
    // If neither guard is configured, pass through
    if (!apiKey && !jwtSecret) {
      next();
      return;
    }
    // Check API key if configured
    if (apiKey) {
      const providedKey = req.headers["x-api-key"];
      if (!providedKey || providedKey !== apiKey) {
        res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
        return;
      }
    }
    // Check JWT if configured
    if (jwtSecret) {
      const authHeader = req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized: missing Bearer token" });
        return;
      }
      const token = authHeader.slice("Bearer ".length);
      const parts = token.split(".");
      if (parts.length !== 3) {
        res.status(401).json({ error: "Unauthorized: malformed JWT" });
        return;
      }
      const [h, p, s] = parts;
      const expected = crypto
        .createHmac("sha256", jwtSecret)
        .update(`${h}.${p}`)
        .digest("base64url");
      if (expected !== s) {
        res.status(401).json({ error: "Unauthorized: invalid JWT signature" });
        return;
      }
    }
    next();
  };
}
