# Roadmap — MCP Data Pipeline Connector

## Phase 1: MVP (Weeks 1–4) ✅ Complete

### Goal

Ship a working connector for CSV files and Postgres databases with a unified SQL query interface — covering the two most common developer data sources without writing source-specific code.

### MCP Protocol Compliance

- [x] Implement stdio transport (required baseline for all MCP servers)
- [x] Strict JSON Schema for all tool inputs — `query` requires `sql: string`; `connect_source` requires `name: string`, `type: enum("csv"|"postgres"|"rest")`
- [x] Tool annotations: `query`, `list_sources`, `list_tables`, `get_schema` marked `readOnlyHint: true`; `connect_source`, `transform` marked `readOnlyHint: false`
- [x] `--read-only` flag enforced at the SQL layer — reject non-SELECT statements when enabled
- [x] Proper MCP error codes: `invalid_params` for bad SQL or unknown source name, `internal_error` for connection or query failures
- [x] Verified with MCP Inspector before publish
- [x] `package.json` with correct `bin`, `files`, `keywords: ["mcp", "mcp-server", "data", "sql", "duckdb"]`
- [x] Credentials in environment variables only — never accepted as tool input arguments

### Features

- [x] CSV/JSON file connector with auto-schema detection
- [x] PostgreSQL connector (tables and views)
- [x] `connect_source` — register sources at runtime or from `~/.mcp/data-sources.yaml`
- [x] `list_sources` — show connected sources and connection status
- [x] `list_tables` — enumerate available tables per source
- [x] `get_schema` — return column names and inferred types
- [x] `query` — DuckDB-powered SQL (respects `--max-rows` and `--read-only` flags)
- [x] `~/.mcp/data-sources.yaml` config format with env var substitution for credentials
- [x] TypeScript strict mode
- [x] Basic Jest/Vitest test suite with fixture CSV datasets
- [x] `CHANGELOG.md` initialized
- [x] Semantic versioning from first release
- [x] Publish to npm

---

## Phase 2: Polish & Adoption (Weeks 5–8) ✅ Complete

### Goal

Make the connector genuinely useful for analysts and data-aware agents by adding cross-source joins, more connectors, and transformation support.

### MCP Best Practices

- [x] Progress notifications (`notifications/progress`) for long-running queries
- [x] Cancellation support (`notifications/cancelled`) — cancel a running DuckDB query cleanly
- [x] MCP logging (`notifications/message`) — emit debug events for query execution times and source connection status
- [x] Streamable HTTP transport (MCP 2025 spec) — expose a shared data connector for a team
- [x] MCP Resources primitive: expose connected source schemas as browsable resources (`data://{source_name}/{table_name}`)
- [x] MCP Prompts primitive: `explore-data` prompt template to guide agents through schema discovery before querying
- [x] Result pagination — `limit` and `offset` parameters in `query` tool for large datasets

### Features

- [x] REST API connector (GET endpoints with configurable auth and pagination, respects `--rest-cache-ttl`)
- [x] Cross-source joins via DuckDB — query across CSV + Postgres in one SQL statement
- [x] `transform` — apply aggregations, filters, or reshaping and return or save results
- [x] Schema normalization — map source-specific types to standard set
- [x] Connection health checks — detect when a source goes offline
- [x] `--rest-cache-ttl` flag wired up for REST response caching
- [x] ESLint + Prettier enforced in CI
- [x] 90%+ test coverage with fixture datasets for CSV, Postgres (testcontainers), and mocked REST
- [x] GitHub Actions CI
- [x] Listed on MCP Registry
- [x] Listed on MCP Market

---

## Phase 3: Monetization & Enterprise (Weeks 9+) ✅ Complete

### Goal

Serve data teams and enterprises that need SaaS connectors, query governance, and large-scale access control.

### MCP Enterprise Standards

- [x] OAuth 2.0 authorization (MCP 2025 spec) for the hosted connector API
- [x] Rate limiting on query execution endpoints
- [x] API key authentication for team connector access
- [x] Multi-transport: stdio for local use, Streamable HTTP for shared team/enterprise instance
- [x] Column-level access control enforced at the DuckDB layer — not just advisory
- [x] Row-level security — filter data based on requester identity claims in the auth token

### Features

- [x] Google Sheets connector
- [x] Airtable connector
- [x] Salesforce connector (paid tier)
- [x] HubSpot connector (paid tier)
- [x] Query audit log — structured record of what data agents accessed and when
- [x] Paid tier: SaaS connectors, governance, team management, audit log

---

## Guiding Principles

- **Credentials never logged** — sanitize connection strings and API keys before any output or error message
- **Read-only by default** — `--read-only` is the default; write access requires explicit opt-in
- **Connector isolation** — each connector fails independently; one offline source doesn't break others
- **SQL-first** — DuckDB SQL is the universal query language; no proprietary query DSL
- **Start small** — CSV and Postgres first; add connectors only after MVP demand is validated
