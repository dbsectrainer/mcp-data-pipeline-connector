# Roadmap — Contracting & Proposal MCP

Server for **BE EASY ENTERPRISES LLC** — a federal contractor toolchain exposing 8 MCP tools:
`parse_rfp`, `generate_proposal_draft`, `capability_requirements_mapping`, `pricing_analysis`,
`compliance_check`, `past_performance_search`, `contract_vehicle_analysis`, `sam_gov_search`.

---

## Phase 1: MVP (Weeks 1–4)

**Goal:** Ship a fully compliant MCP server over stdio that covers the core proposal lifecycle —
RFP parsing through compliant draft generation — with production-quality validation and a published
npm package.

### MCP Protocol Compliance

- [x] stdio transport implemented and verified
- [x] Zod validation on all tool inputs and outputs
- [x] Tool annotations (`readOnly`, `destructive`, `idempotent`) set correctly on all 8 tools
- [x] MCP error codes used consistently (`InvalidParams`, `ToolNotFound`, `InternalError`, etc.)
- [x] Server verified end-to-end with MCP Inspector

### Features

- [x] SAM.gov API client with mock fallback for offline/test environments
- [x] `parse_rfp` — requirement extraction and section categorization (L/M/C, PWS, SOW, QASP)
- [x] `generate_proposal_draft` — draft generation for all 5 volume types: Technical, Management,
      Past Performance, Cost, and Executive Summary
- [x] `compliance_check` — compliance traceability matrix (CTM) generation mapping requirements
      to proposal sections
- [x] `pricing_analysis` — fully-burdened rate calculator (labor categories, wrap rates, fee)
- [x] `capability_requirements_mapping` — keyword-based capability-to-requirement mapping with
      gap analysis
- [x] TypeScript strict mode enabled across the entire codebase
- [x] Vitest unit and integration test suite in place
- [x] CHANGELOG.md initialized and maintained
- [x] Package published to npm

---

## Phase 2: Polish & Adoption (Weeks 5–8)

**Goal:** Elevate the server to a best-practice MCP implementation with streaming, browsable
resources, reusable prompt templates, and a richer federal contracting data layer — ready for
broad team adoption.

### MCP Best Practices

- [x] Progress notifications implemented for long-running `parse_rfp` operations
- [x] Cancellation support (`CancellationToken`) honored in all long-running tools
- [x] MCP structured logging integrated (server-side log levels surfaced to client)
- [x] Streamable HTTP transport added alongside stdio
- [x] MCP Resources — contract vehicles exposed as browsable, linkable resources
- [x] MCP Prompts — `proposal-review` prompt template registered for reuse across clients

### Features

- [x] Contract vehicle database with scoring logic: GSA MAS, CIO-SP3, Alliant 2, OASIS+, SEWP V
- [x] `sam_gov_search` — opportunity search with filters: NAICS code, set-aside type, date range
- [x] Past performance database with `past_performance_search` full-text and keyword search
- [x] `pricing_analysis` — extended strategy analysis: FFP, T&M, Cost-Plus, IDIQ, BPA
- [x] Small business set-aside analysis: 8(a), HubZone, SDVOSB, WOSB eligibility checks
- [x] `compliance_check` — expanded checks: format, content, certifications, pricing,
      representations and certifications (Reps & Certs)
- [x] ESLint + Prettier enforced in CI
- [x] 90%+ test coverage gate in CI
- [x] GitHub Actions CI pipeline (lint → typecheck → test → coverage)

---

## Phase 3: Enterprise & Scale (Weeks 9+)

**Goal:** Harden the server for enterprise BD teams at BE EASY ENTERPRISES LLC with multi-user
security, real-time intelligence feeds, Shipley-aligned automation, and integrations with
commercial GovCon data platforms.

### MCP Enterprise Standards

- [x] OAuth 2.0 authorization server integration
- [x] Rate limiting per client/token enforced at the transport layer
- [x] API key authentication as an alternative auth mechanism
- [x] Multi-transport support (stdio + streamable HTTP running concurrently)
- [x] RBAC with defined roles: Business Development, Proposal Manager, Pricing Analyst,
      Executive Reviewer

### Features

- [x] Real-time SAM.gov opportunity alerts with configurable NAICS/keyword subscriptions
- [x] Automated win/loss analysis against historical pipeline data
- [x] Teaming partner matching based on capability gaps identified in `capability_requirements_mapping`
- [x] Price-to-win (PTW) modeling integrated into `pricing_analysis`
- [x] Proposal version control — snapshot and diff support across draft iterations
- [x] Collaborative editing support — concurrent session management with conflict resolution
- [x] GovWin IQ integration for pipeline and incumbent intelligence
- [x] Bloomberg Government integration for market and award data
- [x] Shipley Business Development Lifecycle process automation (gate reviews, action items)
- [x] Multi-IDIQ task order tracking across active contract vehicles
- [x] Pipeline forecasting with probability-weighted revenue projections

---

## Guiding Principles

**Compliance before creativity.** Every proposal artifact produced by this server must satisfy
the stated RFP requirements before any differentiators are layered in. The compliance traceability
matrix is generated first, not last.

**FAR/DFARS aligned.** All pricing calculations, representations, and compliance checks reference
the applicable FAR and DFARS clauses. Clause citations are surfaced in tool output so reviewers
can verify without leaving the MCP client.

**Win probability driven.** Tool outputs are designed to feed a capture management decision
loop — not just generate documents. Scoring, gap analysis, and PTW outputs are structured so a
BD lead can make a bid/no-bid call from MCP tool results alone.

**Past performance reuse.** The past performance database is a first-class data layer. Relevant
past performance is surfaced automatically during proposal drafting so no relevant project
citation is overlooked.

**Capture management integrated.** The server is scoped to support the full Shipley lifecycle
from opportunity identification through proposal submission, not just document generation.
Pipeline forecasting and teaming partner matching sit alongside RFP parsing and draft generation
as equal citizens.
