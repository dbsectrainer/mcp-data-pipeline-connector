/**
 * Model Version Registry & Artifact Tracking
 * BE EASY ENTERPRISES LLC
 *
 * Manages model version registration, artifact storage references,
 * and lineage tracking across the ML lifecycle.
 */

import crypto from "node:crypto";
import type { ModelVersion, Framework } from "../types.js";

/** In-memory registry — swap with a persistent backend in production. */
const registry = new Map<string, ModelVersion[]>();

/**
 * Generate a deterministic lineage ID for a model version.
 */
function generateLineageId(modelName: string, version: string): string {
  return crypto
    .createHash("sha256")
    .update(`${modelName}:${version}:${Date.now()}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Register a new model version in the registry.
 */
export function registerModelVersion(params: {
  model_name: string;
  version: string;
  framework: Framework;
  metrics: Record<string, number>;
  artifacts_path?: string;
  tags?: Record<string, string>;
}): ModelVersion {
  const lineageId = generateLineageId(params.model_name, params.version);

  const entry: ModelVersion = {
    model_name: params.model_name,
    version: params.version,
    framework: params.framework,
    metrics: params.metrics,
    artifacts_path: params.artifacts_path,
    tags: params.tags,
    registered_at: new Date().toISOString(),
    lineage_id: lineageId,
    checksum: crypto
      .createHash("sha256")
      .update(JSON.stringify(params.metrics))
      .digest("hex")
      .slice(0, 12),
  };

  const existing = registry.get(params.model_name) ?? [];

  const duplicate = existing.find((v) => v.version === params.version);
  if (duplicate) {
    throw new Error(
      `Version ${params.version} already exists for model "${params.model_name}". ` +
        `Use a new version string or remove the existing entry first.`,
    );
  }

  existing.push(entry);
  registry.set(params.model_name, existing);

  return entry;
}

/**
 * Retrieve all versions for a model.
 */
export function getModelVersions(modelName: string): ModelVersion[] {
  return registry.get(modelName) ?? [];
}

/**
 * Retrieve a specific version.
 */
export function getModelVersion(
  modelName: string,
  version: string,
): ModelVersion | undefined {
  return registry.get(modelName)?.find((v) => v.version === version);
}

/**
 * List all registered models and their latest versions.
 */
export function listModels(): Array<{ model_name: string; latest_version: string; total_versions: number }> {
  const result: Array<{ model_name: string; latest_version: string; total_versions: number }> = [];
  for (const [name, versions] of registry.entries()) {
    const latest = versions[versions.length - 1];
    result.push({
      model_name: name,
      latest_version: latest?.version ?? "N/A",
      total_versions: versions.length,
    });
  }
  return result;
}

/**
 * Clear the registry — useful for testing.
 */
export function clearRegistry(): void {
  registry.clear();
}
