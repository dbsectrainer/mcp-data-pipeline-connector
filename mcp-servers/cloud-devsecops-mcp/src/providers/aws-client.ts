/**
 * AWS Integration Client
 * Abstractions for Security Hub, CloudFormation, and Cost Explorer.
 * BE EASY ENTERPRISES LLC
 */

import type {
  CloudPostureResult,
  CostAnalysisResult,
  DeploymentResult,
  SecurityFinding,
  CostBreakdownItem,
  CostOptimization,
  TimePeriod,
  CostGroupBy,
  Environment,
} from "../types.js";

export interface AwsClientConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  govcloudRegion?: string;
  accountId?: string;
}

export class AwsClient {
  private readonly config: AwsClientConfig;

  constructor(config?: Partial<AwsClientConfig>) {
    this.config = {
      accessKeyId: config?.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey:
        config?.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY,
      region: config?.region ?? process.env.AWS_REGION ?? "us-east-1",
      govcloudRegion:
        config?.govcloudRegion ??
        process.env.AWS_GOVCLOUD_REGION ??
        "us-gov-west-1",
      accountId: config?.accountId ?? process.env.AWS_ACCOUNT_ID,
    };
  }

  /**
   * Deploy a CloudFormation or Terraform template via AWS.
   */
  async deployInfrastructure(
    template: string,
    templateType: string,
    environment: Environment,
    dryRun: boolean,
  ): Promise<DeploymentResult> {
    const deploymentId = `aws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const region =
      environment === "govcloud"
        ? this.config.govcloudRegion
        : this.config.region;

    // Validate template structure before proceeding
    this.validateTemplate(template, templateType);

    if (dryRun) {
      const planOutput = this.generatePlanOutput(
        template,
        templateType,
        environment,
      );
      return {
        deployment_id: deploymentId,
        status: "planned",
        provider: "aws",
        environment,
        resources_affected: this.estimateResourceCount(template, templateType),
        dry_run: true,
        plan_output: planOutput,
        timestamp: new Date().toISOString(),
      };
    }

    // In production, this would call AWS CloudFormation CreateStack / Terraform Cloud API
    return {
      deployment_id: deploymentId,
      status: "deployed",
      provider: "aws",
      environment,
      resources_affected: this.estimateResourceCount(template, templateType),
      dry_run: false,
      plan_output: `Deployed to ${region} in ${environment} environment`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Query AWS Security Hub for security posture findings.
   */
  async getSecurityHubFindings(
    services: string[],
  ): Promise<CloudPostureResult> {
    // In production this calls the SecurityHub GetFindings API
    const findings: SecurityFinding[] = services.flatMap((service) =>
      this.generateSecurityHubFindings(service),
    );

    const passed = findings.filter((f) => f.severity === "informational").length;
    const total = findings.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;

    return {
      provider: "aws",
      check_type: "security_hub",
      services_scanned: services,
      overall_score: score,
      findings,
      recommendations: this.generateAwsRecommendations(findings),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Query AWS Cost Explorer for cost analysis data.
   */
  async getCostData(
    timePeriod: TimePeriod,
    groupBy: CostGroupBy,
  ): Promise<CostAnalysisResult> {
    // In production this calls CostExplorer GetCostAndUsage
    const breakdown: CostBreakdownItem[] =
      this.generateCostBreakdown(groupBy);
    const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);
    const optimizations: CostOptimization[] =
      this.generateOptimizationRecommendations(breakdown);
    const projectedSavings = optimizations.reduce(
      (sum, opt) => sum + opt.estimated_monthly_savings,
      0,
    );

    return {
      provider: "aws",
      time_period: timePeriod,
      total_cost: totalCost,
      currency: "USD",
      breakdown,
      optimization_recommendations: optimizations,
      projected_savings: projectedSavings,
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private validateTemplate(template: string, templateType: string): void {
    if (templateType === "cloudformation") {
      if (
        !template.includes("AWSTemplateFormatVersion") &&
        !template.includes("Resources")
      ) {
        throw new Error(
          "Invalid CloudFormation template: missing AWSTemplateFormatVersion or Resources section",
        );
      }
    }
    // Terraform validation is handled at the IaC scanner layer
  }

  private estimateResourceCount(
    template: string,
    templateType: string,
  ): number {
    if (templateType === "cloudformation") {
      const resourceMatches = template.match(/Type:\s*['"]?AWS::/g);
      return resourceMatches?.length ?? 1;
    }
    if (templateType === "terraform") {
      const resourceMatches = template.match(/resource\s+"aws_/g);
      return resourceMatches?.length ?? 1;
    }
    return 1;
  }

  private generatePlanOutput(
    template: string,
    templateType: string,
    environment: Environment,
  ): string {
    const resourceCount = this.estimateResourceCount(template, templateType);
    return [
      `AWS ${templateType} Deployment Plan`,
      `Environment: ${environment}`,
      `Region: ${environment === "govcloud" ? this.config.govcloudRegion : this.config.region}`,
      `Resources to create/update: ${resourceCount}`,
      `Estimated deployment time: ${resourceCount * 30}s`,
      "",
      "No changes will be applied (dry_run=true).",
    ].join("\n");
  }

  private generateSecurityHubFindings(service: string): SecurityFinding[] {
    // Stub: production implementation queries SecurityHub API
    return [
      {
        id: `aws-sh-${service}-001`,
        title: `${service} encryption at rest not enabled`,
        severity: "high",
        resource_type: `AWS::${service}`,
        resource_id: `arn:aws:${service}:${this.config.region}:${this.config.accountId}:resource/example`,
        description: `${service} resources should have encryption at rest enabled per CIS AWS Benchmark.`,
        remediation: `Enable encryption at rest for all ${service} resources.`,
        compliance_references: ["CIS AWS 2.1.1", "NIST SC-28"],
      },
    ];
  }

  private generateAwsRecommendations(findings: SecurityFinding[]): string[] {
    const recommendations: string[] = [];
    const criticalCount = findings.filter(
      (f) => f.severity === "critical",
    ).length;
    const highCount = findings.filter((f) => f.severity === "high").length;

    if (criticalCount > 0) {
      recommendations.push(
        `Address ${criticalCount} critical finding(s) immediately — these represent active security risks.`,
      );
    }
    if (highCount > 0) {
      recommendations.push(
        `Remediate ${highCount} high-severity finding(s) within the next sprint cycle.`,
      );
    }
    recommendations.push(
      "Enable AWS Config rules for continuous compliance monitoring.",
    );
    return recommendations;
  }

  private generateCostBreakdown(groupBy: CostGroupBy): CostBreakdownItem[] {
    // Stub: production implementation queries Cost Explorer API
    const items: Record<string, CostBreakdownItem[]> = {
      service: [
        { key: "EC2", cost: 4200, percentage: 35, trend: "increasing" },
        { key: "RDS", cost: 2400, percentage: 20, trend: "stable" },
        { key: "S3", cost: 1800, percentage: 15, trend: "decreasing" },
        { key: "Lambda", cost: 1200, percentage: 10, trend: "increasing" },
        { key: "Other", cost: 2400, percentage: 20, trend: "stable" },
      ],
      tag: [
        { key: "production", cost: 7200, percentage: 60, trend: "stable" },
        { key: "staging", cost: 2400, percentage: 20, trend: "stable" },
        { key: "development", cost: 1800, percentage: 15, trend: "increasing" },
        { key: "untagged", cost: 600, percentage: 5, trend: "stable" },
      ],
      account: [
        { key: "prod-account", cost: 8400, percentage: 70, trend: "stable" },
        { key: "dev-account", cost: 3600, percentage: 30, trend: "increasing" },
      ],
      region: [
        { key: "us-east-1", cost: 6000, percentage: 50, trend: "stable" },
        { key: "us-west-2", cost: 3600, percentage: 30, trend: "stable" },
        { key: "eu-west-1", cost: 2400, percentage: 20, trend: "decreasing" },
      ],
    };
    return items[groupBy] ?? items.service!;
  }

  private generateOptimizationRecommendations(
    breakdown: CostBreakdownItem[],
  ): CostOptimization[] {
    const recommendations: CostOptimization[] = [];
    const increasing = breakdown.filter((b) => b.trend === "increasing");

    if (increasing.length > 0) {
      recommendations.push({
        category: "Right-sizing",
        description: `Review resource sizing for ${increasing.map((i) => i.key).join(", ")} — costs are trending upward.`,
        estimated_monthly_savings: Math.round(
          increasing.reduce((s, i) => s + i.cost * 0.15, 0),
        ),
        effort: "medium",
        risk: "low",
      });
    }

    recommendations.push(
      {
        category: "Reserved Instances",
        description:
          "Purchase 1-year reserved instances for steady-state workloads to save up to 40%.",
        estimated_monthly_savings: Math.round(
          breakdown.reduce((s, i) => s + i.cost, 0) * 0.2,
        ),
        effort: "low",
        risk: "low",
      },
      {
        category: "Spot Instances",
        description:
          "Migrate fault-tolerant batch workloads to Spot Instances for up to 90% savings.",
        estimated_monthly_savings: 800,
        effort: "high",
        risk: "medium",
      },
    );

    return recommendations;
  }
}
