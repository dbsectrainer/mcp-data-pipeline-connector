/**
 * Multi-source data aggregation engine.
 *
 * Connects to heterogeneous data sources (databases, APIs, files, cloud storage),
 * pulls records, and merges them according to the chosen strategy.
 */

import { randomUUID } from "node:crypto";
import type {
  AggregatedDataset,
  ConnectionConfig,
  DataSource,
  DataSourceInput,
  DataSourceType,
  MergeStrategy,
} from "../types.js";

// ---------------------------------------------------------------------------
// Source connectors (stubs — swap with real drivers in production)
// ---------------------------------------------------------------------------

async function connectSource(
  type: DataSourceType,
  config: ConnectionConfig,
): Promise<DataSource> {
  const id = randomUUID();

  // In production each branch would use the appropriate driver
  // (pg, fetch, fs, @aws-sdk/client-s3, etc.)
  const schema: Record<string, string> = {};
  let recordCount = 0;

  switch (type) {
    case "database": {
      // Simulate database connection & schema introspection
      schema["id"] = "integer";
      schema["name"] = "varchar";
      schema["value"] = "numeric";
      schema["created_at"] = "timestamp";
      recordCount = Math.floor(Math.random() * 10_000) + 500;
      break;
    }
    case "api": {
      schema["endpoint"] = "string";
      schema["payload"] = "json";
      schema["status"] = "integer";
      recordCount = Math.floor(Math.random() * 5_000) + 100;
      break;
    }
    case "file": {
      schema["row_index"] = "integer";
      schema["column_a"] = "string";
      schema["column_b"] = "float";
      recordCount = Math.floor(Math.random() * 20_000) + 1_000;
      break;
    }
    case "cloud_storage": {
      schema["object_key"] = "string";
      schema["size_bytes"] = "integer";
      schema["content_type"] = "string";
      schema["last_modified"] = "timestamp";
      recordCount = Math.floor(Math.random() * 50_000) + 2_000;
      break;
    }
  }

  return {
    id,
    type,
    connection_config: config,
    status: "connected",
    last_synced: new Date().toISOString(),
    record_count: recordCount,
    schema,
  };
}

// ---------------------------------------------------------------------------
// Merge strategies
// ---------------------------------------------------------------------------

function mergeUnion(datasets: Record<string, unknown>[][]): Record<string, unknown>[] {
  const merged: Record<string, unknown>[] = [];
  for (const ds of datasets) {
    merged.push(...ds);
  }
  return merged;
}

function mergeIntersection(datasets: Record<string, unknown>[][]): Record<string, unknown>[] {
  if (datasets.length === 0) return [];
  if (datasets.length === 1) return datasets[0];

  const commonKeys = Object.keys(datasets[0][0] ?? {}).filter((key) =>
    datasets.every((ds) => ds.length > 0 && key in (ds[0] ?? {})),
  );

  return datasets.flat().map((row) => {
    const filtered: Record<string, unknown> = {};
    for (const key of commonKeys) {
      filtered[key] = row[key];
    }
    return filtered;
  });
}

function mergeLeftJoin(datasets: Record<string, unknown>[][]): Record<string, unknown>[] {
  if (datasets.length === 0) return [];
  const [left, ...rest] = datasets;
  const right = rest.flat();

  return left.map((leftRow) => {
    const merged = { ...leftRow };
    const match = right.find((r) => r["id"] === leftRow["id"]);
    if (match) {
      Object.assign(merged, match);
    }
    return merged;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pull and aggregate data from multiple enterprise sources.
 */
export async function aggregateDataSources(
  sources: DataSourceInput[],
  mergeStrategy: MergeStrategy,
  query?: string,
): Promise<AggregatedDataset> {
  // 1. Connect to every source in parallel
  const connectedSources = await Promise.all(
    sources.map((s) => connectSource(s.type, s.connection_config)),
  );

  // 2. Simulate pulling sample data from each source
  const datasets: Record<string, unknown>[][] = connectedSources.map((src) => {
    const sampleRows: Record<string, unknown>[] = [];
    const cols = Object.keys(src.schema);
    for (let i = 0; i < Math.min(5, src.record_count); i++) {
      const row: Record<string, unknown> = {};
      for (const col of cols) {
        row[col] = `sample_${col}_${i}`;
      }
      row["id"] = i;
      sampleRows.push(row);
    }
    return sampleRows;
  });

  // 3. Merge
  let mergedData: Record<string, unknown>[];
  switch (mergeStrategy) {
    case "union":
      mergedData = mergeUnion(datasets);
      break;
    case "intersection":
      mergedData = mergeIntersection(datasets);
      break;
    case "left_join":
      mergedData = mergeLeftJoin(datasets);
      break;
    case "custom":
      // Custom strategy defaults to union; in production this would execute a
      // user-supplied merge definition.
      mergedData = mergeUnion(datasets);
      break;
  }

  // 4. Derive column list from merged data
  const columnSet = new Set<string>();
  for (const row of mergedData) {
    for (const key of Object.keys(row)) {
      columnSet.add(key);
    }
  }

  const totalRecords = connectedSources.reduce((sum, s) => sum + s.record_count, 0);

  return {
    id: randomUUID(),
    sources: connectedSources,
    merge_strategy: mergeStrategy,
    record_count: totalRecords,
    columns: [...columnSet],
    sample_data: mergedData.slice(0, 10),
    created_at: new Date().toISOString(),
    query,
  };
}
