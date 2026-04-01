/**
 * Experiment Tracking & Comparison
 * BE EASY ENTERPRISES LLC
 *
 * Tracks ML experiments with parameters, metrics, and status.
 * Supports comparison across experiment runs.
 */

import crypto from "node:crypto";
import type { Experiment, ExperimentStatus } from "../types.js";

/** In-memory experiment store. */
const experiments = new Map<string, Experiment>();

/**
 * Create and track a new experiment run.
 */
export function trackExperiment(params: {
  experiment_name: string;
  parameters: Record<string, unknown>;
  metrics: Record<string, number>;
  status: ExperimentStatus;
}): Experiment {
  const experimentId = crypto.randomUUID();
  const now = new Date().toISOString();

  const experiment: Experiment = {
    experiment_id: experimentId,
    experiment_name: params.experiment_name,
    parameters: params.parameters,
    metrics: params.metrics,
    status: params.status,
    started_at: now,
    completed_at: params.status === "completed" || params.status === "failed"
      ? now
      : undefined,
    duration_seconds: params.status === "completed" || params.status === "failed"
      ? 0
      : undefined,
    artifacts: [],
    tags: {},
  };

  experiments.set(experimentId, experiment);
  return experiment;
}

/**
 * Get an experiment by ID.
 */
export function getExperiment(experimentId: string): Experiment | undefined {
  return experiments.get(experimentId);
}

/**
 * List experiments, optionally filtered by name.
 */
export function listExperiments(nameFilter?: string): Experiment[] {
  const all = Array.from(experiments.values());
  if (!nameFilter) return all;
  return all.filter((e) =>
    e.experiment_name.toLowerCase().includes(nameFilter.toLowerCase()),
  );
}

/**
 * Compare multiple experiments by their metrics.
 */
export function compareExperiments(
  experimentIds: string[],
): {
  experiments: Experiment[];
  metric_comparison: Record<string, Record<string, number>>;
} {
  const selected = experimentIds
    .map((id) => experiments.get(id))
    .filter((e): e is Experiment => e !== undefined);

  const allMetricNames = new Set<string>();
  for (const exp of selected) {
    for (const key of Object.keys(exp.metrics)) {
      allMetricNames.add(key);
    }
  }

  const comparison: Record<string, Record<string, number>> = {};
  for (const metricName of allMetricNames) {
    comparison[metricName] = {};
    for (const exp of selected) {
      if (metricName in exp.metrics) {
        comparison[metricName][exp.experiment_id] = exp.metrics[metricName];
      }
    }
  }

  return { experiments: selected, metric_comparison: comparison };
}

/**
 * Clear experiments — useful for testing.
 */
export function clearExperiments(): void {
  experiments.clear();
}
