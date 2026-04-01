/**
 * Risk scoring and assessment engine.
 *
 * Evaluates risk factors across multiple assessment types (project, vendor,
 * compliance, cyber, financial) and produces weighted composite scores with
 * suggested mitigations.
 */

import { randomUUID } from "node:crypto";
import type {
  AssessmentType,
  RiskFactor,
  RiskMethodology,
  RiskMitigation,
  RiskScore,
} from "../types.js";

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function classifyRiskLevel(
  score: number,
): "critical" | "high" | "medium" | "low" | "minimal" {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 20) return "low";
  return "minimal";
}

function normalizeFactor(
  factor: { name: string; weight: number; value: number },
  methodology: RiskMethodology,
): RiskFactor {
  let normalizedScore: number;

  switch (methodology) {
    case "quantitative": {
      // Value is assumed to be on 0-100 scale; weight-adjust it
      normalizedScore = Math.min(100, Math.max(0, factor.value));
      break;
    }
    case "qualitative": {
      // Map qualitative 1-5 scale to 0-100
      normalizedScore = Math.min(100, Math.max(0, (factor.value / 5) * 100));
      break;
    }
    case "hybrid":
    default: {
      // Average of both approaches
      const quantScore = Math.min(100, Math.max(0, factor.value));
      const qualScore = Math.min(100, Math.max(0, (factor.value / 5) * 100));
      normalizedScore = (quantScore + qualScore) / 2;
      break;
    }
  }

  return {
    name: factor.name,
    weight: factor.weight,
    value: factor.value,
    normalized_score: Math.round(normalizedScore * 100) / 100,
    category: categorizeFactor(factor.name),
  };
}

function categorizeFactor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("cost") || lower.includes("budget") || lower.includes("financial")) {
    return "financial";
  }
  if (lower.includes("schedule") || lower.includes("timeline") || lower.includes("deadline")) {
    return "schedule";
  }
  if (lower.includes("security") || lower.includes("cyber") || lower.includes("threat")) {
    return "security";
  }
  if (lower.includes("compliance") || lower.includes("regulatory") || lower.includes("audit")) {
    return "compliance";
  }
  if (lower.includes("vendor") || lower.includes("supplier") || lower.includes("third-party")) {
    return "vendor";
  }
  return "operational";
}

// ---------------------------------------------------------------------------
// Mitigation generation
// ---------------------------------------------------------------------------

const MITIGATION_STRATEGIES: Record<string, string[]> = {
  financial: [
    "Establish contingency reserve fund at 10-15% of project budget",
    "Implement monthly cost variance analysis and earned value tracking",
    "Negotiate fixed-price subcontracts to transfer cost risk",
  ],
  schedule: [
    "Add schedule buffer of 15-20% to critical path activities",
    "Implement bi-weekly milestone reviews with stakeholders",
    "Identify fast-track and crash opportunities for critical tasks",
  ],
  security: [
    "Conduct quarterly penetration testing and vulnerability assessments",
    "Implement zero-trust architecture with continuous monitoring",
    "Establish incident response plan with tabletop exercises",
  ],
  compliance: [
    "Schedule pre-audit readiness assessments quarterly",
    "Maintain living compliance matrix with automated evidence collection",
    "Engage third-party compliance advisor for independent validation",
  ],
  vendor: [
    "Diversify supplier base to reduce single-vendor dependency",
    "Include performance SLAs with penalty/incentive clauses",
    "Conduct annual vendor risk assessments and financial health reviews",
  ],
  operational: [
    "Document and test business continuity procedures",
    "Cross-train team members on critical functions",
    "Implement automated monitoring with alerting thresholds",
  ],
};

function generateMitigations(factors: RiskFactor[]): RiskMitigation[] {
  const mitigations: RiskMitigation[] = [];

  // Sort factors by weighted impact descending
  const sorted = [...factors].sort(
    (a, b) => b.normalized_score * b.weight - a.normalized_score * a.weight,
  );

  for (const factor of sorted) {
    const strategies = MITIGATION_STRATEGIES[factor.category] ?? MITIGATION_STRATEGIES["operational"];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];

    const priority: "high" | "medium" | "low" =
      factor.normalized_score >= 70
        ? "high"
        : factor.normalized_score >= 40
          ? "medium"
          : "low";

    mitigations.push({
      factor: factor.name,
      strategy,
      priority,
      estimated_reduction: Math.round(factor.normalized_score * 0.3 * 100) / 100,
    });
  }

  return mitigations;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate a composite risk score for the given entity and factors.
 */
export async function calculateRiskScore(
  assessmentType: AssessmentType,
  entityId: string,
  factors: Array<{ name: string; weight: number; value: number }>,
  methodology: RiskMethodology,
): Promise<RiskScore> {
  // 1. Normalize each factor
  const normalizedFactors = factors.map((f) => normalizeFactor(f, methodology));

  // 2. Compute weighted composite score
  const totalWeight = normalizedFactors.reduce((sum, f) => sum + f.weight, 0);
  const weightedSum = normalizedFactors.reduce(
    (sum, f) => sum + f.normalized_score * f.weight,
    0,
  );
  const overallScore =
    totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 100) / 100
      : 0;

  // 3. Classify risk level
  const riskLevel = classifyRiskLevel(overallScore);

  // 4. Generate mitigations for high-risk factors
  const mitigations = generateMitigations(normalizedFactors);

  // 5. Compute confidence based on number of factors and weight distribution
  const factorCount = normalizedFactors.length;
  const weightVariance =
    factorCount > 1
      ? normalizedFactors.reduce(
          (sum, f) => sum + (f.weight - totalWeight / factorCount) ** 2,
          0,
        ) / factorCount
      : 0;
  const confidence = Math.min(
    0.99,
    Math.max(0.5, 0.7 + factorCount * 0.03 - weightVariance * 0.01),
  );

  return {
    id: randomUUID(),
    entity_id: entityId,
    assessment_type: assessmentType,
    methodology,
    overall_score: overallScore,
    risk_level: riskLevel,
    factors: normalizedFactors,
    mitigations,
    confidence: Math.round(confidence * 100) / 100,
    assessed_at: new Date().toISOString(),
  };
}
