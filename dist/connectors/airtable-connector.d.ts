import type { DataConnector } from "./base.js";
import type { ColumnInfo, QueryResult } from "../types.js";
export interface AirtableConfig {
  type: "airtable";
  base_id: string;
  table_name: string;
}
export declare class AirtableConnector implements DataConnector {
  readonly name: string;
  readonly type = "airtable";
  private config;
  private connected;
  private apiKey;
  constructor(
    config: AirtableConfig & {
      name: string;
    },
  );
  connect(config?: AirtableConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  healthCheck(): Promise<boolean>;
  listTables(): Promise<string[]>;
  getSchema(table: string): Promise<ColumnInfo[]>;
  query(sql: string, maxRows: number): Promise<QueryResult>;
}
