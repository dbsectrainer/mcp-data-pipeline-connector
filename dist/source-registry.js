import { DuckDBInstance } from "@duckdb/node-api";
import { CsvConnector } from "./connectors/csv-connector.js";
import { PostgresConnector } from "./connectors/postgres-connector.js";
import { RestConnector } from "./connectors/rest-connector.js";
import { SheetsConnector } from "./connectors/sheets-connector.js";
import { AirtableConnector } from "./connectors/airtable-connector.js";
export class SourceRegistry {
  sources = new Map();
  configs = new Map();
  restCacheTtl;
  constructor(restCacheTtl = 60) {
    this.restCacheTtl = restCacheTtl;
  }
  /**
   * Create, connect, and register a connector for the given source config.
   * Throws if the source name is already registered.
   */
  async register(config) {
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
  get(name) {
    return this.sources.get(name);
  }
  /**
   * Return the status of all registered sources.
   */
  list() {
    const statuses = [];
    for (const [name, connector] of this.sources.entries()) {
      const config = this.configs.get(name);
      const status = {
        name,
        type: config.type,
        status: connector.isConnected() ? "connected" : "disconnected",
      };
      statuses.push(status);
    }
    return statuses;
  }
  /**
   * List tables across all sources, or just the named source.
   */
  async listTables(sourceName) {
    const results = [];
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
          `[source-registry] Failed to list tables for '${name}': ${err.message}\n`,
        );
      }
    }
    return results;
  }
  /**
   * Run health checks for all sources (or a specific named source).
   */
  async checkHealth(sourceName) {
    const results = [];
    const checkedAt = new Date().toISOString();
    const toCheck = sourceName
      ? this.sources.has(sourceName)
        ? [[sourceName, this.sources.get(sourceName)]]
        : []
      : [...this.sources.entries()];
    for (const [name, connector] of toCheck) {
      const config = this.configs.get(name);
      let healthy = false;
      let error;
      try {
        healthy = await connector.healthCheck();
      } catch (err) {
        healthy = false;
        error = err.message;
      }
      results.push({
        name,
        type: config.type,
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
  async getCrossSourceDb() {
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();
    for (const [name, connector] of this.sources.entries()) {
      if (connector.type === "csv" && connector.isConnected()) {
        const csvConnector = connector;
        const resolvedPath = csvConnector.getResolvedPath();
        const viewName = name.replace(/[^a-zA-Z0-9_]/g, "_");
        try {
          await connection.run(
            `CREATE VIEW "${viewName}" AS SELECT * FROM read_csv_auto('${resolvedPath}')`,
          );
        } catch (err) {
          process.stderr.write(
            `[source-registry] Failed to attach CSV source '${name}' to cross-source DB: ${err.message}\n`,
          );
        }
      }
    }
    return { instance, connection };
  }
  /**
   * Disconnect all sources and clear the registry.
   */
  async disconnectAll() {
    for (const [name, connector] of this.sources.entries()) {
      try {
        await connector.disconnect();
      } catch (err) {
        process.stderr.write(`[source-registry] Failed to disconnect '${name}': ${err.message}\n`);
      }
    }
    this.sources.clear();
    this.configs.clear();
  }
  createConnector(config) {
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
        const _exhaustive = config.type;
        throw new Error(`Unknown source type: ${String(_exhaustive)}`);
      }
    }
  }
}
