/**
 * Cybersecurity Operations MCP — Report Generator
 * BE EASY ENTERPRISES LLC
 *
 * Compliance-aware incident report generation for SOC2, FedRAMP, NIST,
 * and internal formats.
 */

import type {
  IncidentReport,
  ReportFormat,
  TimelineEntry,
  EvidenceItem,
} from "../types.js";

// ---------------------------------------------------------------------------
// Format-specific templates
// ---------------------------------------------------------------------------

const FORMAT_HEADERS: Record<ReportFormat, string> = {
  soc2: "SOC 2 Type II — Security Incident Report",
  fedramp: "FedRAMP Incident Response Report (IR-6 / IR-8)",
  nist: "NIST SP 800-61 Rev. 2 — Computer Security Incident Handling Report",
  internal: "Internal Security Incident Report — BE EASY ENTERPRISES LLC",
};

const COMPLIANCE_SECTIONS: Record<ReportFormat, string[]> = {
  soc2: [
    "CC6.1 — Logical and Physical Access Controls",
    "CC6.8 — Controls Against Malicious Software",
    "CC7.2 — Monitoring System Components for Anomalies",
    "CC7.3 — Detection and Response Procedures",
  ],
  fedramp: [
    "IR-4 — Incident Handling",
    "IR-5 — Incident Monitoring",
    "IR-6 — Incident Reporting",
    "IR-8 — Incident Response Plan",
    "AU-6 — Audit Review, Analysis, and Reporting",
  ],
  nist: [
    "Preparation",
    "Detection and Analysis",
    "Containment, Eradication, and Recovery",
    "Post-Incident Activity",
  ],
  internal: [
    "Executive Summary",
    "Technical Details",
    "Impact Assessment",
    "Remediation",
    "Lessons Learned",
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GenerateReportOptions {
  incident_id: string;
  format: ReportFormat;
  include_timeline: boolean;
  include_evidence: boolean;
}

/**
 * Generate a structured incident report.  In a production deployment this
 * would pull live data from the incident management system; here it returns
 * a well-formed scaffold that downstream consumers can populate.
 */
export function generateIncidentReport(options: GenerateReportOptions): IncidentReport {
  const now = new Date().toISOString();

  const timeline: TimelineEntry[] | undefined = options.include_timeline
    ? buildPlaceholderTimeline(options.incident_id, now)
    : undefined;

  const evidence: EvidenceItem[] | undefined = options.include_evidence
    ? buildPlaceholderEvidence(options.incident_id, now)
    : undefined;

  return {
    incident_id: options.incident_id,
    title: `Security Incident ${options.incident_id}`,
    format: options.format,
    generated_at: now,
    classification: "confidential",
    executive_summary: buildExecutiveSummary(options),
    technical_details: buildTechnicalDetails(options),
    impact_assessment: buildImpactAssessment(options),
    timeline,
    evidence,
    remediation_steps: [
      "Isolate affected systems from network",
      "Rotate compromised credentials",
      "Patch identified vulnerabilities",
      "Restore from verified clean backups",
      "Conduct post-incident review",
    ],
    lessons_learned: [
      "Improve detection rules for this attack vector",
      "Reduce mean-time-to-detect (MTTD) through enhanced monitoring",
      "Update incident response runbooks with new procedures",
    ],
    compliance_mappings: buildComplianceMappings(options.format),
  };
}

/** Return the human-readable header for a given format. */
export function getFormatHeader(format: ReportFormat): string {
  return FORMAT_HEADERS[format];
}

/** Return the compliance sections relevant to a given format. */
export function getComplianceSections(format: ReportFormat): string[] {
  return COMPLIANCE_SECTIONS[format];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildExecutiveSummary(options: GenerateReportOptions): string {
  const header = FORMAT_HEADERS[options.format];
  return (
    `${header}\n\n` +
    `This report documents the investigation and response to incident ` +
    `${options.incident_id}. The incident was detected, triaged, and ` +
    `handled in accordance with the organization's incident response plan ` +
    `and applicable compliance requirements.`
  );
}

function buildTechnicalDetails(options: GenerateReportOptions): string {
  return (
    `Incident ${options.incident_id} — technical analysis pending full ` +
    `data collection. This section will be populated with IOCs, affected ` +
    `systems, attack vectors, and forensic artifacts once the investigation ` +
    `is complete.`
  );
}

function buildImpactAssessment(_options: GenerateReportOptions): string {
  return (
    "Impact assessment is in progress. Initial analysis indicates the " +
    "scope of affected assets, data exposure, and business impact are " +
    "being quantified. A full BIA (Business Impact Analysis) will follow."
  );
}

function buildPlaceholderTimeline(incidentId: string, now: string): TimelineEntry[] {
  return [
    {
      timestamp: now,
      event: "Incident detected",
      actor: "SIEM automated rule",
      details: `Alert generated for incident ${incidentId}`,
    },
    {
      timestamp: now,
      event: "Triage initiated",
      actor: "SOC Analyst",
      details: "Initial triage and severity classification performed",
    },
    {
      timestamp: now,
      event: "Containment actions taken",
      actor: "Incident Response Team",
      details: "Affected systems isolated; credentials rotated",
    },
  ];
}

function buildPlaceholderEvidence(incidentId: string, now: string): EvidenceItem[] {
  return [
    {
      id: `EV-${incidentId}-001`,
      type: "log",
      description: "SIEM alert logs related to the incident",
      hash_sha256: "pending-collection",
      collected_at: now,
      chain_of_custody: ["SOC Analyst", "IR Lead"],
    },
    {
      id: `EV-${incidentId}-002`,
      type: "artifact",
      description: "Forensic disk image of affected host",
      hash_sha256: "pending-collection",
      collected_at: now,
      chain_of_custody: ["Forensics Team"],
    },
  ];
}

function buildComplianceMappings(format: ReportFormat): Record<string, string[]> {
  const sections = COMPLIANCE_SECTIONS[format];
  const mappings: Record<string, string[]> = {};
  for (const section of sections) {
    mappings[section] = [`Applicable to incident — see ${format.toUpperCase()} control mapping`];
  }
  return mappings;
}
