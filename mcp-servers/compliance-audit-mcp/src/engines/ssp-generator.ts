/**
 * System Security Plan (SSP) document generator.
 * BE EASY ENTERPRISES LLC
 *
 * Generates NIST/FedRAMP-compliant System Security Plans from
 * system metadata and mapped controls.
 */

import type {
  Framework,
  SecurityCategorization,
  SecurityControl,
  SystemSecurityPlan,
} from "../types.js";
import { mapControls } from "./control-mapper.js";
import { createAuditTrailEntry } from "../utils/audit-trail.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SSPGenerationResult {
  ssp: SystemSecurityPlan;
  controlCount: number;
  frameworkVersion: string;
  warnings: string[];
  timestamp: string;
}

/**
 * Generate a complete System Security Plan for a given system.
 */
export function generateSSP(
  systemName: string,
  authorizationBoundary: string,
  informationTypes: string[],
  securityCategorization: SecurityCategorization,
  framework: Framework,
): SSPGenerationResult {
  const now = new Date().toISOString();
  const warnings: string[] = [];

  // Retrieve applicable controls
  const mappingResult = mapControls(framework);
  let controls = mappingResult.controls;

  // Filter controls by baseline when applicable
  if (
    framework === "nist_800_53" ||
    framework === "fedramp" ||
    framework === "fisma"
  ) {
    controls = filterByBaseline(controls, securityCategorization);
    if (controls.length === 0) {
      warnings.push(
        `No controls matched the ${securityCategorization} baseline for ${framework}. Including all controls.`,
      );
      controls = mappingResult.controls;
    }
  }

  // Validate information types
  if (informationTypes.length === 0) {
    warnings.push(
      "No information types specified. SSP should document all information types processed by the system.",
    );
  }

  const sspId = `SSP-${systemName.replace(/\s+/g, "-").toUpperCase()}-${Date.now()}`;
  const frameworkVersion = getFrameworkVersion(framework);

  const ssp: SystemSecurityPlan = {
    id: sspId,
    systemName,
    authorizationBoundary,
    informationTypes,
    securityCategorization,
    framework,
    controls,
    generatedAt: now,
    version: "1.0.0",
    preparedBy: "BE EASY ENTERPRISES LLC — Compliance & Audit MCP",
    continuousMonitoringStrategy: buildCMStrategy(securityCategorization),
  };

  createAuditTrailEntry(
    "ssp_generation",
    "compliance-audit-mcp",
    "ssp",
    sspId,
    {
      systemName,
      framework,
      securityCategorization,
      controlCount: controls.length,
    },
  );

  return {
    ssp,
    controlCount: controls.length,
    frameworkVersion,
    warnings,
    timestamp: now,
  };
}

// ---------------------------------------------------------------------------
// SSP formatting helpers
// ---------------------------------------------------------------------------

/**
 * Render an SSP as a Markdown document.
 */
export function renderSSPMarkdown(ssp: SystemSecurityPlan): string {
  const lines: string[] = [
    `# System Security Plan`,
    ``,
    `**Document ID:** ${ssp.id}`,
    `**System Name:** ${ssp.systemName}`,
    `**Framework:** ${ssp.framework.toUpperCase()}`,
    `**Security Categorization:** ${ssp.securityCategorization.toUpperCase()}`,
    `**Prepared By:** ${ssp.preparedBy}`,
    `**Generated:** ${ssp.generatedAt}`,
    `**Version:** ${ssp.version}`,
    ``,
    `---`,
    ``,
    `## 1. System Description`,
    ``,
    `### Authorization Boundary`,
    ssp.authorizationBoundary,
    ``,
    `### Information Types`,
    ...ssp.informationTypes.map((t) => `- ${t}`),
    ``,
    `## 2. Security Controls`,
    ``,
    `Total controls: **${ssp.controls.length}**`,
    ``,
  ];

  // Group controls by family
  const families = new Map<string, SecurityControl[]>();
  for (const ctrl of ssp.controls) {
    const existing = families.get(ctrl.family) ?? [];
    existing.push(ctrl);
    families.set(ctrl.family, existing);
  }

  for (const [family, controls] of families.entries()) {
    lines.push(`### ${family}`);
    lines.push(``);
    for (const c of controls) {
      lines.push(`#### ${c.id} — ${c.title}`);
      lines.push(``);
      lines.push(c.description);
      if (c.priority) {
        lines.push(`- **Priority:** ${c.priority}`);
      }
      if (c.baseline) {
        lines.push(`- **Baseline:** ${c.baseline}`);
      }
      if (c.implementationStatus) {
        lines.push(`- **Status:** ${c.implementationStatus}`);
      }
      lines.push(``);
    }
  }

  if (ssp.continuousMonitoringStrategy) {
    lines.push(`## 3. Continuous Monitoring Strategy`);
    lines.push(``);
    lines.push(ssp.continuousMonitoringStrategy);
    lines.push(``);
  }

  return lines.join("\n");
}

/**
 * Render an SSP as a structured JSON document (for API consumption).
 */
export function renderSSPJSON(ssp: SystemSecurityPlan): string {
  return JSON.stringify(ssp, null, 2);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function filterByBaseline(
  controls: SecurityControl[],
  categorization: SecurityCategorization,
): SecurityControl[] {
  const levels: SecurityCategorization[] = ["low", "moderate", "high"];
  const threshold = levels.indexOf(categorization);
  return controls.filter((c) => {
    if (!c.baseline) return true; // Include controls without baseline designation
    return levels.indexOf(c.baseline) <= threshold;
  });
}

function getFrameworkVersion(framework: Framework): string {
  const versions: Record<Framework, string> = {
    nist_800_53: "Rev 5 (September 2020)",
    cmmc: "2.0 (November 2021)",
    fedramp: "Rev 5 Baselines (2023)",
    fisma: "2014 (as amended)",
    hipaa: "2013 Omnibus Rule",
    sox: "Section 404",
  };
  return versions[framework] ?? "Unknown";
}

function buildCMStrategy(categorization: SecurityCategorization): string {
  const frequencies: Record<SecurityCategorization, string> = {
    low: "Annual assessment of all controls with quarterly automated scanning.",
    moderate:
      "Semi-annual assessment of all controls with monthly automated scanning and continuous monitoring of high-priority controls.",
    high: "Quarterly assessment of all controls with weekly automated scanning, continuous monitoring of all high and moderate controls, and real-time alerting.",
  };

  return [
    `Continuous monitoring will follow the ${categorization.toUpperCase()} impact baseline requirements.`,
    frequencies[categorization],
    "All monitoring results will be reported to the Authorizing Official and documented in the POA&M as applicable.",
    "Vulnerability scans will be conducted per FedRAMP requirements and results remediated within the prescribed timeframes.",
  ].join(" ");
}
