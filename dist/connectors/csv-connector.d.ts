import type { DataConnector } from "./base.js";
import type { ColumnInfo, QueryResult, SourceConfig } from "../types.js";
export declare class CsvConnector implements DataConnector {
  readonly name: string;
  readonly type = "csv";
  private config;
  private instance;
  private connection;
  private connected;
  private resolvedPath;
  private viewName;
  private isJsonFile;
  constructor(config: SourceConfig);
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  healthCheck(): Promise<boolean>;
  listTables(): Promise<string[]>;
  getSchema(tableName: string): Promise<ColumnInfo[]>;
  query(sql: string, maxRows: number): Promise<QueryResult>;
  /**
   * Expose the resolved file path for use in cross-source DuckDB queries.
   */
  getResolvedPath(): string;
}
