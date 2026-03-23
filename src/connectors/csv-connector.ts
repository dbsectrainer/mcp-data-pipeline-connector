import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";
import { resolve } from "node:path";
import { existsSync, accessSync, constants } from "node:fs";
import type { DataConnector } from "./base.js";
import { normalizeType } from "./base.js";
import type { ColumnInfo, QueryResult, SourceConfig } from "../types.js";

/**
 * Check if the SQL already contains a LIMIT clause (case-insensitive).
 */
function hasLimitClause(sql: string): boolean {
  return /\bLIMIT\b/i.test(sql);
}

export class CsvConnector implements DataConnector {
  readonly name: string;
  readonly type = "csv";

  private config: SourceConfig;
  private instance: DuckDBInstance | null = null;
  private connection: DuckDBConnection | null = null;
  private connected = false;
  private resolvedPath: string;
  private viewName: string;
  private isJsonFile: boolean;

  constructor(config: SourceConfig) {
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

  async connect(): Promise<void> {
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
      throw new Error(`Failed to connect CSV source '${this.name}': ${(err as Error).message}`);
    }
  }

  async disconnect(): Promise<void> {
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

  isConnected(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<boolean> {
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

  async listTables(): Promise<string[]> {
    return [this.viewName];
  }

  async getSchema(tableName: string): Promise<ColumnInfo[]> {
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

  async query(sql: string, maxRows: number): Promise<QueryResult> {
    if (!this.connection) throw new Error(`Source '${this.name}' is not connected`);

    const limitedSql = hasLimitClause(sql) ? sql : `${sql} LIMIT ${maxRows + 1}`;

    const result = await this.connection.run(limitedSql);
    const columnNames = result.columnNames();
    const allRows = await result.getRows();

    const truncated = allRows.length > maxRows;
    const slicedRows = truncated ? allRows.slice(0, maxRows) : allRows;

    const rows: Record<string, unknown>[] = slicedRows.map((row) => {
      const record: Record<string, unknown> = {};
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
  getResolvedPath(): string {
    return this.resolvedPath;
  }
}
