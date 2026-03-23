/**
 * Map a source-specific type string to the normalized standard set:
 * string | integer | number | boolean | datetime | json | unknown
 */
export function normalizeType(sourceType) {
  const upper = sourceType.toUpperCase().trim();
  // String types
  if (
    upper.startsWith("VARCHAR") ||
    upper.startsWith("TEXT") ||
    upper.startsWith("CHAR") ||
    upper.includes("CHAR") ||
    upper === "UUID" ||
    upper === "CITEXT" ||
    upper === "BLOB" ||
    upper === "STRING"
  ) {
    return "string";
  }
  // Integer types
  if (
    upper === "INT" ||
    upper === "INTEGER" ||
    upper === "BIGINT" ||
    upper === "SMALLINT" ||
    upper === "TINYINT" ||
    upper === "HUGEINT" ||
    upper === "INT2" ||
    upper === "INT4" ||
    upper === "INT8" ||
    upper === "INT16" ||
    upper === "INT32" ||
    upper === "INT64" ||
    upper.startsWith("SERIAL") ||
    upper === "UBIGINT" ||
    upper === "UINTEGER" ||
    upper === "USMALLINT" ||
    upper === "UTINYINT"
  ) {
    return "integer";
  }
  // Numeric/float types
  if (
    upper.startsWith("FLOAT") ||
    upper.startsWith("DOUBLE") ||
    upper.startsWith("DECIMAL") ||
    upper.startsWith("NUMERIC") ||
    upper.startsWith("REAL") ||
    upper === "MONEY"
  ) {
    return "number";
  }
  // Boolean types
  if (upper === "BOOLEAN" || upper === "BOOL") {
    return "boolean";
  }
  // Datetime types
  if (
    upper.startsWith("DATE") ||
    upper.startsWith("TIMESTAMP") ||
    upper.startsWith("TIME") ||
    upper === "INTERVAL"
  ) {
    return "datetime";
  }
  // JSON types
  if (
    upper === "JSON" ||
    upper === "JSONB" ||
    upper.startsWith("STRUCT") ||
    upper.startsWith("LIST") ||
    upper.startsWith("MAP") ||
    upper.startsWith("ARRAY")
  ) {
    return "json";
  }
  return "unknown";
}
/**
 * Strip query-string parameters from a URL before logging.
 * Prevents API keys or tokens embedded as query params from appearing in logs.
 */
export function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    // Not a valid URL — strip anything after the first '?'
    return url.split("?")[0] ?? url;
  }
}
