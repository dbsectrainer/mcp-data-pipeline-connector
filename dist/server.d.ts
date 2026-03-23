import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SourceRegistry } from "./source-registry.js";
export interface ServerOptions {
  readOnly: boolean;
  maxRows: number;
  sourcesConfigPath?: string;
  restCacheTtl?: number;
}
export declare function createServer(options: ServerOptions): {
  server: Server;
  registry: SourceRegistry;
  activeRequests: Map<string | number, AbortController>;
};
/**
 * Auto-load sources from the default config path (or custom path) on startup.
 */
export declare function autoLoadSources(
  registry: SourceRegistry,
  configPath?: string,
): Promise<void>;
