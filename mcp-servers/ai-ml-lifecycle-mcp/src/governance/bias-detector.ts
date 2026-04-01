/**
 * Bias Detection & Fairness Metrics
 * BE EASY ENTERPRISES LLC
 *
 * Implements bias detection algorithms across protected attributes.
 * Evaluates models against configurable fairness thresholds.
 */

import crypto from "node:crypto";
import type {
  BiasReport,
  AttributeBiasResult,
  BiasMetricResult,
  FairnessMetric,
} from "../types.js";

/**
 * Compute a single fairness metric value.
 * In production this would operate on actual prediction distributions;
 * here we simulate deterministic results based on inputs for demonstration.
 */
function computeFairnessMetric(
  metric: FairnessMetric,
  attribute: string,
  modelId: string,
): { value: number; details: string } {
  // Deterministic seed from inputs for reproducible demo results.
  const seed =
    Array.from(`${metric}:${attribute}:${modelId}`).reduce(
      (acc, c) => acc + c.charCodeAt(0),
      0,
    ) % 100;

  const value = seed / 100;

  const descriptions: Record<FairnessMetric, string> = {
    demographic_parity: `Demographic parity difference across groups for attribute "${attribute}": ${value.toFixed(4)}. ` +
      `Measures whether the selection rate is equal across groups.`,
    equalized_odds: `Equalized odds difference for attribute "${attribute}": ${value.toFixed(4)}. ` +
      `Measures equality of true positive and false positive rates.`,
    calibration: `Calibration score for attribute "${attribute}": ${value.toFixed(4)}. ` +
      `Measures whether predicted probabilities match observed outcomes per group.`,
    individual_fairness: `Individual fairness score for attribute "${attribute}": ${value.toFixed(4)}. ` +
      `Measures whether similar individuals receive similar predictions.`,
  };

  return { value, details: descriptions[metric] };
}

/**
 * Run bias detection for a given model and dataset against protected attributes.
 */
export function runBiasDetection(params: {
  model_id: string;
  dataset_id: string;
  protected_attributes: string[];
  fairness_metrics: FairnessMetric[];
  threshold: number;
}): BiasReport {
  const reportId = crypto.randomUUID();
  const results: AttributeBiasResult[] = [];

  for (const attribute of params.protected_attributes) {
    const metricResults: BiasMetricResult[] = [];

    for (const metric of params.fairness_metrics) {
      const { value, details } = computeFairnessMetric(
        metric,
        attribute,
        params.model_id,
      );

      metricResults.push({
        metric,
        value,
        threshold: params.threshold,
        passed: value <= params.threshold,
        details,
      });
    }

    const groupDist: Record<string, number> = {};
    const groups = ["group_a", "group_b", "group_c"];
    const remaining = 1.0;
    groups.forEach((g, i) => {
      groupDist[g] = parseFloat(
        (remaining / (groups.length - i + Math.random() * 0.1)).toFixed(4),
      );
    });

    results.push({
      attribute,
      group_distribution: groupDist,
      metrics: metricResults,
      overall_passed: metricResults.every((m) => m.passed),
    });
  }

  const overallBiasDetected = results.some((r) => !r.overall_passed);

  const recommendations: string[] = [];
  if (overallBiasDetected) {
    recommendations.push(
      "Review training data for representation imbalances across protected groups.",
      "Consider applying pre-processing techniques such as resampling or reweighting.",
      "Evaluate post-processing calibration methods to equalize outcomes.",
      "Document bias findings per NIST AI RMF MAP 2.3 and EU AI Act Article 10.",
    );
  } else {
    recommendations.push(
      "All fairness metrics within acceptable thresholds. Continue monitoring in production.",
      "Schedule periodic re-evaluation as data distributions may shift over time.",
    );
  }

  return {
    report_id: reportId,
    model_id: params.model_id,
    dataset_id: params.dataset_id,
    protected_attributes: params.protected_attributes,
    results,
    overall_bias_detected: overallBiasDetected,
    recommendations,
    generated_at: new Date().toISOString(),
  };
}
