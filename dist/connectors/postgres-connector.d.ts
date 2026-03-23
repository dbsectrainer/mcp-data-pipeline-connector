import type { DataConnector } from "./base.js";
import type { ColumnInfo, QueryResult, SourceConfig } from "../types.js";
export declare class PostgresConnector implements DataConnector {
  readonly name: string;
  readonly type = "postgres";
  private config;
  private instance;
  private connection;
  private connected;
  private attachedAlias;
  constructor(config: SourceConfig);
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  healthCheck(): Promise<boolean>;
  listTables(): Promise<string[]>;
  getSchema(tableName: string): Promise<ColumnInfo[]>;
  query(sql: string, maxRows: number): Promise<QueryResult>;
}
