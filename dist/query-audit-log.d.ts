export interface AuditEntry {
  timestamp: string;
  user_id: string;
  source: string;
  sql_hash: string;
  rows_returned: number;
  duration_ms: number;
}
/**
 * Hash a SQL string with SHA-256. The raw SQL is never stored.
 */
export declare function hashSql(sql: string): string;
export declare class QueryAuditLog {
  private logPath;
  constructor(logPath?: string);
  /**
   * Append an audit entry to the JSONL file.
   * Ensures the parent directory exists before writing.
   */
  record(entry: AuditEntry): void;
  /**
   * Read all audit entries, optionally filtered to a time range.
   */
  export(from?: Date, to?: Date): AuditEntry[];
}
