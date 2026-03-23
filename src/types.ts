export type SourceType = "csv" | "postgres" | "rest" | "sheets" | "airtable";

export interface SourceConfig {
  name: string;
  type: SourceType;
  path?: string; // for CSV/JSON
  connection_string?: string; // for postgres (from YAML with ${ENV_VAR} substitution)
  url?: string; // for REST
  auth_header?: string; // for REST: environment variable name containing the auth header value
  pagination_param?: string; // for REST: query param name for pagination
  cache_ttl?: number; // for REST: seconds to cache responses
  tables?: string[]; // postgres: specific tables to expose
  spreadsheet_id?: string; // for sheets
  sheet_name?: string; // for sheets
  base_id?: string; // for airtable
  table_name?: string; // for airtable
}

export interface DataSourcesConfig {
  sources: SourceConfig[];
}

export interface ColumnInfo {
  name: string;
  type: string; // normalized: string | integer | number | boolean | datetime | json | unknown
  normalized_type: string; // always normalized
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
