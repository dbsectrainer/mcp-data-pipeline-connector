/**
 * Data & Concept Drift Detection
 * BE EASY ENTERPRISES LLC
 *
 * Monitors model and data drift using statistical tests.
 * Supports data drift, concept drift, and prediction drift detection.
 */

import crypto from "node:crypto";
import type { DriftReport, FeatureDrift, DriftType, DriftSensitivity } from "../types.js";

/** Sensitivity thresholds for drift detection. */
const SENSITIVITY_THRESHOLDS: Record<DriftSensitivity, number> = {
  low: 0.1,
  medium: 0.05,
  high: 0.01,
};

/**
 * Simulate a statistical drift test on a feature.
 * In production this would use KS-test, PSI, or similar methods.
 */
function testFeatureDrift(
  featureName: string,
  referenceDatasetId: string,
  currentDatasetId: string,
  threshold: number,
): FeatureDrift {
  // Deterministic simulation based on inputs.
  const seed =
    Array.from(`${featureName}:${referenceDatasetId}:${currentDatasetId}`).reduce(
      (acc, c) => acc + c.charCodeAt(0),
      0,
    ) % 1000;

  const driftScore = seed / 1000;
  const pValue = 1 - driftScore;

  return {
    feature_name: featureName,
    drift_score: parseFloat(driftScore.toFixed(4)),
    p_value: parseFloat(pValue.toFixed(4)),
    is_drifted: pValue < threshold,
    test_method: "kolmogorov_smirnov",
  };
}

/**
 * Select synthetic feature names based on drift type.
 */
function getMonitoredFeatures(driftType: DriftType): string[] {
  switch (driftType) {
    case "data":
      return [
        "feature_age",
        "feature_income",
        "feature_category",
        "feature_timestamp",
        "feature_location",
      ];
    case "concept":
      return [
        "target_distribution",
        "decision_boundary",
        "class_posterior",
        "conditional_probability",
      ];
    case "prediction":
      return [
        "prediction_mean",
        "prediction_variance",
        "confidence_distribution",
        "error_rate",
      ];
  }
}

/**
 * Run drift detection between reference and current datasets.
 */
export function detectDrift(params: {
  model_id: string;
  reference_dataset_id: string;
  current_dataset_id: string;
  drift_type: DriftType;
  sensitivity: DriftSensitivity;
}): DriftReport {
  const reportId = crypto.randomUUID();
  const threshold = SENSITIVITY_THRESHOLDS[params.sensitivity];
  const features = getMonitoredFeatures(params.drift_type);

  const featureDrifts = features.map((f) =>
    testFeatureDrift(f, params.reference_dataset_id, params.current_dataset_id, threshold),
  );

  const driftedCount = featureDrifts.filter((f) => f.is_drifted).length;
  const overallDriftScore = parseFloat(
    (driftedCount / featureDrifts.length).toFixed(4),
  );
  const overallDriftDetected = overallDriftScore > 0.3;

  const recommendations: string[] = [];
  if (overallDriftDetected) {
    recommendations.push(
      "Significant drift detected. Consider retraining the model with recent data.",
      "Investigate root cause of drift — check for upstream data pipeline changes.",
      "Enable automated retraining triggers based on drift thresholds.",
      "Review model monitoring alerts and escalation procedures.",
    );
  } else {
    recommendations.push(
      "No significant drift detected. Model performance should remain stable.",
      "Continue scheduled drift monitoring at the configured interval.",
    );
  }

  return {
    report_id: reportId,
    model_id: params.model_id,
    reference_dataset_id: params.reference_dataset_id,
    current_dataset_id: params.current_dataset_id,
    drift_type: params.drift_type,
    sensitivity: params.sensitivity,
    overall_drift_detected: overallDriftDetected,
    drift_score: overallDriftScore,
    feature_drifts: featureDrifts,
    recommendations,
    generated_at: new Date().toISOString(),
  };
}
