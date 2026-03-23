import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
/**
 * Hash a SQL string with SHA-256. The raw SQL is never stored.
 */
export function hashSql(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}
const DEFAULT_LOG_PATH = path.join(os.homedir(), ".mcp", "data-pipeline-audit.jsonl");
export class QueryAuditLog {
  logPath;
  constructor(logPath) {
    this.logPath = logPath ?? DEFAULT_LOG_PATH;
  }
  /**
   * Append an audit entry to the JSONL file.
   * Ensures the parent directory exists before writing.
   */
  record(entry) {
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
  export(from, to) {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }
    try {
      const content = fs.readFileSync(this.logPath, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim() !== "");
      const entries = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((e) => e !== null);
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
