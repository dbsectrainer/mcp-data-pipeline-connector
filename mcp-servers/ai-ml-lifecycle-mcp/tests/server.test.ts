/**
 * AI/ML Lifecycle MCP Server — Tests
 * BE EASY ENTERPRISES LLC
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerModelVersion, clearRegistry, getModelVersions } from "../src/tracking/model-registry.js";
import { trackExperiment, clearExperiments, listExperiments } from "../src/tracking/experiment-tracker.js";
import { runBiasDetection } from "../src/governance/bias-detector.js";
import { detectDrift } from "../src/governance/drift-monitor.js";
import { runGovernanceChecks } from "../src/governance/compliance-checker.js";
import { deployModel, clearDeployments } from "../src/deployment/secure-deployer.js";
import { queryDataLineage } from "../src/lineage/data-lineage.js";

// ---------------------------------------------------------------------------
// Model Registry
// ---------------------------------------------------------------------------

describe("Model Registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("should register a new model version", () => {
    const result = registerModelVersion({
      model_name: "fraud-detector",
      version: "1.0.0",
      framework: "pytorch",
      metrics: { accuracy: 0.95, f1: 0.92 },
      artifacts_path: "s3://models/fraud-detector/1.0.0",
      tags: { team: "ml-platform" },
    });

    expect(result.model_name).toBe("fraud-detector");
    expect(result.version).toBe("1.0.0");
    expect(result.framework).toBe("pytorch");
    expect(result.metrics.accuracy).toBe(0.95);
    expect(result.lineage_id).toBeDefined();
    expect(result.registered_at).toBeDefined();
    expect(result.checksum).toBeDefined();
  });

  it("should reject duplicate versions", () => {
    registerModelVersion({
      model_name: "fraud-detector",
      version: "1.0.0",
      framework: "pytorch",
      metrics: { accuracy: 0.95 },
    });

    expect(() =>
      registerModelVersion({
        model_name: "fraud-detector",
        version: "1.0.0",
        framework: "pytorch",
        metrics: { accuracy: 0.96 },
      }),
    ).toThrow(/already exists/);
  });

  it("should retrieve registered versions", () => {
    registerModelVersion({
      model_name: "recommender",
      version: "1.0.0",
      framework: "tensorflow",
      metrics: { ndcg: 0.88 },
    });

    registerModelVersion({
      model_name: "recommender",
      version: "2.0.0",
      framework: "tensorflow",
      metrics: { ndcg: 0.91 },
    });

    const versions = getModelVersions("recommender");
    expect(versions).toHaveLength(2);
    expect(versions[0].version).toBe("1.0.0");
    expect(versions[1].version).toBe("2.0.0");
  });
});

// ---------------------------------------------------------------------------
// Experiment Tracker
// ---------------------------------------------------------------------------

describe("Experiment Tracker", () => {
  beforeEach(() => {
    clearExperiments();
  });

  it("should track a new experiment", () => {
    const result = trackExperiment({
      experiment_name: "lr-sweep",
      parameters: { learning_rate: 0.001, batch_size: 32 },
      metrics: { accuracy: 0.93, loss: 0.15 },
      status: "completed",
    });

    expect(result.experiment_id).toBeDefined();
    expect(result.experiment_name).toBe("lr-sweep");
    expect(result.status).toBe("completed");
    expect(result.completed_at).toBeDefined();
  });

  it("should list experiments", () => {
    trackExperiment({
      experiment_name: "exp-alpha",
      parameters: {},
      metrics: { accuracy: 0.9 },
      status: "completed",
    });

    trackExperiment({
      experiment_name: "exp-beta",
      parameters: {},
      metrics: { accuracy: 0.92 },
      status: "running",
    });

    const all = listExperiments();
    expect(all).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Bias Detection
// ---------------------------------------------------------------------------

describe("Bias Detection", () => {
  it("should produce a bias report", () => {
    const result = runBiasDetection({
      model_id: "fraud-detector",
      dataset_id: "transactions-2025",
      protected_attributes: ["gender", "age"],
      fairness_metrics: ["demographic_parity", "equalized_odds"],
      threshold: 0.8,
    });

    expect(result.report_id).toBeDefined();
    expect(result.model_id).toBe("fraud-detector");
    expect(result.dataset_id).toBe("transactions-2025");
    expect(result.protected_attributes).toEqual(["gender", "age"]);
    expect(result.results).toHaveLength(2);
    expect(result.recommendations.length).toBeGreaterThan(0);

    for (const attrResult of result.results) {
      expect(attrResult.metrics).toHaveLength(2);
      for (const metric of attrResult.metrics) {
        expect(metric.threshold).toBe(0.8);
        expect(typeof metric.value).toBe("number");
        expect(typeof metric.passed).toBe("boolean");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Drift Detection
// ---------------------------------------------------------------------------

describe("Drift Detection", () => {
  it("should produce a drift report for data drift", () => {
    const result = detectDrift({
      model_id: "fraud-detector",
      reference_dataset_id: "baseline-2025-q1",
      current_dataset_id: "production-2025-q2",
      drift_type: "data",
      sensitivity: "medium",
    });

    expect(result.report_id).toBeDefined();
    expect(result.drift_type).toBe("data");
    expect(result.sensitivity).toBe("medium");
    expect(result.feature_drifts.length).toBeGreaterThan(0);
    expect(typeof result.overall_drift_detected).toBe("boolean");
    expect(typeof result.drift_score).toBe("number");
  });

  it("should handle concept drift detection", () => {
    const result = detectDrift({
      model_id: "sentiment-model",
      reference_dataset_id: "ref-data",
      current_dataset_id: "current-data",
      drift_type: "concept",
      sensitivity: "high",
    });

    expect(result.drift_type).toBe("concept");
    expect(result.feature_drifts.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Governance Checks
// ---------------------------------------------------------------------------

describe("Governance Checks", () => {
  it("should run governance checks and return results", () => {
    const result = runGovernanceChecks({
      model_id: "fraud-detector",
      checks: ["bias", "security", "compliance"],
    });

    expect(result.check_id).toBeDefined();
    expect(result.model_id).toBe("fraud-detector");
    expect(result.checks_requested).toEqual(["bias", "security", "compliance"]);
    expect(result.results).toHaveLength(3);
    expect(["low", "medium", "high", "critical"]).toContain(result.risk_level);

    for (const check of result.results) {
      expect(typeof check.passed).toBe("boolean");
      expect(typeof check.score).toBe("number");
      expect(check.framework_references.length).toBeGreaterThan(0);
    }
  });

  it("should include framework references for all check types", () => {
    const result = runGovernanceChecks({
      model_id: "test-model",
      checks: ["bias", "explainability", "security", "privacy", "compliance", "performance"],
    });

    expect(result.results).toHaveLength(6);
    for (const check of result.results) {
      expect(check.framework_references.length).toBeGreaterThan(0);
      // Verify NIST or EU AI Act references are present
      const hasFrameworkRef = check.framework_references.some(
        (ref) => ref.includes("NIST") || ref.includes("EU AI Act") || ref.includes("ISO"),
      );
      expect(hasFrameworkRef).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Secure Deployment
// ---------------------------------------------------------------------------

describe("Secure Deployment", () => {
  beforeEach(() => {
    clearDeployments();
  });

  it("should deploy a model with full security controls", () => {
    const result = deployModel({
      model_id: "fraud-detector",
      version: "1.0.0",
      target: "sagemaker",
      security_controls: {
        encryption: true,
        access_control: true,
        audit_logging: true,
        input_validation: true,
      },
    });

    expect(result.deployment_id).toBeDefined();
    expect(result.status).toBe("active");
    expect(result.endpoint_url).toContain("sagemaker");
    expect(result.health_check_url).toBeDefined();
    expect(result.security_warnings).toHaveLength(0);
  });

  it("should warn when security controls are disabled", () => {
    const result = deployModel({
      model_id: "test-model",
      version: "0.1.0",
      target: "kubernetes",
      security_controls: {
        encryption: false,
        access_control: false,
        audit_logging: false,
        input_validation: false,
      },
    });

    expect(result.security_warnings.length).toBeGreaterThan(0);
    expect(result.security_warnings.some((w) => w.includes("Encryption"))).toBe(true);
    expect(result.security_warnings.some((w) => w.includes("Access control"))).toBe(true);
  });

  it("should generate correct endpoint URLs per target", () => {
    const targets = ["sagemaker", "vertex_ai", "azure_ml", "kubernetes", "edge"] as const;

    for (const target of targets) {
      const result = deployModel({
        model_id: `model-${target}`,
        version: "1.0.0",
        target,
        security_controls: {
          encryption: true,
          access_control: true,
          audit_logging: true,
          input_validation: true,
        },
      });

      expect(result.endpoint_url).toBeDefined();
      expect(result.endpoint_url!.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Data Lineage
// ---------------------------------------------------------------------------

describe("Data Lineage", () => {
  it("should query dataset lineage", () => {
    const result = queryDataLineage({
      dataset_id: "transactions-2025",
      trace_direction: "full",
      include_transformations: true,
    });

    expect(result.root_id).toBeDefined();
    expect(result.direction).toBe("full");
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
    expect(result.queried_at).toBeDefined();
  });

  it("should query model lineage", () => {
    const result = queryDataLineage({
      model_id: "fraud-detector",
      trace_direction: "upstream",
      include_transformations: false,
    });

    expect(result.root_id).toBe("fraud-detector");
    expect(result.nodes.length).toBeGreaterThan(0);
    // No transformation nodes when include_transformations is false
    const transformNodes = result.nodes.filter((n) => n.type === "transformation");
    expect(transformNodes).toHaveLength(0);
  });

  it("should throw when neither dataset_id nor model_id provided", () => {
    expect(() =>
      queryDataLineage({
        trace_direction: "full",
        include_transformations: true,
      }),
    ).toThrow(/at least one/i);
  });
});
