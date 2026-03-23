import { DuckDBInstance } from "@duckdb/node-api";
import { normalizeType } from "./base.js";
/**
 * Sanitize a connection string by replacing the password with ***.
 * Handles both URL format (postgres://user:pass@host) and key=value format (password=xxx).
 */
function sanitizeConnectionString(conn) {
  // URL format: postgres://user:password@host
  let sanitized = conn.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/, "$1***$3");
  // Key=value format: password=somevalue or password='somevalue'
  sanitized = sanitized.replace(/(password\s*=\s*)('[^']*'|"[^"]*"|[^\s;]+)/gi, "$1***");
  return sanitized;
}
/**
 * Check if the SQL already contains a LIMIT clause (case-insensitive).
 */
function hasLimitClause(sql) {
  return /\bLIMIT\b/i.test(sql);
}
export class PostgresConnector {
  name;
  type = "postgres";
  config;
  instance = null;
  connection = null;
  connected = false;
  attachedAlias = "pg";
  constructor(config) {
    if (!config.connection_string) {
      throw new Error(`Postgres connector '${config.name}' requires a connection_string`);
    }
    this.name = config.name;
    this.config = config;
    // Use source name (sanitized) as the attached alias to avoid collisions
    this.attachedAlias = "pg_" + config.name.replace(/[^a-zA-Z0-9_]/g, "_");
  }
  async connect() {
    const connString = this.config.connection_string;
    try {
      this.instance = await DuckDBInstance.create(":memory:");
      this.connection = await this.instance.connect();
      // Install and load the postgres extension
      await this.connection.run("INSTALL postgres; LOAD postgres;");
      // Attach postgres database — never log the actual connection string
      await this.connection.run(
        `ATTACH '${connString}' AS "${this.attachedAlias}" (TYPE POSTGRES)`,
      );
      this.connected = true;
      process.stderr.write(
        `[postgres-connector] Connected '${this.name}' -> ${sanitizeConnectionString(connString)}\n`,
      );
    } catch (err) {
      this.connected = false;
      throw new Error(`Failed to connect Postgres source '${this.name}': ${err.message}`);
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
      if (!this.connection) return false;
      await this.connection.run("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
  async listTables() {
    if (!this.connection) throw new Error(`Source '${this.name}' is not connected`);
    const result = await this.connection.run(
      `SELECT table_name FROM "${this.attachedAlias}".information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const rows = await result.getRows();
    const allTables = rows.map((row) => String(row[0]));
    // If specific tables configured, filter to only those
    if (this.config.tables && this.config.tables.length > 0) {
      const allowed = new Set(this.config.tables);
      return allTables.filter((t) => allowed.has(t));
    }
    return allTables;
  }
  async getSchema(tableName) {
    if (!this.connection) throw new Error(`Source '${this.name}' is not connected`);
    const result = await this.connection.run(
      `DESCRIBE SELECT * FROM "${this.attachedAlias}"."${tableName}"`,
    );
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
        record[col] = row[i];
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
}
