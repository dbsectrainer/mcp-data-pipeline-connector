/**
 * Automated evidence collection and organization engine.
 * BE EASY ENTERPRISES LLC
 *
 * Collects, catalogs, and organizes audit evidence against specific
 * controls for compliance audit readiness.
 */

import type {
  AuditEvidence,
  AuditType,
  CheckCategory,
  MonitoringResult,
} from "../types.js";
import { createAuditTrailEntry } from "../utils/audit-trail.js";

// ---------------------------------------------------------------------------
// Evidence collection result
// ---------------------------------------------------------------------------

export interface EvidenceCollectionResult {
  auditType: AuditType;
  systemId: string;
  dateRange: { start: string; end: string };
  totalControlsRequested: number;
  evidenceCollected: AuditEvidence[];
  missingEvidence: string[];
  collectionSummary: {
    collected: number;
    reviewed: number;
    gaps: number;
  };
  timestamp: string;
}

export interface MonitoringCheckResult {
  systemId: string;
  categoriesChecked: CheckCategory[];
  results: MonitoringResult[];
  overallStatus: "compliant" | "non_compliant" | "partial";
  complianceScore: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Evidence collector
// ---------------------------------------------------------------------------

/**
 * Simulate collecting evidence for the given controls.
 * In production this would integrate with GRC platforms, ticketing systems,
 * SIEM, and configuration management databases.
 */
export function collectEvidence(
  auditType: AuditType,
  controlIds: string[],
  systemId: string,
  dateRange: { start: string; end: string },
): EvidenceCollectionResult {
  const now = new Date().toISOString();
  const evidenceCollected: AuditEvidence[] = [];
  const missingEvidence: string[] = [];

  for (const controlId of controlIds) {
    const evidence = generateEvidenceForControl(
      controlId,
      auditType,
      systemId,
      dateRange,
      now,
    );
    if (evidence) {
      evidenceCollected.push(evidence);
    } else {
      missingEvidence.push(controlId);
    }
  }

  createAuditTrailEntry(
    "evidence_collection",
    "compliance-audit-mcp",
    "evidence",
    systemId,
    {
      auditType,
      controlIds,
      collected: evidenceCollected.length,
      missing: missingEvidence.length,
    },
  );

  return {
    auditType,
    systemId,
    dateRange,
    totalControlsRequested: controlIds.length,
    evidenceCollected,
    missingEvidence,
    collectionSummary: {
      collected: evidenceCollected.length,
      reviewed: evidenceCollected.filter((e) => e.status === "reviewed").length,
      gaps: missingEvidence.length,
    },
    timestamp: now,
  };
}

/**
 * Run continuous compliance monitoring checks for a system.
 */
export function runContinuousMonitoring(
  systemId: string,
  checkCategories: CheckCategory[],
): MonitoringCheckResult {
  const now = new Date().toISOString();
  const results: MonitoringResult[] = checkCategories.map((category) =>
    evaluateCategory(systemId, category, now),
  );

  const totalEvaluated = results.reduce(
    (sum, r) => sum + r.controlsEvaluated,
    0,
  );
  const totalPassing = results.reduce(
    (sum, r) => sum + r.controlsPassing,
    0,
  );
  const complianceScore =
    totalEvaluated > 0
      ? Math.round((totalPassing / totalEvaluated) * 100)
      : 0;

  const failCount = results.filter((r) => r.status === "fail").length;
  const overallStatus: MonitoringCheckResult["overallStatus"] =
    failCount === 0
      ? "compliant"
      : failCount === results.length
        ? "non_compliant"
        : "partial";

  createAuditTrailEntry(
    "continuous_monitoring",
    "compliance-audit-mcp",
    "monitoring",
    systemId,
    {
      categories: checkCategories,
      complianceScore,
      overallStatus,
    },
  );

  return {
    systemId,
    categoriesChecked: checkCategories,
    results,
    overallStatus,
    complianceScore,
    timestamp: now,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const categoryControlCounts: Record<CheckCategory, number> = {
  access_control: 5,
  audit: 3,
  config_mgmt: 3,
  identification: 2,
  incident_response: 2,
  maintenance: 2,
  media_protection: 2,
  physical: 3,
  planning: 2,
  personnel: 2,
  risk_assessment: 3,
  system_acquisition: 2,
  system_protection: 2,
  system_integrity: 3,
};

function evaluateCategory(
  systemId: string,
  category: CheckCategory,
  timestamp: string,
): MonitoringResult {
  const total = categoryControlCounts[category] ?? 2;
  // Deterministic "pass rate" based on category for reproducible results
  const passRate = hashRate(systemId, category);
  const passing = Math.round(total * passRate);
  const status = passing === total ? "pass" : passing === 0 ? "fail" : "warning";
  const findings: string[] = [];

  if (passing < total) {
    findings.push(
      `${total - passing} control(s) in ${category} require remediation for system ${systemId}.`,
    );
  }

  return {
    systemId,
    checkCategory: category,
    status,
    details: `Evaluated ${total} controls in ${category}: ${passing} passing, ${total - passing} failing.`,
    checkedAt: timestamp,
    controlsEvaluated: total,
    controlsPassing: passing,
    findings,
  };
}

function hashRate(systemId: string, category: string): number {
  // Simple deterministic hash for demo reproducibility
  let hash = 0;
  const str = `${systemId}:${category}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  // Return a value between 0.6 and 1.0 so most controls pass
  return 0.6 + (Math.abs(hash) % 40) / 100;
}

function generateEvidenceForControl(
  controlId: string,
  auditType: AuditType,
  systemId: string,
  dateRange: { start: string; end: string },
  timestamp: string,
): AuditEvidence | null {
  // Simulate evidence availability — in production, this queries real systems
  const family = controlId.split("-")[0];

  const evidenceTemplates: Record<string, () => Partial<AuditEvidence>> = {
    AC: () => ({
      title: `Access Control Evidence — ${controlId}`,
      description: `Access control logs, user provisioning records, and role-based access configuration for ${controlId}.`,
      artifactPaths: [
        `/evidence/${systemId}/access-logs/${dateRange.start}-${dateRange.end}.json`,
        `/evidence/${systemId}/rbac-config/current.yaml`,
      ],
      status: "collected" as const,
    }),
    AU: () => ({
      title: `Audit Log Evidence — ${controlId}`,
      description: `System audit logs, log aggregation configuration, and audit review documentation for ${controlId}.`,
      artifactPaths: [
        `/evidence/${systemId}/audit-logs/${dateRange.start}-${dateRange.end}.json`,
        `/evidence/${systemId}/siem-config/current.yaml`,
      ],
      status: "collected" as const,
    }),
    CM: () => ({
      title: `Configuration Management Evidence — ${controlId}`,
      description: `Baseline configuration documentation, change records, and configuration scan results for ${controlId}.`,
      artifactPaths: [
        `/evidence/${systemId}/cm-baseline/current.json`,
        `/evidence/${systemId}/change-records/${dateRange.start}-${dateRange.end}.json`,
      ],
      status: "reviewed" as const,
    }),
    IA: () => ({
      title: `Identification & Authentication Evidence — ${controlId}`,
      description: `Authentication configuration, MFA enrollment records, and identity management policies for ${controlId}.`,
      artifactPaths: [
        `/evidence/${systemId}/auth-config/current.json`,
        `/evidence/${systemId}/mfa-enrollment/report.csv`,
      ],
      status: "collected" as const,
    }),
    IR: () => ({
      title: `Incident Response Evidence — ${controlId}`,
      description: `Incident response plan, drill records, and incident tickets for ${controlId}.`,
      artifactPaths: [
        `/evidence/${systemId}/ir-plan/current.pdf`,
        `/evidence/${systemId}/ir-drills/${dateRange.start}-${dateRange.end}.json`,
      ],
      status: "collected" as const,
    }),
    RA: () => ({
      title: `Risk Assessment Evidence — ${controlId}`,
      description: `Risk assessment reports, vulnerability scan results, and risk register for ${controlId}.`,
      artifactPaths: [
        `/evidence/${systemId}/risk-assessment/latest.pdf`,
        `/evidence/${systemId}/vuln-scans/${dateRange.start}-${dateRange.end}.json`,
      ],
      status: "collected" as const,
    }),
    SC: () => ({
      title: `System Protection Evidence — ${controlId}`,
      description: `Network diagrams, boundary protection configurations, and encryption settings for ${controlId}.`,
      artifactPaths: [
        `/evidence/${systemId}/network-diagrams/current.png`,
        `/evidence/${systemId}/firewall-rules/current.json`,
      ],
      status: "collected" as const,
    }),
    SI: () => ({
      title: `System Integrity Evidence — ${controlId}`,
      description: `Patch management records, malware protection configuration, and integrity monitoring for ${controlId}.`,
      artifactPaths: [
        `/evidence/${systemId}/patch-records/${dateRange.start}-${dateRange.end}.json`,
        `/evidence/${systemId}/av-config/current.json`,
      ],
      status: "collected" as const,
    }),
  };

  const template = evidenceTemplates[family];
  if (!template) return null;

  const partial = template();
  return {
    id: `EVD-${systemId}-${controlId}-${Date.now()}`,
    controlId,
    auditType,
    systemId,
    title: partial.title ?? `Evidence for ${controlId}`,
    description: partial.description ?? "",
    collectedAt: timestamp,
    collectedBy: "compliance-audit-mcp",
    artifactPaths: partial.artifactPaths ?? [],
    status: partial.status ?? "collected",
    dateRange,
  };
}
