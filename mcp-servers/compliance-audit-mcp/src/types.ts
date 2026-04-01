import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const FrameworkEnum = z.enum([
  "nist_800_53",
  "cmmc",
  "fedramp",
  "fisma",
  "hipaa",
  "sox",
]);
export type Framework = z.infer<typeof FrameworkEnum>;

export const SecurityCategorizationEnum = z.enum(["low", "moderate", "high"]);
export type SecurityCategorization = z.infer<typeof SecurityCategorizationEnum>;

export const AuditTypeEnum = z.enum([
  "annual",
  "quarterly",
  "ad_hoc",
  "poam",
]);
export type AuditType = z.infer<typeof AuditTypeEnum>;

export const POAMActionEnum = z.enum(["create", "update", "close", "list"]);
export type POAMAction = z.infer<typeof POAMActionEnum>;

export const ReportTypeEnum = z.enum([
  "ssp",
  "sar",
  "poam",
  "continuous_monitoring",
  "gap_analysis",
]);
export type ReportType = z.infer<typeof ReportTypeEnum>;

export const ReportFormatEnum = z.enum(["pdf", "json", "markdown"]);
export type ReportFormat = z.infer<typeof ReportFormatEnum>;

export const CheckCategoryEnum = z.enum([
  "access_control",
  "audit",
  "config_mgmt",
  "identification",
  "incident_response",
  "maintenance",
  "media_protection",
  "physical",
  "planning",
  "personnel",
  "risk_assessment",
  "system_acquisition",
  "system_protection",
  "system_integrity",
]);
export type CheckCategory = z.infer<typeof CheckCategoryEnum>;

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

export const SecurityControlSchema = z.object({
  id: z.string(),
  family: z.string(),
  title: z.string(),
  description: z.string(),
  framework: FrameworkEnum,
  baseline: SecurityCategorizationEnum.optional(),
  priority: z.enum(["P1", "P2", "P3"]).optional(),
  relatedControls: z.array(z.string()).default([]),
  crossFrameworkMappings: z
    .record(FrameworkEnum, z.array(z.string()))
    .optional(),
  implementationStatus: z
    .enum(["implemented", "partially_implemented", "planned", "not_applicable"])
    .optional(),
});
export type SecurityControl = z.infer<typeof SecurityControlSchema>;

export const SystemSecurityPlanSchema = z.object({
  id: z.string(),
  systemName: z.string(),
  authorizationBoundary: z.string(),
  informationTypes: z.array(z.string()),
  securityCategorization: SecurityCategorizationEnum,
  framework: FrameworkEnum,
  controls: z.array(SecurityControlSchema),
  generatedAt: z.string(),
  version: z.string(),
  preparedBy: z.string(),
  systemOwner: z.string().optional(),
  authorizingOfficial: z.string().optional(),
  continuousMonitoringStrategy: z.string().optional(),
});
export type SystemSecurityPlan = z.infer<typeof SystemSecurityPlanSchema>;

export const AuditEvidenceSchema = z.object({
  id: z.string(),
  controlId: z.string(),
  auditType: AuditTypeEnum,
  systemId: z.string(),
  title: z.string(),
  description: z.string(),
  collectedAt: z.string(),
  collectedBy: z.string(),
  artifactPaths: z.array(z.string()).default([]),
  status: z.enum(["collected", "reviewed", "approved", "rejected"]),
  findings: z.string().optional(),
  dateRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});
export type AuditEvidence = z.infer<typeof AuditEvidenceSchema>;

export const POAMSchema = z.object({
  id: z.string(),
  weaknessDescription: z.string(),
  controlId: z.string().optional(),
  systemId: z.string(),
  milestone: z.string(),
  scheduledCompletion: z.string(),
  status: z.enum(["open", "in_progress", "completed", "closed", "overdue"]),
  riskLevel: z.enum(["low", "moderate", "high", "critical"]).optional(),
  responsibleParty: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().optional(),
  comments: z.array(z.string()).default([]),
});
export type POAM = z.infer<typeof POAMSchema>;

export const ComplianceGapSchema = z.object({
  controlId: z.string(),
  currentFramework: FrameworkEnum,
  targetFramework: FrameworkEnum,
  gapDescription: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  remediationSteps: z.array(z.string()),
  estimatedEffort: z.string().optional(),
  mappedControls: z.array(z.string()).default([]),
});
export type ComplianceGap = z.infer<typeof ComplianceGapSchema>;

export const MonitoringResultSchema = z.object({
  systemId: z.string(),
  checkCategory: CheckCategoryEnum,
  status: z.enum(["pass", "fail", "warning", "error"]),
  details: z.string(),
  checkedAt: z.string(),
  controlsEvaluated: z.number(),
  controlsPassing: z.number(),
  findings: z.array(z.string()).default([]),
});
export type MonitoringResult = z.infer<typeof MonitoringResultSchema>;

export const AuditTrailEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: z.string(),
  actor: z.string(),
  resource: z.string(),
  resourceId: z.string(),
  details: z.record(z.unknown()).optional(),
  integrity: z.string(),
});
export type AuditTrailEntry = z.infer<typeof AuditTrailEntrySchema>;
