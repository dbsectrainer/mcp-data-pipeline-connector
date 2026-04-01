/**
 * Cybersecurity Operations MCP — Type Definitions
 * BE EASY ENTERPRISES LLC
 *
 * Core data structures for all security operations.
 */

// ---------------------------------------------------------------------------
// SIEM
// ---------------------------------------------------------------------------

export type SIEMSource = "splunk" | "sentinel" | "generic";

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface TimeRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

export interface SIEMAlert {
  id: string;
  source: SIEMSource;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: string;
  raw_event: Record<string, unknown>;
  indicators: string[];
  status: "new" | "in_progress" | "resolved" | "false_positive";
  assignee?: string;
  mitre_tactics?: string[];
  mitre_techniques?: string[];
}

export interface SIEMQueryResult {
  alerts: SIEMAlert[];
  total_count: number;
  query_time_ms: number;
  source: SIEMSource;
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Triage / Playbooks
// ---------------------------------------------------------------------------

export type PlaybookStatus = "completed" | "in_progress" | "failed" | "pending_approval";

export interface PlaybookStep {
  step_number: number;
  name: string;
  status: "success" | "failure" | "skipped" | "pending";
  details: string;
  timestamp: string;
}

export interface TriageResult {
  alert_id: string;
  playbook_name: string;
  status: PlaybookStatus;
  started_at: string;
  completed_at?: string;
  steps: PlaybookStep[];
  auto_remediated: boolean;
  summary: string;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Vulnerabilities
// ---------------------------------------------------------------------------

export interface CVSSScore {
  version: string;
  score: number;
  vector: string;
  severity: AlertSeverity;
}

export interface Vulnerability {
  cve_id: string;
  description: string;
  published_date: string;
  last_modified_date: string;
  cvss: CVSSScore;
  affected_products: string[];
  references: string[];
  weaknesses: string[];
  exploitability_score?: number;
  impact_score?: number;
}

export interface VulnerabilityQueryResult {
  vulnerabilities: Vulnerability[];
  total_results: number;
  results_per_page: number;
  start_index: number;
}

// ---------------------------------------------------------------------------
// MITRE ATT&CK
// ---------------------------------------------------------------------------

export interface MITRETechnique {
  id: string;
  name: string;
  description: string;
  tactics: string[];
  platforms: string[];
  detection: string;
  data_sources: string[];
  url: string;
}

export interface MITREMapping {
  techniques: MITRETechnique[];
  tactic_coverage: Record<string, number>;
  threat_summary: string;
  recommended_detections: string[];
  related_groups: string[];
}

// ---------------------------------------------------------------------------
// Incident Reports
// ---------------------------------------------------------------------------

export type ReportFormat = "soc2" | "fedramp" | "nist" | "internal";

export interface TimelineEntry {
  timestamp: string;
  event: string;
  actor: string;
  details: string;
}

export interface EvidenceItem {
  id: string;
  type: "log" | "screenshot" | "artifact" | "network_capture" | "memory_dump";
  description: string;
  hash_sha256: string;
  collected_at: string;
  chain_of_custody: string[];
}

export interface IncidentReport {
  incident_id: string;
  title: string;
  format: ReportFormat;
  generated_at: string;
  classification: "public" | "internal" | "confidential" | "restricted";
  executive_summary: string;
  technical_details: string;
  impact_assessment: string;
  timeline?: TimelineEntry[];
  evidence?: EvidenceItem[];
  remediation_steps: string[];
  lessons_learned: string[];
  compliance_mappings: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Threat Intelligence
// ---------------------------------------------------------------------------

export type IndicatorType = "ip" | "domain" | "hash" | "email" | "url";

export interface ThreatIntelSource {
  name: string;
  confidence: number; // 0-100
  last_updated: string;
}

export interface ThreatIntelResult {
  indicator: string;
  indicator_type: IndicatorType;
  malicious: boolean;
  risk_score: number; // 0-100
  sources: ThreatIntelSource[];
  tags: string[];
  first_seen?: string;
  last_seen?: string;
  associated_malware?: string[];
  associated_campaigns?: string[];
  geo_location?: {
    country: string;
    city?: string;
    asn?: string;
    org?: string;
  };
  whois?: Record<string, string>;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Security Posture
// ---------------------------------------------------------------------------

export type AssessmentScope = "full" | "network" | "endpoint" | "cloud" | "application";

export type AssessmentFramework = "nist_csf" | "cis" | "mitre";

export interface PostureCategory {
  name: string;
  score: number; // 0-100
  findings: PostureFinding[];
}

export interface PostureFinding {
  id: string;
  title: string;
  severity: AlertSeverity;
  description: string;
  affected_assets: string[];
  remediation: string;
  compliance_refs: string[];
}

export interface SecurityPosture {
  assessment_id: string;
  scope: AssessmentScope;
  framework: AssessmentFramework;
  overall_score: number; // 0-100
  assessed_at: string;
  categories: PostureCategory[];
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  recommendations: string[];
  next_assessment_due: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SIEMConfig {
  splunk?: {
    apiUrl: string;
    token: string;
    verifySsl: boolean;
  };
  sentinel?: {
    workspaceId: string;
    apiKey: string;
    tenantId: string;
    subscriptionId: string;
  };
}

export interface IntegrationConfig {
  siem: SIEMConfig;
  nvd: {
    apiKey: string;
    apiUrl: string;
  };
  threatIntel: {
    virusTotalApiKey?: string;
    abuseIpDbApiKey?: string;
    otxApiKey?: string;
  };
  encryption: {
    key: string;
    algorithm: string;
  };
}
