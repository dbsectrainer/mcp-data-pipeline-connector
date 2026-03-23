export type SourceType = "csv" | "postgres" | "rest" | "sheets" | "airtable";
export interface SourceConfig {
  name: string;
  type: SourceType;
  path?: string;
  connection_string?: string;
  url?: string;
  auth_header?: string;
  pagination_param?: string;
  cache_ttl?: number;
  tables?: string[];
  spreadsheet_id?: string;
  sheet_name?: string;
  base_id?: string;
  table_name?: string;
}
export interface DataSourcesConfig {
  sources: SourceConfig[];
}
export interface ColumnInfo {
  name: string;
  type: string;
  normalized_type: string;
}
export interface TableInfo {
  source: string;
  name: string;
  rowCount?: number;
}
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  total_returned?: number;
  offset?: number;
  has_more?: boolean;
}
export interface SourceStatus {
  name: string;
  type: SourceType;
  status: "connected" | "error" | "disconnected";
  error?: string;
  tables?: string[];
}
export interface HealthCheckResult {
  name: string;
  type: SourceType;
  healthy: boolean;
  error?: string;
  checked_at: string;
}
