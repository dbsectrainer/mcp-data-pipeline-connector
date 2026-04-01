/**
 * Cloud & DevSecOps MCP Server — Type Definitions
 * BE EASY ENTERPRISES LLC
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums & Shared Schemas
// ---------------------------------------------------------------------------

export const CloudProvider = z.enum(["aws", "azure", "gcp"]);
export type CloudProvider = z.infer<typeof CloudProvider>;

export const TemplateType = z.enum(["terraform", "cloudformation", "bicep"]);
export type TemplateType = z.infer<typeof TemplateType>;

export const Environment = z.enum(["dev", "staging", "prod", "govcloud"]);
export type Environment = z.infer<typeof Environment>;

export const BenchmarkScope = z.enum([
  "compute",
  "storage",
  "network",
  "iam",
  "all",
]);
export type BenchmarkScope = z.infer<typeof BenchmarkScope>;

export const CheckType = z.enum(["security_hub", "defender", "scc", "all"]);
export type CheckType = z.infer<typeof CheckType>;

export const CostGroupBy = z.enum(["service", "tag", "account", "region"]);
export type CostGroupBy = z.infer<typeof CostGroupBy>;

export const K8sScanType = z.enum([
  "rbac",
  "network_policies",
  "pod_security",
  "images",
  "all",
]);
export type K8sScanType = z.infer<typeof K8sScanType>;

export const SeverityThreshold = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "informational",
]);
export type SeverityThreshold = z.infer<typeof SeverityThreshold>;

export const ComplianceFramework = z.enum([
  "fedramp",
  "cis",
  "nist",
  "stig",
]);
export type ComplianceFramework = z.infer<typeof ComplianceFramework>;

// ---------------------------------------------------------------------------
// Tool Input Schemas
// ---------------------------------------------------------------------------

export const DeployInfrastructureInput = z.object({
  provider: CloudProvider,
  template_type: TemplateType,
  template: z.string().min(1, "Template must not be empty"),
  environment: Environment,
  dry_run: z.boolean().default(true),
});
export type DeployInfrastructureInput = z.infer<
  typeof DeployInfrastructureInput
>;

export const EnforceSecurityPoliciesInput = z.object({
  provider: CloudProvider,
  benchmark_version: z.string().min(1, "Benchmark version is required"),
  scope: BenchmarkScope,
  auto_remediate: z.boolean().default(false),
});
export type EnforceSecurityPoliciesInput = z.infer<
  typeof EnforceSecurityPoliciesInput
>;

export const MonitorCloudPostureInput = z.object({
  provider: CloudProvider,
  services: z.array(z.string().min(1)).min(1, "At least one service required"),
  check_type: CheckType,
});
export type MonitorCloudPostureInput = z.infer<typeof MonitorCloudPostureInput>;

export const TimePeriod = z.object({
  start: z.string().min(1, "Start date is required (YYYY-MM-DD)"),
  end: z.string().min(1, "End date is required (YYYY-MM-DD)"),
});
export type TimePeriod = z.infer<typeof TimePeriod>;

export const CostAnalysisInput = z.object({
  provider: CloudProvider,
  time_period: TimePeriod,
  group_by: CostGroupBy,
});
export type CostAnalysisInput = z.infer<typeof CostAnalysisInput>;

export const KubernetesSecurityScanInput = z.object({
  cluster_name: z.string().min(1, "Cluster name is required"),
  namespace: z.string().optional(),
  scan_type: K8sScanType,
});
export type KubernetesSecurityScanInput = z.infer<
  typeof KubernetesSecurityScanInput
>;

export const ContainerImageScanInput = z.object({
  image: z.string().min(1, "Image reference is required"),
  registry: z.string().optional(),
  severity_threshold: SeverityThreshold,
});
export type ContainerImageScanInput = z.infer<typeof ContainerImageScanInput>;

export const IacSecurityReviewInput = z.object({
  template: z.string().min(1, "Template content is required"),
  template_type: TemplateType,
  compliance_framework: ComplianceFramework,
});
export type IacSecurityReviewInput = z.infer<typeof IacSecurityReviewInput>;

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export interface DeploymentResult {
  deployment_id: string;
  status: "planned" | "deploying" | "deployed" | "failed" | "rolled_back";
  provider: CloudProvider;
  environment: Environment;
  resources_affected: number;
  dry_run: boolean;
  plan_output?: string;
  errors?: string[];
  timestamp: string;
}

export interface SecurityPolicyResult {
  provider: CloudProvider;
  benchmark_version: string;
  scope: BenchmarkScope;
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  findings: SecurityFinding[];
  remediation_applied: boolean;
  timestamp: string;
}

export interface SecurityFinding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  resource_type: string;
  resource_id: string;
  description: string;
  remediation: string;
  compliance_references: string[];
}

export interface CloudPostureResult {
  provider: CloudProvider;
  check_type: CheckType;
  services_scanned: string[];
  overall_score: number;
  findings: SecurityFinding[];
  recommendations: string[];
  timestamp: string;
}

export interface CostAnalysisResult {
  provider: CloudProvider;
  time_period: TimePeriod;
  total_cost: number;
  currency: string;
  breakdown: CostBreakdownItem[];
  optimization_recommendations: CostOptimization[];
  projected_savings: number;
  timestamp: string;
}

export interface CostBreakdownItem {
  key: string;
  cost: number;
  percentage: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface CostOptimization {
  category: string;
  description: string;
  estimated_monthly_savings: number;
  effort: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
}

export interface K8sSecurityResult {
  cluster_name: string;
  namespace?: string;
  scan_type: K8sScanType;
  total_issues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  findings: K8sFinding[];
  timestamp: string;
}

export interface K8sFinding {
  id: string;
  category: string;
  severity: string;
  resource_kind: string;
  resource_name: string;
  namespace: string;
  description: string;
  remediation: string;
}

export interface ContainerScanResult {
  image: string;
  registry?: string;
  scan_status: "completed" | "failed";
  total_vulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  vulnerabilities: ContainerVulnerability[];
  base_image_recommendation?: string;
  timestamp: string;
}

export interface ContainerVulnerability {
  cve_id: string;
  package_name: string;
  installed_version: string;
  fixed_version?: string;
  severity: string;
  description: string;
  cvss_score?: number;
}

export interface IacReviewResult {
  template_type: TemplateType;
  compliance_framework: ComplianceFramework;
  total_issues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  findings: IacFinding[];
  overall_compliance_score: number;
  timestamp: string;
}

export interface IacFinding {
  id: string;
  rule: string;
  severity: string;
  resource_path: string;
  description: string;
  remediation: string;
  compliance_reference: string;
}
