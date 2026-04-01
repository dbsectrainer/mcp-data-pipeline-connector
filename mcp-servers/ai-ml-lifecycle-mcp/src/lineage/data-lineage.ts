/**
 * Data Lineage Tracking & Visualization
 * BE EASY ENTERPRISES LLC
 *
 * Tracks data flow through the ML pipeline, including dataset origins,
 * transformations, feature engineering, and model inputs/outputs.
 */

import crypto from "node:crypto";
import type {
  DataLineage,
  LineageNode,
  LineageEdge,
  TraceDirection,
} from "../types.js";

/**
 * Generate synthetic lineage nodes for a dataset.
 */
function generateDatasetLineage(datasetId: string): {
  nodes: LineageNode[];
  edges: LineageEdge[];
} {
  const now = new Date().toISOString();

  const rawSource: LineageNode = {
    id: `raw-${datasetId}`,
    type: "dataset",
    name: `Raw Source: ${datasetId}`,
    metadata: {
      format: "parquet",
      row_count: 150000,
      storage: "s3://be-easy-datalake/raw/",
    },
    created_at: now,
  };

  const cleanTransform: LineageNode = {
    id: `clean-${datasetId}`,
    type: "transformation",
    name: "Data Cleaning Pipeline",
    metadata: {
      operations: ["null_imputation", "outlier_removal", "deduplication"],
      framework: "spark",
    },
    created_at: now,
  };

  const featureStore: LineageNode = {
    id: `features-${datasetId}`,
    type: "feature_store",
    name: `Feature Set: ${datasetId}`,
    metadata: {
      feature_count: 42,
      storage: "feast://be-easy-features",
    },
    created_at: now,
  };

  const cleanedDataset: LineageNode = {
    id: `cleaned-${datasetId}`,
    type: "dataset",
    name: `Cleaned Dataset: ${datasetId}`,
    metadata: {
      format: "parquet",
      row_count: 145000,
      storage: "s3://be-easy-datalake/cleaned/",
    },
    created_at: now,
  };

  const nodes = [rawSource, cleanTransform, cleanedDataset, featureStore];

  const edges: LineageEdge[] = [
    {
      source_id: rawSource.id,
      target_id: cleanTransform.id,
      relationship: "input_to",
    },
    {
      source_id: cleanTransform.id,
      target_id: cleanedDataset.id,
      relationship: "output_of",
      transformation: "spark_cleaning_pipeline_v2",
    },
    {
      source_id: cleanedDataset.id,
      target_id: featureStore.id,
      relationship: "derived_from",
      transformation: "feature_engineering_v3",
    },
  ];

  return { nodes, edges };
}

/**
 * Generate synthetic lineage nodes for a model.
 */
function generateModelLineage(modelId: string): {
  nodes: LineageNode[];
  edges: LineageEdge[];
} {
  const now = new Date().toISOString();

  const trainingData: LineageNode = {
    id: `train-data-${modelId}`,
    type: "dataset",
    name: `Training Dataset for ${modelId}`,
    metadata: {
      split: "train",
      row_count: 120000,
    },
    created_at: now,
  };

  const validationData: LineageNode = {
    id: `val-data-${modelId}`,
    type: "dataset",
    name: `Validation Dataset for ${modelId}`,
    metadata: {
      split: "validation",
      row_count: 25000,
    },
    created_at: now,
  };

  const model: LineageNode = {
    id: modelId,
    type: "model",
    name: `Model: ${modelId}`,
    metadata: {
      framework: "pytorch",
      version: "latest",
    },
    created_at: now,
  };

  const nodes = [trainingData, validationData, model];

  const edges: LineageEdge[] = [
    {
      source_id: trainingData.id,
      target_id: model.id,
      relationship: "input_to",
    },
    {
      source_id: validationData.id,
      target_id: model.id,
      relationship: "input_to",
    },
  ];

  return { nodes, edges };
}

/**
 * Filter nodes and edges based on trace direction.
 */
function filterByDirection(
  rootId: string,
  nodes: LineageNode[],
  edges: LineageEdge[],
  direction: TraceDirection,
): { nodes: LineageNode[]; edges: LineageEdge[] } {
  if (direction === "full") {
    return { nodes, edges };
  }

  const reachableIds = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (direction === "downstream") {
        if (reachableIds.has(edge.source_id) && !reachableIds.has(edge.target_id)) {
          reachableIds.add(edge.target_id);
          changed = true;
        }
      } else {
        // upstream
        if (reachableIds.has(edge.target_id) && !reachableIds.has(edge.source_id)) {
          reachableIds.add(edge.source_id);
          changed = true;
        }
      }
    }
  }

  const filteredNodes = nodes.filter((n) => reachableIds.has(n.id));
  const filteredEdges = edges.filter(
    (e) => reachableIds.has(e.source_id) && reachableIds.has(e.target_id),
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Query data lineage for a dataset or model.
 */
export function queryDataLineage(params: {
  dataset_id?: string;
  model_id?: string;
  trace_direction: TraceDirection;
  include_transformations: boolean;
}): DataLineage {
  if (!params.dataset_id && !params.model_id) {
    throw new Error("At least one of dataset_id or model_id must be provided.");
  }

  let allNodes: LineageNode[] = [];
  let allEdges: LineageEdge[] = [];
  let rootId: string;

  if (params.dataset_id) {
    const dataset = generateDatasetLineage(params.dataset_id);
    allNodes.push(...dataset.nodes);
    allEdges.push(...dataset.edges);
    rootId = `raw-${params.dataset_id}`;
  }

  if (params.model_id) {
    const model = generateModelLineage(params.model_id);
    allNodes.push(...model.nodes);
    allEdges.push(...model.edges);
    rootId = params.model_id;
  }

  rootId = rootId!;

  // Filter out transformation nodes if not requested
  if (!params.include_transformations) {
    allNodes = allNodes.filter((n) => n.type !== "transformation");
    allEdges = allEdges.filter((e) => {
      const sourceNode = allNodes.find((n) => n.id === e.source_id);
      const targetNode = allNodes.find((n) => n.id === e.target_id);
      return sourceNode !== undefined && targetNode !== undefined;
    });
  }

  const { nodes, edges } = filterByDirection(
    rootId,
    allNodes,
    allEdges,
    params.trace_direction,
  );

  // Calculate depth as max edge chain length
  let depth = 0;
  const visited = new Set<string>();
  const queue: Array<{ id: string; d: number }> = [{ id: rootId, d: 0 }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    depth = Math.max(depth, current.d);
    for (const edge of edges) {
      if (edge.source_id === current.id) {
        queue.push({ id: edge.target_id, d: current.d + 1 });
      }
    }
  }

  return {
    root_id: rootId,
    direction: params.trace_direction,
    nodes,
    edges,
    total_depth: depth,
    queried_at: new Date().toISOString(),
  };
}
