import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
/**
 * Load the access policy from the given path, or from the default location
 * (~/.mcp/data-access-policy.yaml). Returns null if the file does not exist.
 */
function loadPolicy(policyPath) {
  const resolvedPath = policyPath ?? path.join(os.homedir(), ".mcp", "data-access-policy.yaml");
  if (!fs.existsSync(resolvedPath)) {
    return [];
  }
  try {
    // Minimal YAML parser: only handles the specific schema we need.
    // We avoid external yaml deps per the project constraint of no new runtime deps.
    // The file uses js-yaml which is already a dependency — use it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yaml = require("js-yaml");
    const content = fs.readFileSync(resolvedPath, "utf-8");
    const parsed = yaml.load(content);
    return parsed?.policies ?? [];
  } catch {
    return [];
  }
}
/**
 * Apply column-level and row-level access control to a SQL query.
 *
 * - Removes denied columns from the SELECT list (regex-based).
 * - Appends a WHERE clause for the row_filter.
 *
 * If no matching policy exists or the policy file is missing, returns sql unchanged.
 *
 * @param sql        The original SQL query string.
 * @param source     The data source name being queried.
 * @param _userClaims  JWT claims from the authenticated user (reserved for future use).
 * @param policyPath Optional path to the YAML policy file.
 */
export function applyAccessControl(sql, source, _userClaims, policyPath) {
  const policies = loadPolicy(policyPath);
  const policy = policies.find((p) => p.source === source);
  if (!policy) {
    return sql;
  }
  let result = sql;
  // ── Column-level filtering ────────────────────────────────────────────────
  if (policy.deny_columns && policy.deny_columns.length > 0) {
    for (const col of policy.deny_columns) {
      // Match the column name (with optional alias, quotes, backticks or plain) in a SELECT list.
      // Patterns handled:
      //   `col`, "col", col, table.col, "table"."col", col AS alias, col alias
      // We remove the column token plus any surrounding comma, being careful about
      // SELECT * (we leave * unchanged — the policy is best-effort for explicit lists).
      const escaped = col.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Match: optional comma+space before, or comma+space after the column expression
      const pattern = new RegExp(
        `(,\\s*(?:"?${escaped}"?|\\w+\\.${escaped})(?:\\s+(?:AS\\s+)?\\w+)?|(?:"?${escaped}"?|\\w+\\.${escaped})(?:\\s+(?:AS\\s+)?\\w+)?\\s*,?)`,
        "gi",
      );
      result = result.replace(pattern, "");
    }
    // Clean up any double commas or trailing commas before FROM
    result = result.replace(/,\s*,/g, ",");
    result = result.replace(/,\s*(FROM\b)/gi, " $1");
    result = result.replace(/(SELECT\s+),/gi, "$1");
  }
  // ── Row-level filtering ───────────────────────────────────────────────────
  if (policy.row_filter) {
    if (/\bWHERE\b/i.test(result)) {
      result = result.replace(/\bWHERE\b/i, `WHERE (${policy.row_filter}) AND`);
    } else {
      // Insert WHERE before ORDER BY / GROUP BY / LIMIT / end of string
      if (/\b(ORDER BY|GROUP BY|LIMIT|OFFSET)\b/i.test(result)) {
        result = result.replace(
          /\b(ORDER BY|GROUP BY|LIMIT|OFFSET)\b/i,
          `WHERE ${policy.row_filter} $1`,
        );
      } else {
        result = `${result.trimEnd()} WHERE ${policy.row_filter}`;
      }
    }
  }
  return result;
}
