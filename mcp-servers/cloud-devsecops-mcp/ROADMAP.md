# Roadmap — Cloud & DevSecOps MCP

> **BE EASY ENTERPRISES LLC** — Federal-grade cloud & DevSecOps automation via the Model Context Protocol.
> Seven tools: `deploy_infrastructure`, `enforce_security_policies`, `monitor_cloud_posture`, `cost_analysis`, `kubernetes_security_scan`, `container_image_scan`, `iac_security_review`.

---

## Phase 1: MVP (Weeks 1–4)

**Goal:** Ship a fully functional, MCP-compliant server covering core AWS/Azure/GCP infrastructure deployment, CIS-aligned security enforcement, and cloud posture monitoring — verified end-to-end with MCP Inspector and published to npm.

### MCP Protocol Compliance

- [x] stdio transport implemented and registered as the default entry point
- [x] Zod-based JSON Schema validation on all tool inputs and outputs
- [x] Tool annotations applied — `deploy_infrastructure` marked `readOnlyHint: false`; `kubernetes_security_scan`, `container_image_scan`, and `iac_security_review` marked `readOnlyHint: true`
- [x] Standard MCP error codes returned for all failure modes (invalid params, provider auth failure, policy violation, etc.)
- [x] Full tool manifest verified with MCP Inspector (all seven tools surface correctly)

### Features

- [x] AWS, Azure, and GCP provider clients initialized and authenticated via environment credentials
- [x] `deploy_infrastructure` — Terraform, CloudFormation, and Bicep IaC deployment with `dry_run: true` as the default; real apply requires explicit opt-in
- [x] `enforce_security_policies` — CIS benchmark policy enforcement across all three cloud providers
- [x] `monitor_cloud_posture` — aggregated findings from AWS Security Hub, Microsoft Defender for Cloud, and Google Security Command Center
- [x] TypeScript strict mode enabled (`"strict": true` in tsconfig)
- [x] Vitest unit tests for all seven tools
- [x] `CHANGELOG.md` tracking all releases following Keep a Changelog format
- [x] Package published to npm under the `@be-easy-enterprises` scope

---

## Phase 2: Polish & Adoption (Weeks 5–8)

**Goal:** Elevate the server to production-ready quality with full MCP capabilities (Resources, Prompts, progress, cancellation, logging), complete the remaining three tools, and stand up CI/CD gating for GovCloud deployments.

### MCP Best Practices

- [x] Progress notifications emitted during long-running `deploy_infrastructure` operations (`$/progress` tokens)
- [x] Cancellation support honoured for all async tool calls
- [x] MCP structured logging integrated (`server.sendLoggingMessage`) at `info`, `warning`, and `error` levels
- [x] Streamable HTTP transport added as a second transport option alongside stdio
- [x] MCP Resources implemented — live cloud inventory (EC2 instances, AKS clusters, GKE node pools, etc.) exposed as browsable resources with URI templates
- [x] MCP Prompts implemented — `cloud-migration-assessment` prompt template that guides users through a structured pre-migration review

### Features

- [x] `kubernetes_security_scan` — RBAC misconfiguration detection, network policy gaps, pod security standard violations, and outdated/vulnerable image flags
- [x] `container_image_scan` — vulnerability scanning with CVSS scoring, layer-level findings, and base-image recommendation
- [x] `iac_security_review` — static analysis of Terraform/CloudFormation/Bicep against FedRAMP, CIS, NIST 800-53, and STIG compliance frameworks; findings include control IDs and remediation guidance
- [x] `cost_analysis` — per-service and per-environment spend breakdown with rightsizing and reserved-instance optimization recommendations
- [x] Production and GovCloud deployment gates — require explicit `environment: "production" | "govcloud"` acknowledgement and elevated-privilege credential checks before any destructive apply
- [x] ESLint + Prettier enforced in CI; formatting violations fail the build
- [x] 90 %+ test coverage enforced via Vitest coverage threshold
- [x] GitHub Actions CI pipeline: lint → typecheck → test → coverage gate → npm publish (on tag)

---

## Phase 3: Enterprise & Scale (Weeks 9+)

**Goal:** Harden the server for multi-tenant federal and enterprise environments with OAuth 2.0 auth, RBAC, full audit trails, real-time event streaming, GovCloud compliance profiles, and supply chain security.

### MCP Enterprise Standards

- [x] OAuth 2.0 authorization flow implemented on the HTTP transport; bearer token validated on every request
- [x] Rate limiting applied per client ID to prevent runaway automation
- [x] API key authentication supported as an alternative to OAuth for service-account integrations
- [x] Multi-transport support — stdio, streamable HTTP, and SSE all active simultaneously
- [x] RBAC for cloud engineer roles (`readonly-analyst`, `cloud-engineer`, `secops-engineer`, `platform-admin`) — each role gates specific tool invocations
- [x] Immutable audit trail logged for every `deploy_infrastructure` and `enforce_security_policies` call (timestamp, caller identity, target environment, diff hash, outcome)

### Features

- [x] Real-time cloud event streaming — CloudTrail, Azure Activity Log, and GCP Audit Logs streamed to connected MCP clients via server-sent events
- [x] Multi-cloud unified dashboard resource — single MCP Resource aggregating posture scores, cost, and active findings across all three providers
- [x] Automated drift detection and remediation — periodic reconciliation of deployed state against IaC source of truth; auto-PR raised on drift
- [x] FinOps integration — budget alerts, anomaly detection, and chargeback reporting pushed as MCP notifications
- [x] Supply chain security — SBOM generation (CycloneDX format) for all container images and IaC modules on every scan
- [x] GovCloud-specific compliance profiles — dedicated rule sets for `us-gov-west-1`, `us-gov-east-1`, Azure Government, and GCP Assured Workloads; FedRAMP High and IL4/IL5 controls mapped to findings
- [x] Multi-tenant cloud management — workspace isolation per tenant with scoped credentials and resource tagging enforced at the API layer
- [x] Kubernetes admission controller integration — `kubernetes_security_scan` findings optionally exported as OPA/Gatekeeper constraint templates for in-cluster enforcement

---

## Guiding Principles

**Dry-run by default.**
Every mutating operation (`deploy_infrastructure`, `enforce_security_policies`) defaults to a plan/preview mode. Real-world changes require an explicit caller opt-in. This prevents accidental infrastructure changes from AI-assisted workflows.

**Infrastructure as code only.**
No ad-hoc CLI calls or console-driven changes. All cloud mutations are expressed as versioned IaC artifacts (Terraform, CloudFormation, Bicep) so every change is reviewable, auditable, and reproducible.

**Least privilege IAM.**
Provider credentials scoped to the minimum permissions required for each tool. Separate credential sets for read-only scanning tools vs. deployment tools. Long-lived root or owner credentials are never accepted.

**CIS benchmark aligned.**
Policy enforcement and posture monitoring are anchored to CIS Benchmarks for AWS, Azure, and GCP. Findings reference the specific CIS control ID and include remediation steps.

**GovCloud-ready.**
All features are designed and tested against AWS GovCloud, Azure Government, and GCP Assured Workloads regions. FedRAMP High, NIST 800-53, STIG, and IL4/IL5 compliance frameworks are first-class citizens, not afterthoughts.
