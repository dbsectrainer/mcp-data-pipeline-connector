import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";

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
export function hashSql(sql: string): string {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

const DEFAULT_LOG_PATH = path.join(os.homedir(), ".mcp", "data-pipeline-audit.jsonl");

export class QueryAuditLog {
  private logPath: string;

  constructor(logPath?: string) {
    this.logPath = logPath ?? DEFAULT_LOG_PATH;
  }

  /**
   * Append an audit entry to the JSONL file.
   * Ensures the parent directory exists before writing.
   */
  record(entry: AuditEntry): void {
    try {
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.logPath, JSON.stringify(entry) + "\n", "utf-8");
    } catch {
      // Non-fatal: audit logging must not break query execution
    }
  }

  /**
   * Read all audit entries, optionally filtered to a time range.
   */
  export(from?: Date, to?: Date): AuditEntry[] {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.logPath, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim() !== "");
      const entries: AuditEntry[] = lines
        .map((line) => {
          try {
            return JSON.parse(line) as AuditEntry;
          } catch {
            return null;
          }
        })
        .filter((e): e is AuditEntry => e !== null);

      if (!from && !to) {
        return entries;
      }

      return entries.filter((e) => {
        const ts = new Date(e.timestamp).getTime();
        if (from && ts < from.getTime()) return false;
        if (to && ts > to.getTime()) return false;
        return true;
      });
    } catch {
      return [];
    }
  }
}
