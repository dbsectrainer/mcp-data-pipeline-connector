import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { ServerOptions } from "./server.js";
/**
 * Start an HTTP server exposing the MCP server via Streamable HTTP transport (MCP 2025 spec).
 * This allows a shared data connector to be used by multiple clients over HTTP.
 *
 * @param options   MCP server options (readOnly, maxRows, etc.)
 * @param port      TCP port to listen on
 * @returns         Promise that resolves once the server is listening
 */
export declare function startHttpServer(
  options: ServerOptions,
  port: number,
): Promise<{
  close: () => void;
}>;
export type { Server };
