import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { ServerOptions } from "./server.js";
import { createServer, autoLoadSources } from "./server.js";
import { createAuthMiddleware } from "./auth.js";
import { createRateLimiter } from "./rate-limiter.js";

/**
 * Start an HTTP server exposing the MCP server via Streamable HTTP transport (MCP 2025 spec).
 * This allows a shared data connector to be used by multiple clients over HTTP.
 *
 * @param options   MCP server options (readOnly, maxRows, etc.)
 * @param port      TCP port to listen on
 * @returns         Promise that resolves once the server is listening
 */
export async function startHttpServer(
  options: ServerOptions,
  port: number,
): Promise<{ close: () => void }> {
  const { server: mcpServer, registry } = createServer(options);

  // Auto-load sources from config file if present
  await autoLoadSources(registry, options.sourcesConfigPath);

  const app = express();
  app.use(express.json());

  // Auth and rate limiting guard the /mcp route
  app.use(createAuthMiddleware());
  app.use(createRateLimiter(60, 60000));

  // Stateless transport — each request gets its own transport instance.
  // Stateless mode is appropriate for shared / team deployments where clients
  // do not maintain long-lived session connections.
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal server error",
          message: (err as Error).message,
        });
      }
    }
  });

  app.get("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal server error",
          message: (err as Error).message,
        });
      }
    }
  });

  app.delete("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal server error",
          message: (err as Error).message,
        });
      }
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return new Promise((resolve) => {
    const httpServer = app.listen(port, () => {
      process.stderr.write(`[mcp-data-pipeline-connector] HTTP server listening on port ${port}\n`);
      resolve({
        close: () => {
          httpServer.close();
          void registry.disconnectAll();
          void mcpServer.close();
        },
      });
    });
  });
}

export type { Server };
