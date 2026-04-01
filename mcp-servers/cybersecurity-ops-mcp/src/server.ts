/**
 * Cybersecurity Operations MCP — Main Server
 * BE EASY ENTERPRISES LLC
 *
 * Registers all MCP tools for cybersecurity operations:
 *   - siem_query_alerts
 *   - run_triage_playbook
 *   - query_vulnerabilities
 *   - mitre_attack_mapping
 *   - generate_incident_report
 *   - threat_intelligence_lookup
 *   - security_posture_assessment
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { SIEMClient } from "./integrations/siem-client.js";
import { VulnerabilityScanner } from "./integrations/vulnerability-scanner.js";
import { MITREAttackClient } from "./integrations/mitre-attack.js";
import { ThreatIntelClient } from "./integrations/threat-intel.js";
import { generateIncidentReport, getFormatHeader } from "./utils/report-generator.js";

import type {
  AlertSeverity,
  SIEMSource,
  TriageResult,
  PlaybookStep,
  ReportFormat,
  AssessmentScope,
  AssessmentFramework,
  SecurityPosture,
  PostureCategory,
} from "./types.js";

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function createServer(): McpServer {
  const server = new McpServer({
    name: "cybersecurity-ops-mcp",
    version: "1.0.0",
  });

  // Instantiate integration clients
  const siemClient = new SIEMClient();
  const vulnScanner = new VulnerabilityScanner();
  const mitreClient = new MITREAttackClient();
  const threatIntelClient = new ThreatIntelClient();

  // -----------------------------------------------------------------------
  // Tool: siem_query_alerts
  // -----------------------------------------------------------------------

  server.tool(
    "siem_query_alerts",
    "Query alerts from SIEM systems (Splunk, Microsoft Sentinel, or generic). Returns matching alerts with severity, MITRE mappings, and status.",
    {
      source: z.enum(["splunk", "sentinel", "generic"]).describe(
        "SIEM source to query",
      ),
      query: z.string().min(1, "Query must not be empty").describe(
        "Search query string (SPL for Splunk, KQL for Sentinel)",
      ),
      time_range: z.object({
        start: z.string().min(1, "Start time is required (ISO 8601)"),
        end: z.string().min(1, "End time is required (ISO 8601)"),
      }).describe("Time range for the query"),
      severity_filter: z.enum(["critical", "high", "medium", "low", "all"]).describe(
        "Filter alerts by severity level",
      ),
    },
    async ({ source, query, time_range, severity_filter }) => {
      try {
        const result = await siemClient.queryAlerts(
          source as SIEMSource,
          query,
          time_range,
          severity_filter as AlertSeverity | "all",
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: run_triage_playbook
  // -----------------------------------------------------------------------

  server.tool(
    "run_triage_playbook",
    "Execute an automated triage playbook against a specific alert. Supports auto-remediation when approved.",
    {
      alert_id: z.string().min(1, "Alert ID is required").describe(
        "The unique identifier of the alert to triage",
      ),
      playbook_name: z.string().min(1, "Playbook name is required").describe(
        "Name of the playbook to execute (e.g., 'phishing-response', 'malware-containment')",
      ),
      auto_remediate: z.boolean().describe(
        "Whether to automatically apply remediation steps",
      ),
    },
    async ({ alert_id, playbook_name, auto_remediate }) => {
      try {
        const result = executeTriagePlaybook(alert_id, playbook_name, auto_remediate);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: query_vulnerabilities
  // -----------------------------------------------------------------------

  server.tool(
    "query_vulnerabilities",
    "Search the CVE/NVD vulnerability database by CVE ID, keyword, severity, product, or date range.",
    {
      cve_id: z.string().optional().describe(
        "Specific CVE identifier (e.g., CVE-2024-12345)",
      ),
      keyword: z.string().optional().describe(
        "Search keyword for vulnerability descriptions",
      ),
      severity: z.enum(["critical", "high", "medium", "low"]).optional().describe(
        "Filter by CVSS severity",
      ),
      product: z.string().optional().describe(
        "Filter by affected product name",
      ),
      date_range: z.object({
        start: z.string().min(1),
        end: z.string().min(1),
      }).optional().describe("Filter by publication date range"),
    },
    async ({ cve_id, keyword, severity, product, date_range }) => {
      try {
        const result = await vulnScanner.queryVulnerabilities({
          cve_id,
          keyword,
          severity,
          product,
          date_range,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: mitre_attack_mapping
  // -----------------------------------------------------------------------

  server.tool(
    "mitre_attack_mapping",
    "Map threats to the MITRE ATT&CK framework by technique ID, tactic name, or free-text threat description.",
    {
      technique_id: z.string().optional().describe(
        "MITRE ATT&CK technique ID (e.g., T1190)",
      ),
      tactic: z.string().optional().describe(
        "Tactic name to search (e.g., 'Initial Access', 'Execution')",
      ),
      threat_description: z.string().optional().describe(
        "Free-text description of the observed threat",
      ),
    },
    async ({ technique_id, tactic, threat_description }) => {
      try {
        const result = await mitreClient.mapThreats({
          technique_id,
          tactic,
          threat_description,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: generate_incident_report
  // -----------------------------------------------------------------------

  server.tool(
    "generate_incident_report",
    "Generate a structured incident report in compliance formats (SOC2, FedRAMP, NIST, or internal).",
    {
      incident_id: z.string().min(1, "Incident ID is required").describe(
        "Unique identifier for the incident",
      ),
      format: z.enum(["soc2", "fedramp", "nist", "internal"]).describe(
        "Compliance format for the report",
      ),
      include_timeline: z.boolean().describe(
        "Whether to include event timeline",
      ),
      include_evidence: z.boolean().describe(
        "Whether to include evidence artifacts",
      ),
    },
    async ({ incident_id, format, include_timeline, include_evidence }) => {
      try {
        const report = generateIncidentReport({
          incident_id,
          format: format as ReportFormat,
          include_timeline,
          include_evidence,
        });

        const header = getFormatHeader(format as ReportFormat);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ header, report }, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: threat_intelligence_lookup
  // -----------------------------------------------------------------------

  server.tool(
    "threat_intelligence_lookup",
    "Look up an indicator of compromise (IOC) across configured threat intelligence feeds (VirusTotal, AbuseIPDB, OTX).",
    {
      indicator: z.string().min(1, "Indicator is required").describe(
        "The indicator value (IP, domain, hash, email, or URL)",
      ),
      indicator_type: z.enum(["ip", "domain", "hash", "email", "url"]).describe(
        "Type of the indicator",
      ),
    },
    async ({ indicator, indicator_type }) => {
      try {
        const result = await threatIntelClient.lookup(indicator, indicator_type);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: security_posture_assessment
  // -----------------------------------------------------------------------

  server.tool(
    "security_posture_assessment",
    "Assess the overall security posture across specified scope (full, network, endpoint, cloud, application) using a chosen framework (NIST CSF, CIS, MITRE).",
    {
      scope: z.enum(["full", "network", "endpoint", "cloud", "application"]).describe(
        "Scope of the security assessment",
      ),
      framework: z.enum(["nist_csf", "cis", "mitre"]).describe(
        "Security framework to assess against",
      ),
    },
    async ({ scope, framework }) => {
      try {
        const result = performPostureAssessment(
          scope as AssessmentScope,
          framework as AssessmentFramework,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: message }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Triage playbook execution (simulated)
// ---------------------------------------------------------------------------

function executeTriagePlaybook(
  alertId: string,
  playbookName: string,
  autoRemediate: boolean,
): TriageResult {
  const now = new Date().toISOString();

  const steps: PlaybookStep[] = [
    {
      step_number: 1,
      name: "Validate alert",
      status: "success",
      details: `Alert ${alertId} validated — confirmed not a duplicate.`,
      timestamp: now,
    },
    {
      step_number: 2,
      name: "Enrich indicators",
      status: "success",
      details: "IOCs extracted and enriched against threat intelligence feeds.",
      timestamp: now,
    },
    {
      step_number: 3,
      name: "Assess severity",
      status: "success",
      details: "Severity confirmed based on asset criticality and threat context.",
      timestamp: now,
    },
    {
      step_number: 4,
      name: "Containment",
      status: autoRemediate ? "success" : "pending",
      details: autoRemediate
        ? "Automated containment actions applied."
        : "Containment pending manual approval.",
      timestamp: now,
    },
    {
      step_number: 5,
      name: "Notification",
      status: "success",
      details: "Stakeholders notified via configured channels.",
      timestamp: now,
    },
  ];

  return {
    alert_id: alertId,
    playbook_name: playbookName,
    status: autoRemediate ? "completed" : "pending_approval",
    started_at: now,
    completed_at: autoRemediate ? now : undefined,
    steps,
    auto_remediated: autoRemediate,
    summary: autoRemediate
      ? `Playbook '${playbookName}' completed with auto-remediation for alert ${alertId}.`
      : `Playbook '${playbookName}' executed. Manual approval required for containment of alert ${alertId}.`,
    recommendations: [
      "Review containment actions and verify no lateral movement.",
      "Update detection rules based on observed TTPs.",
      "Schedule post-incident review within 48 hours.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Security posture assessment (simulated)
// ---------------------------------------------------------------------------

function performPostureAssessment(
  scope: AssessmentScope,
  framework: AssessmentFramework,
): SecurityPosture {
  const now = new Date().toISOString();
  const nextDue = new Date(Date.now() + 30 * 86400000).toISOString();

  const categories = buildPostureCategories(scope, framework);

  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const cat of categories) {
    for (const finding of cat.findings) {
      switch (finding.severity) {
        case "critical": critical++; break;
        case "high": high++; break;
        case "medium": medium++; break;
        case "low": low++; break;
      }
    }
  }

  const totalFindings = critical + high + medium + low;
  const overallScore = Math.max(
    0,
    100 - critical * 15 - high * 8 - medium * 3 - low * 1,
  );

  return {
    assessment_id: `ASSESS-${Date.now()}`,
    scope,
    framework,
    overall_score: overallScore,
    assessed_at: now,
    categories,
    critical_findings: critical,
    high_findings: high,
    medium_findings: medium,
    low_findings: low,
    recommendations: [
      "Address all critical findings within 24 hours.",
      "Remediate high-severity findings within 7 days.",
      "Schedule recurring assessments on a monthly cadence.",
      `Review ${framework.toUpperCase()} control mappings for gaps.`,
    ],
    next_assessment_due: nextDue,
  };
}

function buildPostureCategories(
  scope: AssessmentScope,
  framework: AssessmentFramework,
): PostureCategory[] {
  const baseCategories: Record<AssessmentScope, string[]> = {
    full: ["Identity & Access", "Network Security", "Endpoint Protection", "Cloud Security", "Application Security"],
    network: ["Firewall Configuration", "Segmentation", "Intrusion Detection", "DNS Security"],
    endpoint: ["Antivirus/EDR", "Patch Management", "Configuration Hardening", "Removable Media Controls"],
    cloud: ["IAM Policies", "Storage Encryption", "Network Controls", "Logging & Monitoring"],
    application: ["Input Validation", "Authentication", "Session Management", "Dependency Scanning"],
  };

  const categoryNames = baseCategories[scope];

  return categoryNames.map((name, idx) => ({
    name,
    score: 65 + Math.floor(Math.random() * 30),
    findings: [
      {
        id: `FINDING-${scope}-${idx + 1}`,
        title: `${name} — improvement recommended`,
        severity: idx === 0 ? "high" as const : "medium" as const,
        description: `Assessment of ${name.toLowerCase()} controls under ${framework.toUpperCase()} framework identified areas for improvement.`,
        affected_assets: [`${scope}-asset-${idx + 1}`],
        remediation: `Review and update ${name.toLowerCase()} controls per ${framework.toUpperCase()} guidelines.`,
        compliance_refs: [`${framework.toUpperCase()}-${idx + 1}`],
      },
    ],
  }));
}
