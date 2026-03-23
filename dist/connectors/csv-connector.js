import { DuckDBInstance } from "@duckdb/node-api";
import { resolve } from "node:path";
import { existsSync, accessSync, constants } from "node:fs";
import { normalizeType } from "./base.js";
/**
 * Check if the SQL already contains a LIMIT clause (case-insensitive).
 */
function hasLimitClause(sql) {
  return /\bLIMIT\b/i.test(sql);
}
export class CsvConnector {
  name;
  type = "csv";
  config;
  instance = null;
  connection = null;
  connected = false;
  resolvedPath;
  viewName;
  isJsonFile;
  constructor(config) {
    if (!config.path) {
      throw new Error(`CSV connector '${config.name}' requires a path`);
    }
    this.name = config.name;
    this.config = config;
    // Resolve ~ to home directory
    this.resolvedPath = config.path.startsWith("~")
      ? resolve(process.env["HOME"] ?? "/tmp", config.path.slice(2))
      : resolve(config.path);
    // Sanitize name for use as a SQL identifier
    this.viewName = config.name.replace(/[^a-zA-Z0-9_]/g, "_");
    this.isJsonFile =
      this.resolvedPath.toLowerCase().endsWith(".json") ||
      this.resolvedPath.toLowerCase().endsWith(".jsonl");
  }
  async connect() {
    try {
      this.instance = await DuckDBInstance.create(":memory:");
      this.connection = await this.instance.connect();
      const readFn = this.isJsonFile ? "read_json_auto" : "read_csv_auto";
      await this.connection.run(
        `CREATE VIEW "${this.viewName}" AS SELECT * FROM ${readFn}('${this.resolvedPath}')`,
      );
      this.connected = true;
      process.stderr.write(`[csv-connector] Connected '${this.name}' -> ${this.resolvedPath}\n`);
    } catch (err) {
      this.connected = false;
      throw new Error(`Failed to connect CSV source '${this.name}': ${err.message}`);
    }
  }
  async disconnect() {
    try {
      if (this.connection) {
        this.connection.closeSync();
        this.connection = null;
      }
    } catch {
      // best-effort
    }
    this.connected = false;
  }
  isConnected() {
    return this.connected;
  }
  async healthCheck() {
    try {
      if (!existsSync(this.resolvedPath)) {
        return false;
      }
      accessSync(this.resolvedPath, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
  async listTables() {
    return [this.viewName];
  }
  async getSchema(tableName) {
    if (!this.connection) throw new Error(`Source '${this.name}' is not connected`);
    const result = await this.connection.run(`DESCRIBE SELECT * FROM "${tableName}"`);
    const rows = await result.getRows();
    return rows.map((row) => {
      const rawType = String(row[1]);
      const norm = normalizeType(rawType);
      return {
        name: String(row[0]),
        type: norm,
        normalized_type: norm,
      };
    });
  }
  async query(sql, maxRows) {
    if (!this.connection) throw new Error(`Source '${this.name}' is not connected`);
    const limitedSql = hasLimitClause(sql) ? sql : `${sql} LIMIT ${maxRows + 1}`;
    const result = await this.connection.run(limitedSql);
    const columnNames = result.columnNames();
    const allRows = await result.getRows();
    const truncated = allRows.length > maxRows;
    const slicedRows = truncated ? allRows.slice(0, maxRows) : allRows;
    const rows = slicedRows.map((row) => {
      const record = {};
      columnNames.forEach((col, i) => {
        const v = row[i];
        record[col] = typeof v === "bigint" ? Number(v) : v;
      });
      return record;
    });
    return {
      columns: columnNames,
      rows,
      rowCount: rows.length,
      truncated,
    };
  }
  /**
   * Expose the resolved file path for use in cross-source DuckDB queries.
   */
  getResolvedPath() {
    return this.resolvedPath;
  }
}
