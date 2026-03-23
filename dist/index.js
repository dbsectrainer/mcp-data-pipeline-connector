#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createServer, autoLoadSources } from "./server.js";
import { startHttpServer } from "./http-server.js";
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("mcp-data-pipeline-connector")
    .usage("$0 [options]")
    .option("read-only", {
      type: "boolean",
      default: true,
      description: "Reject any SQL statements that are not SELECT queries. Default: true.",
    })
    .option("max-rows", {
      type: "number",
      default: 1000,
      description: "Maximum number of rows returned by a single query call.",
    })
    .option("config", {
      alias: "sources-config",
      type: "string",
      description: "Path to the YAML file defining data sources. Default: ~/.mcp/data-sources.yaml",
    })
    .option("rest-cache-ttl", {
      type: "number",
      default: 60,
      description:
        "Time-to-live in seconds for cached REST API responses. Set to 0 to disable caching. Default: 60.",
    })
    .option("http-port", {
      type: "number",
      default: 0,
      description:
        "Port to expose the MCP server over Streamable HTTP transport (MCP 2025 spec). " +
        "Set to 0 (default) to disable HTTP transport and use stdio only.",
    })
    .help()
    .parseAsync();
  const readOnly = argv["read-only"];
  const maxRows = argv["max-rows"];
  const configPath = argv["config"];
  const restCacheTtl = argv["rest-cache-ttl"];
  const httpPort = argv["http-port"];
  process.stderr.write(
    `[mcp-data-pipeline-connector] Starting (read-only=${readOnly}, max-rows=${maxRows}, rest-cache-ttl=${restCacheTtl}s)\n`,
  );
  const serverOptions = {
    readOnly,
    maxRows,
    sourcesConfigPath: configPath,
    restCacheTtl,
  };
  if (httpPort > 0) {
    // HTTP (Streamable HTTP) transport mode
    process.stderr.write(
      `[mcp-data-pipeline-connector] Starting HTTP transport on port ${httpPort}\n`,
    );
    const { close } = await startHttpServer(serverOptions, httpPort);
    process.stderr.write("[mcp-data-pipeline-connector] Ready (HTTP)\n");
    const shutdown = async () => {
      process.stderr.write("[mcp-data-pipeline-connector] Shutting down...\n");
      close();
      process.exit(0);
    };
    process.on("SIGINT", () => void shutdown());
    process.on("SIGTERM", () => void shutdown());
  } else {
    // Default: stdio transport
    const { server, registry } = createServer(serverOptions);
    // Auto-load sources from config file if present
    await autoLoadSources(registry, configPath);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("[mcp-data-pipeline-connector] Ready\n");
    // Graceful shutdown
    const shutdown = async () => {
      process.stderr.write("[mcp-data-pipeline-connector] Shutting down...\n");
      await registry.disconnectAll();
      await server.close();
      process.exit(0);
    };
    process.on("SIGINT", () => void shutdown());
    process.on("SIGTERM", () => void shutdown());
  }
}
main().catch((err) => {
  process.stderr.write(`[mcp-data-pipeline-connector] Fatal error: ${err.message}\n`);
  process.exit(1);
});
