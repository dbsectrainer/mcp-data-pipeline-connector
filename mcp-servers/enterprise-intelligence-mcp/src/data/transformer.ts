/**
 * Data transformation and normalization engine.
 *
 * Provides utilities to clean, normalize, and reshape datasets before they
 * are consumed by the analytics or reporting subsystems.
 */

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/**
 * Normalize numeric values to 0-1 range using min-max scaling.
 */
export function minMaxNormalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return values.map(() => 0.5);
  return values.map((v) => (v - min) / range);
}

/**
 * Z-score standardization.
 */
export function zScoreNormalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return values.map(() => 0);
  return values.map((v) => (v - mean) / stdDev);
}

// ---------------------------------------------------------------------------
// Cleaners
// ---------------------------------------------------------------------------

/**
 * Remove rows where any of the specified columns are null / undefined.
 */
export function dropNulls(
  rows: Record<string, unknown>[],
  columns: string[],
): Record<string, unknown>[] {
  return rows.filter((row) =>
    columns.every((col) => row[col] !== null && row[col] !== undefined),
  );
}

/**
 * Fill null / undefined values in specified columns with a default.
 */
export function fillDefaults(
  rows: Record<string, unknown>[],
  defaults: Record<string, unknown>,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const patched = { ...row };
    for (const [col, fallback] of Object.entries(defaults)) {
      if (patched[col] === null || patched[col] === undefined) {
        patched[col] = fallback;
      }
    }
    return patched;
  });
}

/**
 * Deduplicate rows by a key column, keeping the first occurrence.
 */
export function deduplicateByKey(
  rows: Record<string, unknown>[],
  keyColumn: string,
): Record<string, unknown>[] {
  const seen = new Set<unknown>();
  return rows.filter((row) => {
    const key = row[keyColumn];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Reshaping
// ---------------------------------------------------------------------------

/**
 * Pivot a dataset: turn unique values in `pivotColumn` into new columns whose
 * values come from `valueColumn`.
 */
export function pivot(
  rows: Record<string, unknown>[],
  groupColumn: string,
  pivotColumn: string,
  valueColumn: string,
): Record<string, unknown>[] {
  const groups = new Map<unknown, Record<string, unknown>>();

  for (const row of rows) {
    const groupKey = row[groupColumn];
    const pivotKey = String(row[pivotColumn]);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { [groupColumn]: groupKey });
    }
    groups.get(groupKey)![pivotKey] = row[valueColumn];
  }

  return [...groups.values()];
}

/**
 * Convert column types — coerce string numbers to actual numbers, parse dates, etc.
 */
export function coerceTypes(
  rows: Record<string, unknown>[],
  typeMap: Record<string, "number" | "string" | "boolean" | "date">,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const coerced = { ...row };
    for (const [col, targetType] of Object.entries(typeMap)) {
      const raw = coerced[col];
      if (raw === null || raw === undefined) continue;
      switch (targetType) {
        case "number":
          coerced[col] = Number(raw);
          break;
        case "string":
          coerced[col] = String(raw);
          break;
        case "boolean":
          coerced[col] = Boolean(raw);
          break;
        case "date":
          coerced[col] = new Date(String(raw)).toISOString();
          break;
      }
    }
    return coerced;
  });
}
