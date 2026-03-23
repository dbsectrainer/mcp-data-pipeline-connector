import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";
import type { DataConnector } from "./connectors/base.js";
import { CsvConnector } from "./connectors/csv-connector.js";
import { PostgresConnector } from "./connectors/postgres-connector.js";
import { RestConnector } from "./connectors/rest-connector.js";
import { SheetsConnector } from "./connectors/sheets-connector.js";
import { AirtableConnector } from "./connectors/airtable-connector.js";
import type {
  SourceConfig,
  SourceStatus,
  SourceType,
  TableInfo,
  HealthCheckResult,
} from "./types.js";

export class SourceRegistry {
  private sources: Map<string, DataConnector> = new Map();
  private configs: Map<string, SourceConfig> = new Map();
  private restCacheTtl: number;

  constructor(restCacheTtl = 60) {
    this.restCacheTtl = restCacheTtl;
  }

  /**
   * Create, connect, and register a connector for the given source config.
   * Throws if the source name is already registered.
   */
  async register(config: SourceConfig): Promise<void> {
    if (this.sources.has(config.name)) {
      throw new Error(`Source '${config.name}' is already registered`);
    }

    const connector = this.createConnector(config);
    await connector.connect();
    this.sources.set(config.name, connector);
    this.configs.set(config.name, config);
  }

  /**
   * Retrieve a connector by name, or undefined if not found.
   */
  get(name: string): DataConnector | undefined {
    return this.sources.get(name);
  }

  /**
   * Return the status of all registered sources.
   */
  list(): SourceStatus[] {
    const statuses: SourceStatus[] = [];
    for (const [name, connector] of this.sources.entries()) {
      const config = this.configs.get(name);
      const status: SourceStatus = {
        name,
        type: config!.type,
        status: connector.isConnected() ? "connected" : "disconnected",
      };

      statuses.push(status);
    }
    return statuses;
  }

  /**
   * List tables across all sources, or just the named source.
   */
  async listTables(sourceName?: string): Promise<TableInfo[]> {
    const results: TableInfo[] = [];

    if (sourceName) {
      const connector = this.sources.get(sourceName);
      if (!connector) {
        throw new Error(`Source '${sourceName}' not found`);
      }
      const tables = await connector.listTables();
      for (const table of tables) {
        results.push({ source: sourceName, name: table });
      }
      return results;
    }

    // All sources — gather tables independently so one failure doesn't block others
    for (const [name, connector] of this.sources.entries()) {
      try {
        const tables = await connector.listTables();
        for (const table of tables) {
          results.push({ source: name, name: table });
        }
      } catch (err) {
        process.stderr.write(
          `[source-registry] Failed to list tables for '${name}': ${(err as Error).message}\n`,
        );
      }
    }

    return results;
  }

  /**
   * Run health checks for all sources (or a specific named source).
   */
  async checkHealth(sourceName?: string): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const checkedAt = new Date().toISOString();

    const toCheck: Array<[string, DataConnector]> = sourceName
      ? this.sources.has(sourceName)
        ? [[sourceName, this.sources.get(sourceName)!]]
        : []
      : [...this.sources.entries()];

    for (const [name, connector] of toCheck) {
      const config = this.configs.get(name);
      let healthy = false;
      let error: string | undefined;
      try {
        healthy = await connector.healthCheck();
      } catch (err) {
        healthy = false;
        error = (err as Error).message;
      }
      results.push({
        name,
        type: config!.type as SourceType,
        healthy,
        error,
        checked_at: checkedAt,
      });
    }

    return results;
  }

  /**
   * Return a shared in-memory DuckDB connection with all CSV sources registered as views.
   * Useful for cross-source joins across CSV files.
   */
  async getCrossSourceDb(): Promise<{
    instance: DuckDBInstance;
    connection: DuckDBConnection;
  }> {
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();

    for (const [name, connector] of this.sources.entries()) {
      if (connector.type === "csv" && connector.isConnected()) {
        const csvConnector = connector as CsvConnector;
        const resolvedPath = csvConnector.getResolvedPath();
        const viewName = name.replace(/[^a-zA-Z0-9_]/g, "_");
        try {
          await connection.run(
            `CREATE VIEW "${viewName}" AS SELECT * FROM read_csv_auto('${resolvedPath}')`,
          );
        } catch (err) {
          process.stderr.write(
            `[source-registry] Failed to attach CSV source '${name}' to cross-source DB: ${(err as Error).message}\n`,
          );
        }
      }
    }

    return { instance, connection };
  }

  /**
   * Disconnect all sources and clear the registry.
   */
  async disconnectAll(): Promise<void> {
    for (const [name, connector] of this.sources.entries()) {
      try {
        await connector.disconnect();
      } catch (err) {
        process.stderr.write(
          `[source-registry] Failed to disconnect '${name}': ${(err as Error).message}\n`,
        );
      }
    }
    this.sources.clear();
    this.configs.clear();
  }

  private createConnector(config: SourceConfig): DataConnector {
    switch (config.type) {
      case "csv":
        return new CsvConnector(config);
      case "postgres":
        return new PostgresConnector(config);
      case "rest":
        return new RestConnector(config, this.restCacheTtl);
      case "sheets":
        return new SheetsConnector({
          name: config.name,
          type: "sheets",
          spreadsheet_id: config.spreadsheet_id ?? "",
          sheet_name: config.sheet_name ?? "",
        });
      case "airtable":
        return new AirtableConnector({
          name: config.name,
          type: "airtable",
          base_id: config.base_id ?? "",
          table_name: config.table_name ?? "",
        });
      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = config.type;
        throw new Error(`Unknown source type: ${String(_exhaustive)}`);
      }
    }
  }
}
