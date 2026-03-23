import type { DataConnector } from "./base.js";
import type { ColumnInfo, QueryResult, SourceConfig } from "../types.js";
export declare class RestConnector implements DataConnector {
  readonly name: string;
  readonly type = "rest";
  private config;
  private connected;
  private baseUrl;
  private cacheTtlMs;
  private cache;
  constructor(config: SourceConfig, globalCacheTtl?: number);
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  healthCheck(): Promise<boolean>;
  listTables(): Promise<string[]>;
  getSchema(_tableName: string): Promise<ColumnInfo[]>;
  query(sql: string, maxRows: number): Promise<QueryResult>;
  private buildHeaders;
  private fetchData;
}
