import { DuckDBInstance } from "@duckdb/node-api";
import type { DataConnector } from "./base.js";
import { normalizeType, sanitizeUrl } from "./base.js";
import type { ColumnInfo, QueryResult, SourceConfig } from "../types.js";

interface CacheEntry {
  data: unknown;
  fetchedAt: number; // epoch ms
}

/**
 * Check if the SQL already contains a LIMIT clause (case-insensitive).
 */
function hasLimitClause(sql: string): boolean {
  return /\bLIMIT\b/i.test(sql);
}

export class RestConnector implements DataConnector {
  readonly name: string;
  readonly type = "rest";

  private config: SourceConfig;
  private connected = false;
  private baseUrl: string;
  private cacheTtlMs: number;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(config: SourceConfig, globalCacheTtl?: number) {
    if (!config.url) {
      throw new Error(`REST connector '${config.name}' requires a url`);
    }
    this.name = config.name;
    this.config = config;
    this.baseUrl = config.url;
    // cache_ttl in config (seconds), or globalCacheTtl, or default 60s
    const ttlSeconds = config.cache_ttl ?? globalCacheTtl ?? 60;
    this.cacheTtlMs = ttlSeconds * 1000;
  }

  async connect(): Promise<void> {
    // Verify the URL is reachable with a HEAD request
    try {
      const headers = this.buildHeaders();
      const response = await fetch(this.baseUrl, {
        method: "HEAD",
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      // Accept any 2xx or 3xx response as "reachable"
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      this.connected = true;
      process.stderr.write(
        `[rest-connector] Connected '${this.name}' -> ${sanitizeUrl(this.baseUrl)}\n`,
      );
    } catch (err) {
      this.connected = false;
      throw new Error(`Failed to connect REST source '${this.name}': ${(err as Error).message}`);
    }
  }

  async disconnect(): Promise<void> {
    this.cache.clear();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(this.baseUrl, {
        method: "HEAD",
        headers,
        signal: AbortSignal.timeout(5_000),
      });
      return response.status < 400;
    } catch {
      return false;
    }
  }

  async listTables(): Promise<string[]> {
    return ["response"];
  }

  async getSchema(_tableName: string): Promise<ColumnInfo[]> {
    // REST responses are treated as opaque JSON
    const norm = normalizeType("JSON");
    return [
      {
        name: "data",
        type: norm,
        normalized_type: norm,
      },
    ];
  }

  async query(sql: string, maxRows: number): Promise<QueryResult> {
    // Fetch (or use cached) JSON data
    const rawData = await this.fetchData();

    // Load into DuckDB in-memory and run the SQL query against it
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();

    try {
      // Serialize data to JSON string for DuckDB
      const jsonString = JSON.stringify(Array.isArray(rawData) ? rawData : [rawData]).replace(
        /'/g,
        "''",
      );

      // Create a view called "response" from the JSON data
      await connection.run(`CREATE VIEW "response" AS SELECT * FROM read_json('[${jsonString}]')`);
    } catch {
      // Fallback: store raw as single row with a "data" column
      const escaped = JSON.stringify(rawData).replace(/'/g, "''");
      await connection.run(
        `CREATE TABLE "response" (data VARCHAR); INSERT INTO "response" VALUES ('${escaped}')`,
      );
    }

    const limitedSql = hasLimitClause(sql) ? sql : `${sql} LIMIT ${maxRows + 1}`;

    const result = await connection.run(limitedSql);
    const columnNames = result.columnNames();
    const allRows = await result.getRows();

    connection.closeSync();

    const truncated = allRows.length > maxRows;
    const slicedRows = truncated ? allRows.slice(0, maxRows) : allRows;

    const rows: Record<string, unknown>[] = slicedRows.map((row) => {
      const record: Record<string, unknown> = {};
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.config.auth_header) {
      // auth_header is the name of an env var holding the actual header value
      const headerValue = process.env[this.config.auth_header];
      if (headerValue) {
        // The env var value should be in format "Bearer token" or "ApiKey xyz"
        headers["Authorization"] = headerValue;
      }
    }
    return headers;
  }

  private async fetchData(): Promise<unknown> {
    const cacheKey = this.baseUrl;
    const now = Date.now();

    // Return from cache if still valid
    if (this.cacheTtlMs > 0) {
      const entry = this.cache.get(cacheKey);
      if (entry && now - entry.fetchedAt < this.cacheTtlMs) {
        return entry.data;
      }
    }

    const headers = this.buildHeaders();
    let url = this.baseUrl;
    if (this.config.pagination_param) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}${this.config.pagination_param}=1`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`REST fetch failed: HTTP ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    if (this.cacheTtlMs > 0) {
      this.cache.set(cacheKey, { data, fetchedAt: now });
    }

    return data;
  }
}
