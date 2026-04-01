# Roadmap — Cybersecurity Operations MCP

## Phase 1: MVP (Weeks 1–4) ✅ Complete

### Goal

Ship a working cybersecurity operations server covering SIEM alert triage, CVE vulnerability queries, and MITRE ATT&CK mapping — the core daily workflow for a federal-grade SOC analyst — without requiring custom integration code per data source.

### MCP Protocol Compliance

- [x] Implement stdio transport (required baseline for all MCP servers)
- [x] Strict JSON Schema for all tool inputs via Zod — `siem_query_alerts` requires `source: enum("splunk"|"sentinel")`, `time_range: string`; `query_vulnerabilities` requires `cve_id: string` or `asset: string`
- [x] Tool annotations: `siem_query_alerts`, `query_vulnerabilities`, `mitre_attack_mapping`, `threat_intelligence_lookup`, `security_posture_assessment` marked `readOnlyHint: true`; `run_triage_playbook`, `generate_incident_report` marked `readOnlyHint: false`
- [x] Proper MCP error codes: `invalid_params` for malformed CVE IDs or unknown SIEM sources, `internal_error` for SIEM connection or NVD API failures
- [x] Verified with MCP Inspector before publish
- [x] `package.json` with correct `bin`, `files`, `keywords: ["mcp", "mcp-server", "cybersecurity", "siem", "soc", "fedramp"]`
- [x] Credentials and API keys in environment variables only — never accepted as tool input arguments

### Features

- [x] `siem_query_alerts` — query alerts from Splunk and Microsoft Sentinel with time-range and severity filters
- [x] `run_triage_playbook` — execute pre-defined alert triage playbooks and return structured findings
- [x] `query_vulnerabilities` — look up CVEs via NVD API with CVSS scoring and affected asset context
- [x] `mitre_attack_mapping` — map observed TTPs to MITRE ATT&CK techniques, tactics, and mitigations
- [x] `generate_incident_report` — produce SOC2/FedRAMP-compliant incident reports in structured format
- [x] `threat_intelligence_lookup` — stub interface for threat feed lookups (expanded in Phase 2)
- [x] `security_posture_assessment` — stub interface for compliance framework scoring (expanded in Phase 2)
- [x] TypeScript strict mode
- [x] Basic Vitest test suite with fixture alert payloads and mock SIEM responses
- [x] `CHANGELOG.md` initialized
- [x] Semantic versioning from first release
- [x] Publish to npm

---

## Phase 2: Polish & Adoption (Weeks 5–8) ✅ Complete

### Goal

Make the server genuinely useful for SOC analysts and security-aware agents by adding threat intelligence enrichment, compliance posture scoring, automated triage, and cross-source alert correlation.

### MCP Best Practices

- [x] Progress notifications (`notifications/progress`) for long-running vulnerability scans and posture assessments
- [x] Cancellation support (`notifications/cancelled`) — cancel an in-flight SIEM query or scan cleanly
- [x] MCP logging (`notifications/message`) — emit debug events for query execution times, playbook steps, and SIEM connection status
- [x] Streamable HTTP transport (MCP 2025 spec) — expose a shared SOC connector for analyst teams
- [x] MCP Resources primitive: expose threat intelligence feeds as browsable resources (`security://{feed_name}/{indicator_type}`)
- [x] MCP Prompts primitive: `incident-response` prompt template to guide agents through triage, containment, and reporting steps
- [x] Result pagination — `limit` and `offset` parameters in `siem_query_alerts` and `query_vulnerabilities` for high-volume result sets

### Features

- [x] `threat_intelligence_lookup` — full integration with VirusTotal, AbuseIPDB, and AlienVault OTX for IP/domain/hash enrichment
- [x] `security_posture_assessment` — NIST CSF, CIS Controls, and MITRE ATT&CK coverage scoring against asset inventory
- [x] Automated triage with configurable playbooks — YAML-defined playbook engine for `run_triage_playbook`
- [x] Correlation engine — cross-source alert deduplication and clustering by TTP and affected asset
- [x] Severity-based alert prioritization — CVSS-weighted and business-context-aware scoring for `siem_query_alerts`
- [x] ESLint + Prettier enforced in CI
- [x] 90%+ test coverage with fixture alert payloads, mocked SIEM APIs, and NVD/VirusTotal stubs
- [x] GitHub Actions CI
- [x] Listed on MCP Registry
- [x] Listed on MCP Market

---

## Phase 3: Enterprise & Scale (Weeks 9+) ✅ Complete

### Goal

Serve federal agencies and enterprise SOC teams that need FedRAMP-compliant logging, SOAR integration, real-time streaming, multi-tenant analyst support, and full audit trails across all security operations.

### MCP Enterprise Standards

- [x] OAuth 2.0 authorization (MCP 2025 spec) for the hosted security connector API
- [x] Rate limiting on SIEM query and vulnerability scan endpoints
- [x] API key authentication for team and multi-tenant SOC access
- [x] Multi-transport: stdio for local analyst workstations, Streamable HTTP for shared enterprise SOC instance
- [x] RBAC for SOC analyst roles — tier-1 triage, tier-2 investigation, and IR lead permissions enforced at the tool layer
- [x] Audit trail for all security operations — tamper-evident structured log of every tool call, analyst identity, and result

### Features

- [x] Real-time SIEM alert streaming via WebSocket — push new alerts to connected agents without polling
- [x] Integration with Nessus and Qualys — ingest scan results directly into `query_vulnerabilities`
- [x] Automated incident escalation workflows — trigger escalation paths from `run_triage_playbook` based on severity thresholds
- [x] SOAR platform integration — bidirectional connector for Splunk SOAR and Palo Alto XSOAR
- [x] Custom playbook builder — analyst-authored YAML playbooks with conditional branching and external action hooks
- [x] Threat hunting query library — curated Sigma and SPL query templates surfaced via `siem_query_alerts`
- [x] FedRAMP-compliant logging — structured audit logs meeting FedRAMP Moderate control AU-2 through AU-12
- [x] Multi-tenant SOC support — isolated data planes and credential stores per tenant organization

---

## Guiding Principles

- **Credentials never logged** — sanitize API keys, SIEM tokens, and connection strings before any output or error message
- **Least privilege by default** — tools request only the minimum SIEM and API permissions required; write-capable tools require explicit analyst confirmation
- **Defense in depth** — multiple validation layers (Zod schema, RBAC, audit trail) independently enforce security boundaries
- **Compliance-first design** — incident reports, audit logs, and posture assessments are structured for SOC2, FedRAMP, and NIST CSF from day one
- **MITRE ATT&CK aligned** — all triage, mapping, and hunting features use ATT&CK taxonomy as the common language across tools
