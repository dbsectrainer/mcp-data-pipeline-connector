/**
 * Infrastructure-as-Code Security Scanner
 * Scans IaC templates against compliance frameworks (FedRAMP, CIS, NIST, STIG).
 * BE EASY ENTERPRISES LLC
 */

import type {
  TemplateType,
  ComplianceFramework,
  IacReviewResult,
  IacFinding,
} from "../types.js";

/** A single IaC scanning rule. */
interface IacRule {
  id: string;
  rule: string;
  severity: IacFinding["severity"];
  frameworks: ComplianceFramework[];
  templateTypes: TemplateType[];
  pattern: RegExp;
  negativeMatch: boolean; // true = finding if pattern is NOT found
  description: string;
  remediation: string;
  complianceReference: string;
}

/**
 * The IacScanner applies regex-based heuristic rules to IaC template content.
 * In production this would integrate with tools like Checkov, tfsec, or cfn-nag;
 * the scanner provides fast, offline feedback suitable for an MCP tool response.
 */
export class IacScanner {
  private readonly rules: IacRule[];

  constructor() {
    this.rules = this.buildRuleCatalog();
  }

  /**
   * Scan a template string and return structured findings.
   */
  scan(
    template: string,
    templateType: TemplateType,
    complianceFramework: ComplianceFramework,
  ): IacReviewResult {
    const applicableRules = this.rules.filter(
      (rule) =>
        rule.templateTypes.includes(templateType) &&
        rule.frameworks.includes(complianceFramework),
    );

    const findings: IacFinding[] = [];

    for (const rule of applicableRules) {
      const matched = rule.pattern.test(template);
      const hasFinding = rule.negativeMatch ? !matched : matched;

      if (hasFinding) {
        findings.push({
          id: rule.id,
          rule: rule.rule,
          severity: rule.severity,
          resource_path: this.extractResourcePath(template, rule.pattern, templateType),
          description: rule.description,
          remediation: rule.remediation,
          compliance_reference: rule.complianceReference,
        });
      }
    }

    const critical = findings.filter((f) => f.severity === "critical").length;
    const high = findings.filter((f) => f.severity === "high").length;
    const medium = findings.filter((f) => f.severity === "medium").length;
    const low = findings.filter((f) => f.severity === "low").length;
    const total = findings.length;

    // Score: start at 100 and deduct based on severity
    const deductions = critical * 20 + high * 10 + medium * 5 + low * 2;
    const score = Math.max(0, 100 - deductions);

    return {
      template_type: templateType,
      compliance_framework: complianceFramework,
      total_issues: total,
      critical,
      high,
      medium,
      low,
      findings,
      overall_compliance_score: score,
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private extractResourcePath(
    template: string,
    pattern: RegExp,
    templateType: TemplateType,
  ): string {
    const match = pattern.exec(template);
    if (match) {
      // Return a few characters of context around the match
      const start = Math.max(0, match.index - 20);
      const end = Math.min(template.length, match.index + match[0].length + 20);
      return template.slice(start, end).replace(/\n/g, " ").trim();
    }
    return templateType === "terraform" ? "main.tf" : "template";
  }

  // ---------------------------------------------------------------------------
  // Rule Catalog
  // ---------------------------------------------------------------------------

  private buildRuleCatalog(): IacRule[] {
    return [
      // --- Encryption at rest ---
      {
        id: "IAC-ENC-001",
        rule: "encryption-at-rest-required",
        severity: "critical",
        frameworks: ["fedramp", "cis", "nist", "stig"],
        templateTypes: ["terraform", "cloudformation", "bicep"],
        pattern: /encrypt(?:ion|ed)[\s_-]*(?:at[\s_-]*rest|enabled|true|configuration)/i,
        negativeMatch: true,
        description:
          "No encryption-at-rest configuration detected. All data stores must encrypt data at rest.",
        remediation:
          "Add encryption configuration blocks (e.g., server_side_encryption_configuration for S3, encrypted = true for EBS).",
        complianceReference: "NIST SC-28 / FedRAMP SC-28",
      },

      // --- Public access ---
      {
        id: "IAC-PUB-001",
        rule: "no-public-access",
        severity: "critical",
        frameworks: ["fedramp", "cis", "nist", "stig"],
        templateTypes: ["terraform", "cloudformation", "bicep"],
        pattern: /(?:public[\s_-]*access|0\.0\.0\.0\/0|::\s*\/0|\*\.\*\.\*\.\*|publicly[\s_-]*accessible\s*[:=]\s*true)/i,
        negativeMatch: false,
        description:
          "Template contains public access patterns (0.0.0.0/0, publicly_accessible = true). Resources should not be publicly exposed.",
        remediation:
          "Remove public access grants. Use private subnets, VPC endpoints, and load balancers for controlled access.",
        complianceReference: "NIST AC-3 / FedRAMP AC-3",
      },

      // --- Logging ---
      {
        id: "IAC-LOG-001",
        rule: "logging-enabled",
        severity: "high",
        frameworks: ["fedramp", "cis", "nist", "stig"],
        templateTypes: ["terraform", "cloudformation", "bicep"],
        pattern: /(?:logging|access_log|audit_log|flow_log|trail)/i,
        negativeMatch: true,
        description:
          "No logging configuration detected. All resources should have audit/access logging enabled.",
        remediation:
          "Add logging configuration (e.g., CloudTrail, VPC Flow Logs, access logging for storage buckets).",
        complianceReference: "NIST AU-2 / FedRAMP AU-2",
      },

      // --- Hardcoded secrets ---
      {
        id: "IAC-SEC-001",
        rule: "no-hardcoded-secrets",
        severity: "critical",
        frameworks: ["fedramp", "cis", "nist", "stig"],
        templateTypes: ["terraform", "cloudformation", "bicep"],
        pattern: /(?:password|secret|api_key|access_key)\s*[:=]\s*["'][^"']{8,}["']/i,
        negativeMatch: false,
        description:
          "Potential hardcoded secret detected in template. Secrets must never be stored in IaC templates.",
        remediation:
          "Use a secrets manager (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) or environment variables.",
        complianceReference: "NIST SC-12 / FedRAMP SC-12",
      },

      // --- TLS / in-transit encryption ---
      {
        id: "IAC-TLS-001",
        rule: "enforce-tls",
        severity: "high",
        frameworks: ["fedramp", "nist", "stig"],
        templateTypes: ["terraform", "cloudformation", "bicep"],
        pattern: /(?:ssl|tls|https|minimum_tls_version|ssl_policy)/i,
        negativeMatch: true,
        description:
          "No TLS/SSL configuration found. All data in transit must be encrypted.",
        remediation:
          "Configure TLS 1.2+ for all endpoints (e.g., minimum_tls_version, ssl_policy, redirect HTTP to HTTPS).",
        complianceReference: "NIST SC-8 / FedRAMP SC-8",
      },

      // --- Tagging ---
      {
        id: "IAC-TAG-001",
        rule: "resource-tagging-required",
        severity: "low",
        frameworks: ["fedramp", "cis", "nist"],
        templateTypes: ["terraform", "cloudformation", "bicep"],
        pattern: /(?:tags|labels)\s*[:={\[]/i,
        negativeMatch: true,
        description:
          "No resource tagging or labeling detected. All resources should be tagged for cost allocation and governance.",
        remediation:
          "Add tags/labels including at minimum: Environment, Owner, CostCenter, DataClassification.",
        complianceReference: "NIST CM-8 / FedRAMP CM-8",
      },

      // --- IAM least privilege ---
      {
        id: "IAC-IAM-001",
        rule: "no-wildcard-iam",
        severity: "critical",
        frameworks: ["fedramp", "cis", "nist", "stig"],
        templateTypes: ["terraform", "cloudformation"],
        pattern: /(?:Action|actions)\s*[:=]\s*\[?\s*["']\*["']/i,
        negativeMatch: false,
        description:
          "Wildcard IAM action detected (Action: '*'). IAM policies must follow least-privilege principles.",
        remediation:
          "Replace wildcard actions with specific, scoped permissions required for the workload.",
        complianceReference: "NIST AC-6 / FedRAMP AC-6",
      },

      // --- Backup / recovery ---
      {
        id: "IAC-BKP-001",
        rule: "backup-configuration",
        severity: "medium",
        frameworks: ["fedramp", "nist", "stig"],
        templateTypes: ["terraform", "cloudformation", "bicep"],
        pattern: /(?:backup|snapshot|recovery_point|retention)/i,
        negativeMatch: true,
        description:
          "No backup or snapshot configuration detected. Critical resources must have automated backups.",
        remediation:
          "Configure automated backups with appropriate retention periods (e.g., AWS Backup, Azure Backup, GCP snapshots).",
        complianceReference: "NIST CP-9 / FedRAMP CP-9",
      },
    ];
  }
}
