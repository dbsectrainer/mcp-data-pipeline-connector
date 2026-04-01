#!/usr/bin/env node
/**
 * Compliance & Audit MCP Server — Entry Point
 * BE EASY ENTERPRISES LLC
 *
 * Starts the MCP server over stdio transport for integration
 * with AI assistants and developer tooling.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error(
    "Fatal: failed to start Compliance & Audit MCP server",
    error,
  );
  process.exit(1);
});
