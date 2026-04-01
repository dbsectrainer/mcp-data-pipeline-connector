/**
 * Solution Template Management and Retrieval
 * BE EASY ENTERPRISES LLC
 *
 * Manages reusable solution templates across domains, with filtering
 * by technology stack and use-case matching.
 */

import { randomUUID } from "node:crypto";
import type { SolutionTemplate, Domain } from "../types.js";

// ---------------------------------------------------------------------------
// Built-in Starter Templates
// ---------------------------------------------------------------------------

const STARTER_TEMPLATES: Array<Omit<SolutionTemplate, "id" | "createdAt" | "updatedAt">> = [
  {
    domain: "cybersecurity",
    useCase: "Zero Trust Network Architecture",
    title: "Zero Trust Implementation Template",
    description:
      "End-to-end template for deploying a zero trust architecture including identity verification, micro-segmentation, and continuous monitoring.",
    technologyStack: ["Azure AD", "Zscaler", "CrowdStrike", "Splunk"],
    architecture:
      "Identity-centric perimeter with micro-segmented network zones, continuous authentication, and least-privilege access controls.",
    steps: [
      { order: 1, title: "Asset Discovery", description: "Inventory all network assets, data flows, and access patterns.", tools: ["Nmap", "ServiceNow CMDB"], estimatedHours: 40 },
      { order: 2, title: "Identity Foundation", description: "Deploy centralized identity provider with MFA and conditional access.", tools: ["Azure AD", "Okta"], estimatedHours: 80 },
      { order: 3, title: "Micro-Segmentation", description: "Segment network into trust zones with policy-based controls.", tools: ["Zscaler", "Illumio"], estimatedHours: 120 },
      { order: 4, title: "Continuous Monitoring", description: "Implement SIEM and XDR for real-time threat detection.", tools: ["Splunk", "CrowdStrike"], estimatedHours: 60 },
    ],
    prerequisites: ["Network topology documentation", "Identity provider in place", "Executive sponsorship"],
    tags: ["zero-trust", "network-security", "architecture"],
  },
  {
    domain: "cloud",
    useCase: "Multi-Cloud Landing Zone",
    title: "Multi-Cloud Landing Zone Template",
    description:
      "Template for establishing secure, compliant landing zones across AWS, Azure, and GCP with unified governance.",
    technologyStack: ["Terraform", "AWS", "Azure", "GCP"],
    architecture:
      "Hub-and-spoke topology with centralized identity, logging, and policy enforcement across cloud providers.",
    steps: [
      { order: 1, title: "Governance Design", description: "Define organizational units, naming conventions, and tagging strategy.", tools: ["Terraform"], estimatedHours: 24 },
      { order: 2, title: "Identity Federation", description: "Configure SSO and role-based access across all cloud providers.", tools: ["Azure AD", "AWS IAM"], estimatedHours: 40 },
      { order: 3, title: "Network Foundation", description: "Deploy hub-and-spoke networking with transit gateways.", tools: ["Terraform", "AWS TGW"], estimatedHours: 60 },
      { order: 4, title: "Security Baseline", description: "Enable GuardDuty, Security Center, and SCC with centralized alerting.", tools: ["AWS GuardDuty", "Azure Defender"], estimatedHours: 32 },
    ],
    prerequisites: ["Cloud provider accounts", "Terraform state backend", "Network CIDR planning"],
    tags: ["multi-cloud", "landing-zone", "infrastructure"],
  },
  {
    domain: "compliance",
    useCase: "CMMC Level 2 Assessment Preparation",
    title: "CMMC Level 2 Readiness Template",
    description:
      "Step-by-step template for preparing an organization for CMMC Level 2 certification assessment.",
    technologyStack: ["GRC Platform", "SIEM", "DLP"],
    architecture:
      "Control-based assessment framework mapping NIST SP 800-171 controls to organizational practices.",
    steps: [
      { order: 1, title: "Scope Definition", description: "Identify CUI data flows and in-scope systems.", tools: ["Data Flow Diagrams"], estimatedHours: 40 },
      { order: 2, title: "Gap Assessment", description: "Map current controls against NIST 800-171 requirements.", tools: ["GRC Platform"], estimatedHours: 80 },
      { order: 3, title: "Remediation Planning", description: "Develop POA&Ms for identified gaps with timelines.", tools: ["Project Management"], estimatedHours: 40 },
      { order: 4, title: "Evidence Collection", description: "Compile artifacts and documentation for each control family.", tools: ["GRC Platform", "SharePoint"], estimatedHours: 120 },
    ],
    prerequisites: ["CUI identification complete", "System boundary defined", "Management commitment"],
    tags: ["cmmc", "compliance", "nist-800-171", "assessment"],
  },
  {
    domain: "ai_ml",
    useCase: "ML Model Governance Pipeline",
    title: "ML Governance and Deployment Template",
    description:
      "Template for establishing a governed ML pipeline from experimentation through production deployment with bias detection and drift monitoring.",
    technologyStack: ["MLflow", "Kubernetes", "Prometheus", "Great Expectations"],
    architecture:
      "Staged pipeline with automated gates for data validation, model evaluation, bias testing, and canary deployment.",
    steps: [
      { order: 1, title: "Data Governance", description: "Establish data contracts, lineage tracking, and quality gates.", tools: ["Great Expectations", "dbt"], estimatedHours: 60 },
      { order: 2, title: "Experiment Tracking", description: "Set up experiment tracking with model registry.", tools: ["MLflow"], estimatedHours: 24 },
      { order: 3, title: "Bias & Fairness Testing", description: "Integrate bias detection into the evaluation pipeline.", tools: ["Fairlearn", "AI Fairness 360"], estimatedHours: 40 },
      { order: 4, title: "Deployment Automation", description: "Build CI/CD pipeline with canary deployment strategy.", tools: ["Kubernetes", "ArgoCD"], estimatedHours: 48 },
    ],
    prerequisites: ["ML platform access", "Data catalog established", "Model evaluation criteria defined"],
    tags: ["ml-ops", "governance", "model-deployment", "ai"],
  },
  {
    domain: "devops",
    useCase: "GitOps CI/CD Pipeline",
    title: "GitOps Pipeline Template",
    description:
      "Template for a fully automated GitOps-based CI/CD pipeline with security scanning and progressive delivery.",
    technologyStack: ["GitHub Actions", "ArgoCD", "Kubernetes", "Trivy"],
    architecture:
      "Git-centric workflow where infrastructure and application state are declared in repositories and reconciled by ArgoCD.",
    steps: [
      { order: 1, title: "Repository Structure", description: "Set up mono-repo or multi-repo layout with environment branches.", tools: ["GitHub"], estimatedHours: 8 },
      { order: 2, title: "CI Pipeline", description: "Build, test, scan, and publish container images on commit.", tools: ["GitHub Actions", "Trivy"], estimatedHours: 24 },
      { order: 3, title: "CD with ArgoCD", description: "Deploy ArgoCD and configure application manifests.", tools: ["ArgoCD", "Helm"], estimatedHours: 32 },
      { order: 4, title: "Progressive Delivery", description: "Implement canary and blue-green deployments.", tools: ["Argo Rollouts", "Istio"], estimatedHours: 24 },
    ],
    prerequisites: ["Kubernetes cluster", "Container registry", "GitHub organization"],
    tags: ["gitops", "ci-cd", "kubernetes", "devops"],
  },
  {
    domain: "data_engineering",
    useCase: "Real-Time Data Lakehouse",
    title: "Data Lakehouse Architecture Template",
    description:
      "Template for building a real-time data lakehouse with medallion architecture and unified batch/streaming.",
    technologyStack: ["Apache Spark", "Delta Lake", "Kafka", "dbt"],
    architecture:
      "Medallion architecture (bronze/silver/gold) with Kafka ingestion, Spark processing, and Delta Lake storage.",
    steps: [
      { order: 1, title: "Ingestion Layer", description: "Set up Kafka topics and connectors for source systems.", tools: ["Kafka Connect", "Debezium"], estimatedHours: 40 },
      { order: 2, title: "Bronze Layer", description: "Land raw data into Delta Lake with schema evolution.", tools: ["Apache Spark", "Delta Lake"], estimatedHours: 32 },
      { order: 3, title: "Silver Layer", description: "Cleanse, deduplicate, and conform data models.", tools: ["dbt", "Great Expectations"], estimatedHours: 60 },
      { order: 4, title: "Gold Layer", description: "Build business-level aggregates and feature stores.", tools: ["dbt", "Spark SQL"], estimatedHours: 40 },
    ],
    prerequisites: ["Cloud storage provisioned", "Kafka cluster", "Spark cluster or Databricks workspace"],
    tags: ["data-lakehouse", "streaming", "medallion", "data-engineering"],
  },
  {
    domain: "consulting",
    useCase: "Technology Assessment Engagement",
    title: "Technology Assessment Template",
    description:
      "Template for conducting a technology assessment engagement including current state analysis, gap identification, and roadmap delivery.",
    technologyStack: ["Interviews", "Architecture Review", "Benchmarking"],
    architecture:
      "Phased engagement model: discovery, assessment, analysis, roadmap, and executive presentation.",
    steps: [
      { order: 1, title: "Discovery", description: "Conduct stakeholder interviews and document current state.", tools: ["Interview guides", "Miro"], estimatedHours: 40 },
      { order: 2, title: "Assessment", description: "Evaluate technology stack against industry benchmarks.", tools: ["Assessment framework", "Scoring rubric"], estimatedHours: 60 },
      { order: 3, title: "Analysis & Recommendations", description: "Identify gaps and develop prioritized recommendations.", tools: ["SWOT analysis", "Risk matrix"], estimatedHours: 40 },
      { order: 4, title: "Roadmap Delivery", description: "Present findings and actionable roadmap to stakeholders.", tools: ["PowerPoint", "Gantt charts"], estimatedHours: 24 },
    ],
    prerequisites: ["Statement of work signed", "Stakeholder list", "Access to existing documentation"],
    tags: ["consulting", "assessment", "technology-review", "roadmap"],
  },
];

