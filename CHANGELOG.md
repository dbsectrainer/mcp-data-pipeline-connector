# Changelog

All notable changes to MCP Data Pipeline Connector will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-03-23

### Fixed

- **BigInt serialization crash in `query` tool**: DuckDB returns integer columns as JavaScript `BigInt` values, which `JSON.stringify` cannot serialize, causing a `"Do not know how to serialize a BigInt"` error. Fixed by converting `BigInt` values to `Number` in the row-mapping pass inside `CsvConnector.query()` (`src/connectors/csv-connector.ts`) and in the cross-source query path in `createServer()` (`src/server.ts`). Updated the corresponding test to assert integer columns are returned as plain numbers.

## [1.0.0] - 2026-03-12

### Added

- `.env.example` documenting `MCP_API_KEY`, `MCP_JWT_SECRET`, `POSTGRES_CONNECTION_STRING`, `REST_API_AUTH_HEADER`, `AIRTABLE_API_KEY`, and `GOOGLE_SERVICE_ACCOUNT_JSON`.

### Changed

- `express` upgraded from `^4.x` to `^5.2.1`.
- `@types/node` upgraded from `^20.x` to `^24.12.0` (Node 24 LTS).
- `yargs` upgraded from `^17.x` to `^18.0.0`.
- Added `author`, `license`, `repository`, and `homepage` fields to `package.json`.

### Security

- Resolved **GHSA-67mh-4wv8-2f99** (`esbuild` ≤ 0.24.2 dev-server cross-origin exposure) by upgrading `vitest` and `@vitest/coverage-v8` to `^4.1.0`. Affects local development only; not a production runtime concern.

## [0.2.0] - 2026-03-12

### Added

- **REST API connector** (`src/connectors/rest-connector.ts`): Connect GET endpoints with optional auth header (from env var), configurable pagination parameter, and in-memory TTL caching.
- **`--rest-cache-ttl` flag**: Controls REST response cache TTL in seconds (default 60). Pass `0` to disable caching entirely.
- **Cross-source joins via DuckDB**: `query` tool now accepts `source='_all'` or a `sources` array to query across multiple CSV sources in a single SQL statement using a shared in-memory DuckDB instance.
- **`transform` tool**: Apply filter, select, rename, and aggregate operations to a source table. Returns results as JSON or CSV.
- **`check_health` tool**: Check whether registered data sources are reachable. Runs file existence check (CSV), `SELECT 1` (Postgres), or HEAD request (REST). Returns per-source health status with timestamp.
- **Schema normalization** (`normalizeType` in `src/connectors/base.ts`): Maps source-specific types to a standard set — `string`, `integer`, `number`, `boolean`, `datetime`, `json`, `unknown`. All `getSchema()` responses now include a `normalized_type` field.
- **`healthCheck()` method** on all connectors (`DataConnector` interface extended).
- **`SourceRegistry.checkHealth()`**: Run health checks across all or a specific named source.
- **`SourceRegistry.getCrossSourceDb()`**: Returns a shared DuckDB in-memory connection with all CSV sources attached as views for cross-source query execution.
- **Result pagination**: `query` tool accepts `limit` and `offset` parameters. Response includes `total_returned`, `offset`, and `has_more` fields.
- **MCP Resources primitive**: `data://{source_name}/{table_name}` URIs expose source schemas as browsable MCP resources. Agents can list and read schemas without calling `get_schema` explicitly.
- **MCP Prompts primitive**: `explore-data` prompt template guides agents through schema discovery (list_sources → list_tables → get_schema) before writing any queries.
- **MCP logging notifications** (`notifications/message`): Emits `info` on source connect, `debug` with query execution time, and `warning` when health checks fail.
- **Progress notifications** (`notifications/progress`): Emitted for complex queries (JOIN, GROUP BY, ORDER BY, DISTINCT, UNION) at 0%, 30%, 60%, and 100%.
- **Streamable HTTP transport** (`src/http-server.ts`): `--http-port` flag (default 0 = disabled) exposes the MCP server via the MCP 2025 Streamable HTTP spec for shared team deployments.
- **ESLint + Prettier**: `eslint.config.js` and `.prettierrc.json` configured. `npm run lint` and `npm run format` scripts added.
- **GitHub Actions CI** (`.github/workflows/ci.yml`): Runs build, test, and lint on push/PR to `main`.
- **Expanded test coverage**: Phase 2 tests covering REST connector (mocked fetch), schema normalization, health checks, pagination, transform, and cross-source queries. Total: 61 tests across 3 suites.
- **`CsvConnector.getResolvedPath()`**: Exposes the resolved file path for cross-source DuckDB view registration.
- **`url` parameter** accepted by `connect_source` tool for REST sources.
- **Server version** bumped to `0.2.0`.

## [0.1.0] - 2026-03-12

### Added

- Initial public release of `mcp-data-pipeline-connector` (Phase 1 MVP).
- **CSV/JSON connector**: auto-schema detection via DuckDB `read_csv_auto` / `read_json_auto`.
- **PostgreSQL connector**: table and view enumeration via DuckDB postgres extension.
- **DuckDB-powered query engine**: embedded in-process SQL execution — no separate service required.
- **`connect_source` tool**: register data sources at runtime or from `~/.mcp/data-sources.yaml`.
- **`list_sources` tool**: show all registered sources and their connection status.
- **`list_tables` tool**: enumerate available tables per source or across all sources.
- **`get_schema` tool**: return column names and normalized types (`string`, `number`, `boolean`, `date`, `json`).
- **`query` tool**: DuckDB-powered SQL with `--max-rows` and `--read-only` flag support.
- **`~/.mcp/data-sources.yaml` config format** with `${ENV_VAR}` substitution for credentials.
- **`--read-only` flag** (default `true`): rejects non-SELECT statements at the SQL layer.
- **`--max-rows` flag** (default `1000`): prevents accidental large result sets.
- **`--config` / `--sources-config` flag**: custom path for the data sources YAML file.
- **Credential safety**: connection strings are never accepted as tool input arguments; never logged; sanitized in all output.
- stdio transport compliant with the MCP protocol.
- Strict JSON Schema validation on all tool inputs.
- Tool annotations: `query`, `list_sources`, `list_tables`, `get_schema` marked `readOnlyHint: true`; `connect_source` marked `readOnlyHint: false`.
- Proper MCP error codes: `invalid_params` for bad SQL or unknown source; `internal_error` for connection/query failures.
- TypeScript strict mode throughout.
- Vitest test suite with fixture CSV datasets covering connector behavior, read-only enforcement, max-rows truncation, and env var substitution.
