#!/usr/bin/env node
/**
 * AI/ML Lifecycle MCP Server — Entry Point
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

  process.stderr.write(
    "[ai-ml-lifecycle-mcp] Starting AI/ML Lifecycle MCP server...\n",
  );

  await server.connect(transport);

  process.stderr.write(
    "[ai-ml-lifecycle-mcp] Server running on stdio transport.\n",
  );

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `[ai-ml-lifecycle-mcp] Fatal error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
