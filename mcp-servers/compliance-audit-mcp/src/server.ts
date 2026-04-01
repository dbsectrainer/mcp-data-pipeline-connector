/**
 * Compliance & Audit MCP Server — Tool Definitions
 * BE EASY ENTERPRISES LLC
 *
 * Exposes seven MCP tools for federal compliance workflows:
 * map_controls, generate_ssp, continuous_monitoring, collect_audit_evidence,
 * poam_management, compliance_gap_analysis, generate_audit_report.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FrameworkEnum,
  SecurityCategorizationEnum,
  AuditTypeEnum,
  POAMActionEnum,
  ReportTypeEnum,
  ReportFormatEnum,
  CheckCategoryEnum,
} from "./types.js";
import type { POAM, ComplianceGap } from "./types.js";
import { mapControls, getCrossMapping } from "./engines/control-mapper.js";
import {
  collectEvidence,
  runContinuousMonitoring,
} from "./engines/evidence-collector.js";
import {
  generateSSP,
  renderSSPMarkdown,
  renderSSPJSON,
} from "./engines/ssp-generator.js";
import { createAuditTrailEntry } from "./utils/audit-trail.js";

// ---------------------------------------------------------------------------
// In-memory POA&M store (production would use a persistent store)
// ---------------------------------------------------------------------------

const poamStore = new Map<string, POAM>();

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function createServer(): McpServer {
  const server = new McpServer({
    name: "compliance-audit-mcp",
    version: "1.0.0",
  });

  // -------------------------------------------------------------------------
  // Tool: map_controls
  // -------------------------------------------------------------------------
  server.tool(
    "map_controls",
    "Map security controls to systems across compliance frameworks (NIST 800-53, CMMC, FedRAMP, FISMA, HIPAA, SOX). Returns controls with cross-framework mappings.",
    {
      framework: FrameworkEnum,
      control_family: z
        .string()
        .optional()
        .describe("Control family ID to filter (e.g. AC, AU, CM)"),
      system_id: z
        .string()
        .optional()
        .describe("Target system identifier"),
    },
    async ({ framework, control_family, system_id }) => {
      const result = mapControls(framework, control_family, system_id);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: generate_ssp
  // -------------------------------------------------------------------------
  server.tool(
    "generate_ssp",
    "Generate a System Security Plan (SSP) document for a federal information system. Includes all applicable controls, authorization boundary, and continuous monitoring strategy.",
    {
      system_name: z.string().min(1, "System name is required"),
      authorization_boundary: z
        .string()
        .min(1, "Authorization boundary description is required"),
      information_types: z
        .array(z.string().min(1))
        .min(1, "At least one information type is required"),
      security_categorization: SecurityCategorizationEnum,
      framework: FrameworkEnum,
    },
    async ({
      system_name,
      authorization_boundary,
      information_types,
      security_categorization,
      framework,
    }) => {
      const result = generateSSP(
        system_name,
        authorization_boundary,
        information_types,
        security_categorization,
        framework,
      );

      const markdown = renderSSPMarkdown(result.ssp);

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `SSP generated for "${system_name}" (${framework.toUpperCase()} ${security_categorization.toUpperCase()})`,
              `Controls included: ${result.controlCount}`,
              `Framework version: ${result.frameworkVersion}`,
              result.warnings.length > 0
                ? `Warnings:\n${result.warnings.map((w) => `  - ${w}`).join("\n")}`
                : "",
              "",
              markdown,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: continuous_monitoring
  // -------------------------------------------------------------------------
  server.tool(
    "continuous_monitoring",
    "Run continuous compliance monitoring checks against a system. Evaluates controls across selected categories and returns compliance scores.",
    {
      system_id: z.string().min(1, "System ID is required"),
      check_categories: z
        .array(CheckCategoryEnum)
        .min(1, "At least one check category is required"),
    },
    async ({ system_id, check_categories }) => {
      const result = runContinuousMonitoring(system_id, check_categories);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: collect_audit_evidence
  // -------------------------------------------------------------------------
  server.tool(
    "collect_audit_evidence",
    "Collect and organize audit evidence for specific controls. Catalogs evidence artifacts and identifies gaps for audit readiness.",
    {
      audit_type: AuditTypeEnum,
      control_ids: z
        .array(z.string().min(1))
        .min(1, "At least one control ID is required"),
      system_id: z.string().min(1, "System ID is required"),
      date_range: z.object({
        start: z.string().min(1, "Start date is required (YYYY-MM-DD)"),
        end: z.string().min(1, "End date is required (YYYY-MM-DD)"),
      }),
    },
    async ({ audit_type, control_ids, system_id, date_range }) => {
      const result = collectEvidence(
        audit_type,
        control_ids,
        system_id,
        date_range,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: poam_management
  // -------------------------------------------------------------------------
  server.tool(
    "poam_management",
    "Manage Plan of Action & Milestones (POA&M) items. Create, update, close, or list POA&M entries for tracking compliance weaknesses and remediation.",
    {
      action: POAMActionEnum,
      poam_id: z.string().optional().describe("POA&M item ID (required for update/close)"),
      weakness_description: z
        .string()
        .optional()
        .describe("Description of the weakness (required for create)"),
      milestone: z.string().optional().describe("Milestone description"),
      scheduled_completion: z
        .string()
        .optional()
        .describe("Scheduled completion date (YYYY-MM-DD)"),
      system_id: z.string().optional().describe("System ID"),
      risk_level: z
        .enum(["low", "moderate", "high", "critical"])
        .optional()
        .describe("Risk level of the weakness"),
    },
    async ({
      action,
      poam_id,
      weakness_description,
      milestone,
      scheduled_completion,
      system_id,
      risk_level,
    }) => {
      const now = new Date().toISOString();

      switch (action) {
        case "create": {
          if (!weakness_description) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: weakness_description is required to create a POA&M item.",
                },
              ],
              isError: true,
            };
          }
          const id = `POAM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const poam: POAM = {
            id,
            weaknessDescription: weakness_description,
            systemId: system_id ?? "UNSPECIFIED",
            milestone: milestone ?? "Remediation pending",
            scheduledCompletion: scheduled_completion ?? "",
            status: "open",
            riskLevel: risk_level,
            createdAt: now,
            updatedAt: now,
            comments: [],
          };
          poamStore.set(id, poam);
          createAuditTrailEntry("poam_create", "compliance-audit-mcp", "poam", id, {
            weakness_description,
            system_id,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ message: "POA&M created", poam }, null, 2),
              },
            ],
          };
        }

        case "update": {
          if (!poam_id || !poamStore.has(poam_id)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: POA&M item "${poam_id ?? ""}" not found.`,
                },
              ],
              isError: true,
            };
          }
          const existing = poamStore.get(poam_id)!;
          const updated: POAM = {
            ...existing,
            weaknessDescription:
              weakness_description ?? existing.weaknessDescription,
            milestone: milestone ?? existing.milestone,
            scheduledCompletion:
              scheduled_completion ?? existing.scheduledCompletion,
            riskLevel: risk_level ?? existing.riskLevel,
            status: "in_progress",
            updatedAt: now,
          };
          poamStore.set(poam_id, updated);
          createAuditTrailEntry("poam_update", "compliance-audit-mcp", "poam", poam_id, {
            changes: { weakness_description, milestone, scheduled_completion, risk_level },
          });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ message: "POA&M updated", poam: updated }, null, 2),
              },
            ],
          };
        }

        case "close": {
          if (!poam_id || !poamStore.has(poam_id)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: POA&M item "${poam_id ?? ""}" not found.`,
                },
              ],
              isError: true,
            };
          }
          const toClose = poamStore.get(poam_id)!;
          const closed: POAM = {
            ...toClose,
            status: "closed",
            closedAt: now,
            updatedAt: now,
          };
          poamStore.set(poam_id, closed);
          createAuditTrailEntry("poam_close", "compliance-audit-mcp", "poam", poam_id);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ message: "POA&M closed", poam: closed }, null, 2),
              },
            ],
          };
        }

        case "list": {
          const items = Array.from(poamStore.values());
          const filtered = system_id
            ? items.filter((p) => p.systemId === system_id)
            : items;
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { total: filtered.length, items: filtered },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        default:
          return {
            content: [
              { type: "text" as const, text: `Unknown action: ${action}` },
            ],
            isError: true,
          };
      }
    },
  );

  // -------------------------------------------------------------------------
  // Tool: compliance_gap_analysis
  // -------------------------------------------------------------------------
  server.tool(
    "compliance_gap_analysis",
    "Analyze compliance gaps between a current framework and a target framework. Identifies missing controls, provides remediation steps, and estimates effort.",
    {
      current_framework: FrameworkEnum,
      target_framework: FrameworkEnum,
      system_id: z.string().min(1, "System ID is required"),
    },
    async ({ current_framework, target_framework, system_id }) => {
      const currentControls = mapControls(current_framework);
      const targetControls = mapControls(target_framework);

      // Find target controls not covered by current framework
      const currentControlIds = new Set(
        currentControls.controls.map((c) => c.id),
      );
      const gaps: ComplianceGap[] = [];

      for (const targetCtrl of targetControls.controls) {
        // Check if current framework covers this control via cross-mapping
        const crossMap = getCrossMapping(targetCtrl.id);
        const currentIds = crossMap
          ? (crossMap[current_framework as keyof typeof crossMap] ?? [])
          : [];

        const covered = currentIds.some((id) => currentControlIds.has(id));
        if (!covered) {
          gaps.push({
            controlId: targetCtrl.id,
            currentFramework: current_framework,
            targetFramework: target_framework,
            gapDescription: `Control ${targetCtrl.id} (${targetCtrl.title}) in ${target_framework.toUpperCase()} has no direct mapping from ${current_framework.toUpperCase()}.`,
            severity: targetCtrl.priority === "P1" ? "high" : "medium",
            remediationSteps: [
              `Review ${targetCtrl.id} requirements in ${target_framework.toUpperCase()} documentation.`,
              `Assess current system posture against ${targetCtrl.title}.`,
              `Implement required controls and document implementation details.`,
              `Collect evidence and validate compliance.`,
            ],
            estimatedEffort:
              targetCtrl.priority === "P1" ? "2-4 weeks" : "1-2 weeks",
            mappedControls: targetCtrl.relatedControls,
          });
        }
      }

      createAuditTrailEntry(
        "gap_analysis",
        "compliance-audit-mcp",
        "gap_analysis",
        system_id,
        { current_framework, target_framework, gapCount: gaps.length },
      );

      const result = {
        systemId: system_id,
        currentFramework: current_framework,
        targetFramework: target_framework,
        totalTargetControls: targetControls.totalControls,
        gapsIdentified: gaps.length,
        coveragePercentage: Math.round(
          ((targetControls.totalControls - gaps.length) /
            Math.max(targetControls.totalControls, 1)) *
            100,
        ),
        gaps,
        recommendations: [
          gaps.length === 0
            ? `Full coverage achieved between ${current_framework.toUpperCase()} and ${target_framework.toUpperCase()}.`
            : `${gaps.length} gap(s) identified. Prioritize P1 controls for remediation.`,
          "Consider engaging a 3PAO for independent assessment.",
          "Document all remediation activities in the POA&M.",
        ],
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: generate_audit_report
  // -------------------------------------------------------------------------
  server.tool(
    "generate_audit_report",
    "Generate a compliance audit report in the specified format. Supports SSP, SAR, POA&M, continuous monitoring, and gap analysis report types.",
    {
      report_type: ReportTypeEnum,
      system_id: z.string().min(1, "System ID is required"),
      format: ReportFormatEnum,
    },
    async ({ report_type, system_id, format }) => {
      const now = new Date().toISOString();

      createAuditTrailEntry(
        "report_generation",
        "compliance-audit-mcp",
        "report",
        system_id,
        { report_type, format },
      );

      const reportData = buildReportData(report_type, system_id, now);

      let output: string;
      switch (format) {
        case "json":
          output = JSON.stringify(reportData, null, 2);
          break;
        case "markdown":
          output = renderReportMarkdown(reportData, report_type);
          break;
        case "pdf":
          output = JSON.stringify(
            {
              ...reportData,
              note: "PDF generation would be handled by a document rendering service. Returning structured data for PDF rendering.",
              format: "pdf-ready",
            },
            null,
            2,
          );
          break;
        default:
          output = JSON.stringify(reportData, null, 2);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: output,
          },
        ],
      };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Report generation helpers
// ---------------------------------------------------------------------------

interface ReportData {
  reportId: string;
  reportType: string;
  systemId: string;
  generatedAt: string;
  generatedBy: string;
  sections: Record<string, unknown>;
}

function buildReportData(
  reportType: string,
  systemId: string,
  timestamp: string,
): ReportData {
  const reportId = `RPT-${reportType.toUpperCase()}-${systemId}-${Date.now()}`;
  const base: ReportData = {
    reportId,
    reportType,
    systemId,
    generatedAt: timestamp,
    generatedBy: "BE EASY ENTERPRISES LLC — Compliance & Audit MCP",
    sections: {},
  };

  switch (reportType) {
    case "ssp":
      base.sections = {
        systemDescription: `System Security Plan report for system ${systemId}.`,
        controlsSummary: "See generate_ssp tool for full SSP generation.",
        authorizationStatus: "Pending ATO review",
      };
      break;
    case "sar":
      base.sections = {
        assessmentScope: `Security Assessment Report for system ${systemId}.`,
        methodology: "NIST SP 800-53A assessment procedures",
        findings: "Assessment findings populated from continuous monitoring data.",
        riskSummary: "Overall risk posture: Moderate",
        recommendations: [
          "Address all high-severity findings within 30 days.",
          "Update POA&M with remediation milestones.",
        ],
      };
      break;
    case "poam":
      base.sections = {
        summary: `POA&M report for system ${systemId}.`,
        items: Array.from(poamStore.values()).filter(
          (p) => p.systemId === systemId || systemId === "all",
        ),
        statistics: {
          total: poamStore.size,
          open: Array.from(poamStore.values()).filter((p) => p.status === "open").length,
          inProgress: Array.from(poamStore.values()).filter(
            (p) => p.status === "in_progress",
          ).length,
          closed: Array.from(poamStore.values()).filter((p) => p.status === "closed").length,
        },
      };
      break;
    case "continuous_monitoring":
      base.sections = {
        summary: `Continuous monitoring report for system ${systemId}.`,
        note: "Use the continuous_monitoring tool to generate fresh monitoring data.",
        lastAssessment: timestamp,
      };
      break;
    case "gap_analysis":
      base.sections = {
        summary: `Gap analysis report for system ${systemId}.`,
        note: "Use the compliance_gap_analysis tool to generate detailed gap data.",
      };
      break;
  }

  return base;
}

function renderReportMarkdown(
  data: ReportData,
  reportType: string,
): string {
  const lines: string[] = [
    `# ${reportType.toUpperCase()} Report`,
    ``,
    `**Report ID:** ${data.reportId}`,
    `**System:** ${data.systemId}`,
    `**Generated:** ${data.generatedAt}`,
    `**Prepared By:** ${data.generatedBy}`,
    ``,
    `---`,
    ``,
  ];

  for (const [key, value] of Object.entries(data.sections)) {
    lines.push(`## ${key.replace(/([A-Z])/g, " $1").trim()}`);
    lines.push(``);
    if (typeof value === "string") {
      lines.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        lines.push(
          typeof item === "string"
            ? `- ${item}`
            : `- ${JSON.stringify(item)}`,
        );
      }
    } else {
      lines.push("```json");
      lines.push(JSON.stringify(value, null, 2));
      lines.push("```");
    }
    lines.push(``);
  }

  return lines.join("\n");
}
