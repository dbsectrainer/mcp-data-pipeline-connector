#!/usr/bin/env node
/**
 * Knowledge Base MCP Server — Entry Point
 * BE EASY ENTERPRISES LLC
 *
 * Starts the MCP server over stdio transport.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  process.stderr.write(
    "[knowledge-base-mcp] Starting Knowledge Base MCP server...\n",
  );

  await server.connect(transport);

  process.stderr.write(
    "[knowledge-base-mcp] Server running on stdio transport.\n",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `[knowledge-base-mcp] Fatal error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
