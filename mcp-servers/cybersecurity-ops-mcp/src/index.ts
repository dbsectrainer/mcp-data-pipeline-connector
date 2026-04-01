#!/usr/bin/env node
/**
 * Cybersecurity Operations MCP — Entry Point
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
    "[cybersecurity-ops-mcp] Starting Cybersecurity Operations MCP server...\n",
  );

  await server.connect(transport);

  process.stderr.write(
    "[cybersecurity-ops-mcp] Server running on stdio transport.\n",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `[cybersecurity-ops-mcp] Fatal error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
