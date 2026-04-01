/**
 * AI/ML Compliance Checking
 * BE EASY ENTERPRISES LLC
 *
 * Evaluates models against governance frameworks including
 * NIST AI RMF and EU AI Act requirements.
 */

import crypto from "node:crypto";
import type {
  GovernanceCheck,
  GovernanceCheckResult,
  GovernanceCheckType,
} from "../types.js";

/**
 * Framework references for each check type.
 */
const FRAMEWORK_REFERENCES: Record<GovernanceCheckType, string[]> = {
  bias: [
    "NIST AI RMF MAP 2.3 — Bias identification and management",
    "EU AI Act Article 10 — Data and data governance",
    "ISO/IEC 24027 — Bias in AI systems",
  ],
  explainability: [
    "NIST AI RMF GOVERN 1.4 — Transparency and documentation",
    "EU AI Act Article 13 — Transparency and provision of information",
    "ISO/IEC 22989 — AI concepts and terminology (explainability)",
  ],
  security: [
    "NIST AI RMF MAP 3.4 — Security and resilience",
    "EU AI Act Article 15 — Accuracy, robustness, and cybersecurity",
    "NIST SP 800-53 — Security controls for AI systems",
  ],
  privacy: [
    "NIST AI RMF GOVERN 1.6 — Privacy risk management",
    "EU AI Act Article 10(5) — Processing of special categories of personal data",
    "NIST Privacy Framework 1.0",
  ],
  compliance: [
    "NIST AI RMF GOVERN 1.1 — Legal and regulatory requirements",
    "EU AI Act Article 9 — Risk management system",
    "FedRAMP AI Authorization Requirements",
  ],
  performance: [
    "NIST AI RMF MEASURE 2.6 — Performance evaluation",
    "EU AI Act Article 15(1) — Accuracy requirements",
    "ISO/IEC 25010 — Systems and software quality requirements",
  ],
};

/**
 * Simulate a governance check for a given type.
 * In production, each check would integrate with actual testing infrastructure.
 */
function runSingleCheck(
  modelId: string,
  checkType: GovernanceCheckType,
): GovernanceCheckResult {
  // Deterministic simulation based on inputs.
  const seed =
    Array.from(`${checkType}:${modelId}`).reduce(
      (acc, c) => acc + c.charCodeAt(0),
      0,
    ) % 100;

  const score = seed / 100;
  const passed = score >= 0.6;

  const findingsMap: Record<GovernanceCheckType, string[]> = {
    bias: passed
      ? ["No significant bias detected in protected attribute analysis."]
      : [
          "Potential disparate impact detected for age group 55+.",
          "Representation gap found in training data for minority classes.",
        ],
    explainability: passed
      ? ["Model provides feature importance scores for all predictions."]
      : [
          "Model lacks global interpretability — consider SHAP or LIME integration.",
          "No documentation of prediction rationale for high-risk decisions.",
        ],
    security: passed
      ? ["Model artifacts are encrypted at rest and in transit."]
      : [
          "Model endpoint lacks input validation — susceptible to adversarial inputs.",
          "No rate limiting configured on inference endpoint.",
        ],
    privacy: passed
      ? ["No PII detected in model features or training data."]
      : [
          "Training data may contain quasi-identifiers enabling re-identification.",
          "Differential privacy mechanisms not implemented.",
        ],
    compliance: passed
      ? ["Model documentation meets regulatory requirements."]
      : [
          "Missing model card documentation required by organizational policy.",
          "Audit trail incomplete for training data provenance.",
        ],
    performance: passed
      ? ["Model meets minimum accuracy and latency requirements."]
      : [
          "Model accuracy below threshold for production deployment (< 0.85).",
          "Inference latency exceeds SLA p99 target of 200ms.",
        ],
  };

  const recommendationsMap: Record<GovernanceCheckType, string[]> = {
    bias: [
      "Schedule regular bias audits on a quarterly cadence.",
      "Implement pre-deployment bias testing in CI/CD pipeline.",
    ],
    explainability: [
      "Generate model cards for all production models.",
      "Implement SHAP-based explanations for high-stakes predictions.",
    ],
    security: [
      "Enable model signing and verification for artifact integrity.",
      "Implement adversarial robustness testing before deployment.",
    ],
    privacy: [
      "Apply differential privacy during training where applicable.",
      "Conduct Privacy Impact Assessment before processing personal data.",
    ],
    compliance: [
      "Maintain up-to-date model inventory per NIST AI RMF GOVERN 1.1.",
      "Automate compliance evidence collection for audit readiness.",
    ],
    performance: [
      "Set automated alerting for performance degradation beyond thresholds.",
      "Implement A/B testing framework for safe model rollouts.",
    ],
  };

  return {
    check_type: checkType,
    passed,
    score: parseFloat(score.toFixed(4)),
    findings: findingsMap[checkType],
    recommendations: recommendationsMap[checkType],
    framework_references: FRAMEWORK_REFERENCES[checkType],
  };
}

/**
 * Run a full governance check suite on a model.
 */
export function runGovernanceChecks(params: {
  model_id: string;
  checks: GovernanceCheckType[];
}): GovernanceCheck {
  const checkId = crypto.randomUUID();

  const results = params.checks.map((check) =>
    runSingleCheck(params.model_id, check),
  );

  const overallPassed = results.every((r) => r.passed);
  const avgScore =
    results.reduce((sum, r) => sum + r.score, 0) / results.length;

  let riskLevel: "low" | "medium" | "high" | "critical";
  if (avgScore >= 0.8) riskLevel = "low";
  else if (avgScore >= 0.6) riskLevel = "medium";
  else if (avgScore >= 0.4) riskLevel = "high";
  else riskLevel = "critical";

  return {
    check_id: checkId,
    model_id: params.model_id,
    checks_requested: params.checks,
    results,
    overall_passed: overallPassed,
    risk_level: riskLevel,
    generated_at: new Date().toISOString(),
  };
}
