import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";
import type { DataConnector } from "./connectors/base.js";
import type { SourceConfig, SourceStatus, TableInfo, HealthCheckResult } from "./types.js";
export declare class SourceRegistry {
  private sources;
  private configs;
  private restCacheTtl;
  constructor(restCacheTtl?: number);
  /**
   * Create, connect, and register a connector for the given source config.
   * Throws if the source name is already registered.
   */
  register(config: SourceConfig): Promise<void>;
  /**
   * Retrieve a connector by name, or undefined if not found.
   */
  get(name: string): DataConnector | undefined;
  /**
   * Return the status of all registered sources.
   */
  list(): SourceStatus[];
  /**
   * List tables across all sources, or just the named source.
   */
  listTables(sourceName?: string): Promise<TableInfo[]>;
  /**
   * Run health checks for all sources (or a specific named source).
   */
  checkHealth(sourceName?: string): Promise<HealthCheckResult[]>;
  /**
   * Return a shared in-memory DuckDB connection with all CSV sources registered as views.
   * Useful for cross-source joins across CSV files.
   */
  getCrossSourceDb(): Promise<{
    instance: DuckDBInstance;
    connection: DuckDBConnection;
  }>;
  /**
   * Disconnect all sources and clear the registry.
   */
  disconnectAll(): Promise<void>;
  private createConnector;
}
