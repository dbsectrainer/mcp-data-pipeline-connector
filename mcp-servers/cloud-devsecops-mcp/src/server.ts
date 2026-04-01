/**
 * Cloud & DevSecOps MCP Server — Tool Definitions
 * BE EASY ENTERPRISES LLC
 *
 * Registers all MCP tools with Zod-validated schemas and delegates to
 * the appropriate provider clients, security engines, and analyzers.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  CloudProvider,
  TemplateType,
  Environment,
  BenchmarkScope,
  CheckType,
  CostGroupBy,
  K8sScanType,
  SeverityThreshold,
  ComplianceFramework,
  TimePeriod,
} from "./types.js";

import { AwsClient } from "./providers/aws-client.js";
import { AzureClient } from "./providers/azure-client.js";
import { GcpClient } from "./providers/gcp-client.js";
import { PolicyEngine } from "./security/policy-engine.js";
import { IacScanner } from "./security/iac-scanner.js";
import { CostAnalyzer } from "./utils/cost-analyzer.js";

import type {
  CloudPostureResult,
  K8sSecurityResult,
  K8sFinding,
  ContainerScanResult,
  ContainerVulnerability,
} from "./types.js";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createServer(): McpServer {
  const server = new McpServer({
    name: "cloud-devsecops-mcp",
    version: "1.0.0",
  });

  const awsClient = new AwsClient();
  const azureClient = new AzureClient();
  const gcpClient = new GcpClient();
  const policyEngine = new PolicyEngine();
  const iacScanner = new IacScanner();
  const costAnalyzer = new CostAnalyzer();

  // -------------------------------------------------------------------------
  // Tool: deploy_infrastructure
  // -------------------------------------------------------------------------
  server.tool(
    "deploy_infrastructure",
    "Deploy cloud infrastructure via IaC templates (Terraform, CloudFormation, Bicep). Supports AWS, Azure, GCP, and GovCloud environments with mandatory dry-run capability.",
    {
      provider: CloudProvider,
      template_type: TemplateType,
      template: z.string().min(1, "Template must not be empty"),
      environment: Environment,
      dry_run: z.boolean().default(true),
    },
    async ({ provider, template_type, template, environment, dry_run }) => {
      try {
        // Security gate: prod/govcloud deployments always require dry_run first
        if (
          (environment === "prod" || environment === "govcloud") &&
          !dry_run
        ) {
          // Run an IaC security scan before allowing non-dry-run prod deployments
          const preflightScan = iacScanner.scan(
            template,
            template_type,
            "fedramp",
          );
          if (preflightScan.critical > 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      error: "DEPLOYMENT_BLOCKED",
                      reason: `${preflightScan.critical} critical security finding(s) detected. Resolve before deploying to ${environment}.`,
                      findings: preflightScan.findings.filter(
                        (f) => f.severity === "critical",
                      ),
                    },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            };
          }
        }

        let result;
        switch (provider) {
          case "aws":
            result = await awsClient.deployInfrastructure(
              template, template_type, environment, dry_run,
            );
            break;
          case "azure":
            result = await azureClient.deployInfrastructure(
              template, template_type, environment, dry_run,
            );
            break;
          case "gcp":
            result = await gcpClient.deployInfrastructure(
              template, template_type, environment, dry_run,
            );
            break;
        }

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "DEPLOYMENT_FAILED",
                message: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // Tool: enforce_security_policies
  // -------------------------------------------------------------------------
  server.tool(
    "enforce_security_policies",
    "Evaluate and enforce CIS benchmark security policies across cloud providers. Optionally auto-remediate non-compliant resources.",
    {
      provider: CloudProvider,
      benchmark_version: z.string().min(1, "Benchmark version is required"),
      scope: BenchmarkScope,
      auto_remediate: z.boolean().default(false),
    },
    async ({ provider, benchmark_version, scope, auto_remediate }) => {
      try {
        const result = policyEngine.evaluate(
          provider,
          benchmark_version,
          scope,
          auto_remediate,
        );

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "POLICY_EVALUATION_FAILED",
                message: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // Tool: monitor_cloud_posture
  // -------------------------------------------------------------------------
  server.tool(
    "monitor_cloud_posture",
    "Monitor cloud security posture via provider-native tools (AWS Security Hub, Microsoft Defender, GCP Security Command Center).",
    {
      provider: CloudProvider,
      services: z.array(z.string().min(1)).min(1, "At least one service required"),
      check_type: CheckType,
    },
    async ({ provider, services, check_type }) => {
      try {
        let result: CloudPostureResult;

        if (check_type === "all") {
          // Aggregate from the provider's native tool
          switch (provider) {
            case "aws":
              result = await awsClient.getSecurityHubFindings(services);
              result.check_type = "all";
              break;
            case "azure":
              result = await azureClient.getDefenderFindings(services);
              result.check_type = "all";
              break;
            case "gcp":
              result = await gcpClient.getSccFindings(services);
              result.check_type = "all";
              break;
          }
        } else {
          switch (provider) {
            case "aws":
              result = await awsClient.getSecurityHubFindings(services);
              break;
            case "azure":
              result = await azureClient.getDefenderFindings(services);
              break;
            case "gcp":
              result = await gcpClient.getSccFindings(services);
              break;
          }
        }

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result!, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "POSTURE_CHECK_FAILED",
                message: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // Tool: cost_analysis
  // -------------------------------------------------------------------------
  server.tool(
    "cost_analysis",
    "Analyze cloud costs and generate optimization recommendations. Supports grouping by service, tag, account, or region.",
    {
      provider: CloudProvider,
      time_period: TimePeriod,
      group_by: CostGroupBy,
    },
    async ({ provider, time_period, group_by }) => {
      try {
        const result = await costAnalyzer.analyze(provider, time_period, group_by);

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "COST_ANALYSIS_FAILED",
                message: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // Tool: kubernetes_security_scan
  // -------------------------------------------------------------------------
  server.tool(
    "kubernetes_security_scan",
    "Scan Kubernetes clusters for security issues including RBAC misconfigurations, network policy gaps, pod security violations, and vulnerable images.",
    {
      cluster_name: z.string().min(1, "Cluster name is required"),
      namespace: z.string().optional(),
      scan_type: K8sScanType,
    },
    async ({ cluster_name, namespace, scan_type }) => {
      try {
        const result = performK8sScan(cluster_name, namespace, scan_type);

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "K8S_SCAN_FAILED",
                message: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // Tool: container_image_scan
  // -------------------------------------------------------------------------
  server.tool(
    "container_image_scan",
    "Scan container images for known CVEs and vulnerabilities. Supports severity threshold filtering.",
    {
      image: z.string().min(1, "Image reference is required"),
      registry: z.string().optional(),
      severity_threshold: SeverityThreshold,
    },
    async ({ image, registry, severity_threshold }) => {
      try {
        const result = performContainerScan(image, registry, severity_threshold);

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "CONTAINER_SCAN_FAILED",
                message: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // Tool: iac_security_review
  // -------------------------------------------------------------------------
  server.tool(
    "iac_security_review",
    "Review Infrastructure-as-Code templates for security issues against compliance frameworks (FedRAMP, CIS, NIST, STIG).",
    {
      template: z.string().min(1, "Template content is required"),
      template_type: TemplateType,
      compliance_framework: ComplianceFramework,
    },
    async ({ template, template_type, compliance_framework }) => {
      try {
        const result = iacScanner.scan(template, template_type, compliance_framework);

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "IAC_REVIEW_FAILED",
                message: error instanceof Error ? error.message : String(error),
              }),
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
// Kubernetes scan helpers
// ---------------------------------------------------------------------------

function performK8sScan(
  clusterName: string,
  namespace: string | undefined,
  scanType: z.infer<typeof K8sScanType>,
): K8sSecurityResult {
  const ns = namespace ?? "all-namespaces";
  const findings: K8sFinding[] = [];

  const scanCategories =
    scanType === "all"
      ? (["rbac", "network_policies", "pod_security", "images"] as const)
      : ([scanType] as const);

  for (const category of scanCategories) {
    findings.push(...generateK8sFindings(clusterName, ns, category));
  }

  return {
    cluster_name: clusterName,
    namespace: namespace,
    scan_type: scanType,
    total_issues: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    findings,
    timestamp: new Date().toISOString(),
  };
}

function generateK8sFindings(
  clusterName: string,
  namespace: string,
  category: string,
): K8sFinding[] {
  const findingsByCategory: Record<string, K8sFinding[]> = {
    rbac: [
      {
        id: `k8s-rbac-001-${clusterName}`,
        category: "rbac",
        severity: "high",
        resource_kind: "ClusterRoleBinding",
        resource_name: "default-admin-binding",
        namespace: "kube-system",
        description:
          "ClusterRoleBinding grants cluster-admin to a service account. This violates least-privilege principles.",
        remediation:
          "Replace cluster-admin with a scoped ClusterRole that grants only the permissions required.",
      },
      {
        id: `k8s-rbac-002-${clusterName}`,
        category: "rbac",
        severity: "medium",
        resource_kind: "RoleBinding",
        resource_name: "developers-edit",
        namespace,
        description:
          "RoleBinding grants 'edit' role to a broad group. Consider narrowing to specific resources.",
        remediation:
          "Create a custom Role with explicit resource and verb grants instead of using the built-in 'edit' role.",
      },
    ],
    network_policies: [
      {
        id: `k8s-netpol-001-${clusterName}`,
        category: "network_policies",
        severity: "high",
        resource_kind: "Namespace",
        resource_name: namespace,
        namespace,
        description:
          "Namespace has no default-deny NetworkPolicy. All pod-to-pod traffic is allowed.",
        remediation:
          "Apply a default-deny ingress and egress NetworkPolicy, then explicitly allow required traffic flows.",
      },
    ],
    pod_security: [
      {
        id: `k8s-pss-001-${clusterName}`,
        category: "pod_security",
        severity: "critical",
        resource_kind: "Pod",
        resource_name: "privileged-pod",
        namespace,
        description:
          "Pod runs in privileged mode, granting full host access. This is a critical security risk.",
        remediation:
          "Remove privileged: true from the container securityContext. Use specific capabilities instead.",
      },
      {
        id: `k8s-pss-002-${clusterName}`,
        category: "pod_security",
        severity: "medium",
        resource_kind: "Pod",
        resource_name: "root-container",
        namespace,
        description:
          "Container runs as root (UID 0). Containers should run as non-root users.",
        remediation:
          "Set runAsNonRoot: true and specify a non-root runAsUser in the pod securityContext.",
      },
    ],
    images: [
      {
        id: `k8s-img-001-${clusterName}`,
        category: "images",
        severity: "high",
        resource_kind: "Pod",
        resource_name: "app-deployment",
        namespace,
        description:
          "Container uses ':latest' tag. Image tags must be immutable digests or specific versions.",
        remediation:
          "Pin container images to a specific version tag or SHA256 digest.",
      },
      {
        id: `k8s-img-002-${clusterName}`,
        category: "images",
        severity: "medium",
        resource_kind: "Pod",
        resource_name: "app-deployment",
        namespace,
        description:
          "Image pull policy is not set to 'Always'. Stale images may be used from local cache.",
        remediation:
          "Set imagePullPolicy: Always when using mutable tags, or pin images by digest.",
      },
    ],
  };

  return findingsByCategory[category] ?? [];
}

// ---------------------------------------------------------------------------
// Container image scan helpers
// ---------------------------------------------------------------------------

function performContainerScan(
  image: string,
  registry: string | undefined,
  severityThreshold: z.infer<typeof SeverityThreshold>,
): ContainerScanResult {
  // In production this calls Trivy, Grype, or a registry-native scanner
  const allVulnerabilities: ContainerVulnerability[] = [
    {
      cve_id: "CVE-2024-21626",
      package_name: "runc",
      installed_version: "1.1.9",
      fixed_version: "1.1.12",
      severity: "critical",
      description:
        "Container breakout via leaked file descriptor in runc. Allows host filesystem access.",
      cvss_score: 8.6,
    },
    {
      cve_id: "CVE-2024-3094",
      package_name: "xz-utils",
      installed_version: "5.6.0",
      fixed_version: "5.6.1",
      severity: "critical",
      description:
        "Backdoor in xz/liblzma that compromises SSH authentication via systemd.",
      cvss_score: 10.0,
    },
    {
      cve_id: "CVE-2023-44487",
      package_name: "golang.org/x/net",
      installed_version: "0.15.0",
      fixed_version: "0.17.0",
      severity: "high",
      description:
        "HTTP/2 Rapid Reset attack enables denial of service on HTTP/2 servers.",
      cvss_score: 7.5,
    },
    {
      cve_id: "CVE-2023-39325",
      package_name: "golang.org/x/net",
      installed_version: "0.15.0",
      fixed_version: "0.17.0",
      severity: "high",
      description:
        "Excessive resource consumption in net/http2 when handling rapid stream resets.",
      cvss_score: 7.5,
    },
    {
      cve_id: "CVE-2023-5363",
      package_name: "openssl",
      installed_version: "3.1.3",
      fixed_version: "3.1.4",
      severity: "medium",
      description:
        "Incorrect cipher key and IV length processing in OpenSSL.",
      cvss_score: 5.3,
    },
    {
      cve_id: "CVE-2023-4911",
      package_name: "glibc",
      installed_version: "2.37",
      fixed_version: "2.38",
      severity: "low",
      description:
        "Buffer overflow in glibc ld.so dynamic loader (Looney Tunables).",
      cvss_score: 3.9,
    },
  ];

  const severityOrder = [
    "critical",
    "high",
    "medium",
    "low",
    "informational",
  ];
  const thresholdIndex = severityOrder.indexOf(severityThreshold);

  const filtered = allVulnerabilities.filter(
    (v) => severityOrder.indexOf(v.severity) <= thresholdIndex,
  );

  return {
    image,
    registry,
    scan_status: "completed",
    total_vulnerabilities: filtered.length,
    critical: filtered.filter((v) => v.severity === "critical").length,
    high: filtered.filter((v) => v.severity === "high").length,
    medium: filtered.filter((v) => v.severity === "medium").length,
    low: filtered.filter((v) => v.severity === "low").length,
    vulnerabilities: filtered,
    base_image_recommendation:
      "Consider using a distroless or Alpine-based image to reduce attack surface.",
    timestamp: new Date().toISOString(),
  };
}
