import type { ColumnInfo, QueryResult } from "../types.js";
export interface DataConnector {
  readonly name: string;
  readonly type: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTables(): Promise<string[]>;
  getSchema(tableName: string): Promise<ColumnInfo[]>;
  query(sql: string, maxRows: number): Promise<QueryResult>;
  isConnected(): boolean;
  healthCheck(): Promise<boolean>;
}
/**
 * Map a source-specific type string to the normalized standard set:
 * string | integer | number | boolean | datetime | json | unknown
 */
export declare function normalizeType(sourceType: string): string;
/**
 * Strip query-string parameters from a URL before logging.
 * Prevents API keys or tokens embedded as query params from appearing in logs.
 */
export declare function sanitizeUrl(url: string): string;