// ---------------------------------------------------------------------------
// Template Manager
// ---------------------------------------------------------------------------

export class TemplateManager {
  private templates = new Map<string, SolutionTemplate>();

  constructor() {
    this.seedTemplates();
  }

  /**
   * Retrieve templates matching domain, use case, and optional tech stack.
   */
  getTemplates(params: {
    domain: Domain;
    useCase: string;
    technologyStack?: string[];
  }): SolutionTemplate[] {
    let results = Array.from(this.templates.values()).filter(
      (t) => t.domain === params.domain,
    );

    // Score by use-case relevance (simple keyword overlap)
    const useCaseTokens = params.useCase
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored = results.map((t) => {
      const text = `${t.useCase} ${t.title} ${t.description} ${t.tags.join(" ")}`.toLowerCase();
      let score = 0;
      for (const token of useCaseTokens) {
        if (text.includes(token)) score++;
      }

      // Bonus for technology stack overlap
      if (params.technologyStack && params.technologyStack.length > 0) {
        const techLower = params.technologyStack.map((s) => s.toLowerCase());
        for (const tech of techLower) {
          if (t.technologyStack.some((ts) => ts.toLowerCase().includes(tech))) {
            score += 0.5;
          }
        }
      }

      return { template: t, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Return templates with at least some relevance, or top 3 if none match
    const relevant = scored.filter((s) => s.score > 0);
    if (relevant.length > 0) {
      return relevant.map((s) => s.template);
    }

    return scored.slice(0, 3).map((s) => s.template);
  }

  get(id: string): SolutionTemplate | undefined {
    return this.templates.get(id);
  }

  getAll(): SolutionTemplate[] {
    return Array.from(this.templates.values());
  }

  add(
    template: Omit<SolutionTemplate, "id" | "createdAt" | "updatedAt">,
  ): SolutionTemplate {
    const now = new Date().toISOString();
    const full: SolutionTemplate = {
      ...template,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(full.id, full);
    return full;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private seedTemplates(): void {
    for (const starter of STARTER_TEMPLATES) {
      this.add(starter);
    }
  }
}
