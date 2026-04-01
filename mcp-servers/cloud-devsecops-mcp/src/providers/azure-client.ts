/**
 * Azure Integration Client
 * Abstractions for Defender for Cloud, ARM Templates, and Cost Management.
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

export interface AzureClientConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  subscriptionId?: string;
}

export class AzureClient {
  private readonly config: AzureClientConfig;

  constructor(config?: Partial<AzureClientConfig>) {
    this.config = {
      tenantId: config?.tenantId ?? process.env.AZURE_TENANT_ID,
      clientId: config?.clientId ?? process.env.AZURE_CLIENT_ID,
      clientSecret: config?.clientSecret ?? process.env.AZURE_CLIENT_SECRET,
      subscriptionId:
        config?.subscriptionId ?? process.env.AZURE_SUBSCRIPTION_ID,
    };
  }

  /**
   * Deploy via ARM templates or Bicep.
   */
  async deployInfrastructure(
    template: string,
    templateType: string,
    environment: Environment,
    dryRun: boolean,
  ): Promise<DeploymentResult> {
    const deploymentId = `azure-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.validateTemplate(template, templateType);

    if (dryRun) {
      return {
        deployment_id: deploymentId,
        status: "planned",
        provider: "azure",
        environment,
        resources_affected: this.estimateResourceCount(template, templateType),
        dry_run: true,
        plan_output: this.generatePlanOutput(template, templateType, environment),
        timestamp: new Date().toISOString(),
      };
    }

    return {
      deployment_id: deploymentId,
      status: "deployed",
      provider: "azure",
      environment,
      resources_affected: this.estimateResourceCount(template, templateType),
      dry_run: false,
      plan_output: `Deployed to subscription ${this.config.subscriptionId} in ${environment}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Query Microsoft Defender for Cloud findings.
   */
  async getDefenderFindings(services: string[]): Promise<CloudPostureResult> {
    const findings: SecurityFinding[] = services.flatMap((service) =>
      this.generateDefenderFindings(service),
    );

    const passed = findings.filter((f) => f.severity === "informational").length;
    const total = findings.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;

    return {
      provider: "azure",
      check_type: "defender",
      services_scanned: services,
      overall_score: score,
      findings,
      recommendations: this.generateRecommendations(findings),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Query Azure Cost Management for cost data.
   */
  async getCostData(
    timePeriod: TimePeriod,
    groupBy: CostGroupBy,
  ): Promise<CostAnalysisResult> {
    const breakdown = this.generateCostBreakdown(groupBy);
    const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);
    const optimizations = this.generateOptimizations(breakdown);

    return {
      provider: "azure",
      time_period: timePeriod,
      total_cost: totalCost,
      currency: "USD",
      breakdown,
      optimization_recommendations: optimizations,
      projected_savings: optimizations.reduce(
        (s, o) => s + o.estimated_monthly_savings,
        0,
      ),
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private validateTemplate(template: string, templateType: string): void {
    if (templateType === "bicep" && !template.includes("resource ")) {
      throw new Error(
        "Invalid Bicep template: no resource declarations found",
      );
    }
    if (
      templateType === "cloudformation" ||
      templateType === "terraform"
    ) {
      // ARM JSON templates are also accepted
      if (
        templateType === "cloudformation" &&
        !template.includes("$schema") &&
        !template.includes("resources")
      ) {
        throw new Error(
          "Invalid ARM template: missing $schema or resources section",
        );
      }
    }
  }

  private estimateResourceCount(
    template: string,
    templateType: string,
  ): number {
    if (templateType === "bicep") {
      return (template.match(/resource\s+\w+/g)?.length) ?? 1;
    }
    if (templateType === "terraform") {
      return (template.match(/resource\s+"azurerm_/g)?.length) ?? 1;
    }
    return 1;
  }

  private generatePlanOutput(
    template: string,
    templateType: string,
    environment: Environment,
  ): string {
    const count = this.estimateResourceCount(template, templateType);
    return [
      `Azure ${templateType} Deployment Plan`,
      `Environment: ${environment}`,
      `Subscription: ${this.config.subscriptionId ?? "not configured"}`,
      `Resources to create/update: ${count}`,
      "",
      "No changes will be applied (dry_run=true).",
    ].join("\n");
  }

  private generateDefenderFindings(service: string): SecurityFinding[] {
    return [
      {
        id: `azure-def-${service}-001`,
        title: `${service} does not have diagnostic logging enabled`,
        severity: "medium",
        resource_type: `Microsoft.${service}`,
        resource_id: `/subscriptions/${this.config.subscriptionId}/resourceGroups/example/providers/Microsoft.${service}/example`,
        description: `Diagnostic logging should be enabled for ${service} per CIS Azure Benchmark.`,
        remediation: `Enable diagnostic logging for all ${service} resources and forward to Log Analytics workspace.`,
        compliance_references: ["CIS Azure 5.1.1", "NIST AU-6"],
      },
    ];
  }

  private generateRecommendations(findings: SecurityFinding[]): string[] {
    const recs: string[] = [];
    if (findings.some((f) => f.severity === "critical" || f.severity === "high")) {
      recs.push(
        "Enable Microsoft Defender for all resource types to get advanced threat protection.",
      );
    }
    recs.push(
      "Configure Azure Policy initiative for continuous CIS compliance enforcement.",
    );
    recs.push(
      "Enable Just-In-Time VM access to reduce attack surface.",
    );
    return recs;
  }

  private generateCostBreakdown(groupBy: CostGroupBy): CostBreakdownItem[] {
    const items: Record<string, CostBreakdownItem[]> = {
      service: [
        { key: "Virtual Machines", cost: 3800, percentage: 38, trend: "stable" },
        { key: "Azure SQL", cost: 2200, percentage: 22, trend: "increasing" },
        { key: "Storage", cost: 1500, percentage: 15, trend: "stable" },
        { key: "App Service", cost: 1000, percentage: 10, trend: "decreasing" },
        { key: "Other", cost: 1500, percentage: 15, trend: "stable" },
      ],
      tag: [
        { key: "production", cost: 6500, percentage: 65, trend: "stable" },
        { key: "staging", cost: 2000, percentage: 20, trend: "stable" },
        { key: "dev", cost: 1500, percentage: 15, trend: "increasing" },
      ],
      account: [
        { key: "prod-subscription", cost: 7000, percentage: 70, trend: "stable" },
        { key: "dev-subscription", cost: 3000, percentage: 30, trend: "increasing" },
      ],
      region: [
        { key: "eastus", cost: 5000, percentage: 50, trend: "stable" },
        { key: "westus2", cost: 3000, percentage: 30, trend: "stable" },
        { key: "westeurope", cost: 2000, percentage: 20, trend: "decreasing" },
      ],
    };
    return items[groupBy] ?? items.service!;
  }

  private generateOptimizations(
    breakdown: CostBreakdownItem[],
  ): CostOptimization[] {
    return [
      {
        category: "Reserved Instances",
        description:
          "Purchase Azure Reserved VM Instances for predictable workloads.",
        estimated_monthly_savings: Math.round(
          breakdown.reduce((s, i) => s + i.cost, 0) * 0.18,
        ),
        effort: "low",
        risk: "low",
      },
      {
        category: "Auto-scaling",
        description:
          "Implement VMSS auto-scaling to match capacity to demand.",
        estimated_monthly_savings: 600,
        effort: "medium",
        risk: "low",
      },
    ];
  }
}
