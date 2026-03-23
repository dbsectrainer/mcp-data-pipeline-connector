# MCP Data Pipeline Connector

npm `mcp-data-pipeline-connector` package

One MCP server for all your data sources — with cross-source SQL joins and no external query service. DuckDB runs embedded in-process, so you can join a CSV file against a Postgres table against a REST API response in a single query, entirely on your machine. Agents work with your data without needing source-specific knowledge or multiple MCP server configs.

[Tool reference](#tools) | [Configuration](#configuration) | [Contributing](#contributing) | [Troubleshooting](#troubleshooting)

## Key features

- **Unified query interface**: SQL across all connected sources via DuckDB — including cross-source joins.
- **Multiple source types**: CSV/JSON files, PostgreSQL databases, and REST API endpoints in a single server.
- **Auto schema detection**: Infers column names and types from CSV headers and Postgres metadata.
- **REST caching**: REST API responses are cached with a configurable TTL to avoid redundant calls.
- **Schema normalization**: Maps source-specific types to a standard set (string, number, date, boolean, json).
- **In-process query engine**: DuckDB runs embedded — no separate query service to install or manage.

## Why this over separate per-source MCP servers?

The common alternative is running one MCP server per data source — a postgres MCP server, a CSV MCP server, a REST MCP server. Each works fine in isolation, but they can't talk to each other.

|                    | mcp-data-pipeline-connector                                                 | Separate per-source servers                       |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------- |
| Cross-source joins | Native SQL via embedded DuckDB                                              | Not possible — agent must fetch and join manually |
| Config complexity  | One server entry in your MCP config                                         | One entry per source type                         |
| Query engine       | DuckDB in-process — no install, no service                                  | Depends on each source's query capabilities       |
| Schema unification | Normalizes all types to string/integer/number/datetime/boolean/json/unknown | Each source uses its own type system              |
| Data residency     | All queries run locally                                                     | Depends on each connector's implementation        |

If you're asking questions that span multiple data sources — "join my sales CSV with the users table" — this is the right tool. If you only ever query one source type, a dedicated single-source server is simpler.

## Disclaimers

`mcp-data-pipeline-connector` connects to data sources you configure and executes queries against them on behalf of your agent. Ensure agents only have the database permissions they need. Connection strings are never logged or transmitted; keep them out of version-controlled config files. Use environment variables for credentials.

## Requirements

- Node.js v20.19 or newer.
- npm.
- Optional: A running PostgreSQL instance for the Postgres connector.

## Getting started

Add the following config to your MCP client:

```json
{
  "mcpServers": {
    "data-connector": {
      "command": "npx",
      "args": ["-y", "mcp-data-pipeline-connector@latest"]
    }
  }
}
```

Define your data sources in `~/.mcp/data-sources.yaml`:

```yaml
sources:
  - name: sales
    type: csv
    path: ~/data/sales-2025.csv
  - name: users
    type: postgres
    connection_string: "${POSTGRES_URL}"
    tables: [users, subscriptions]
```

> Store connection strings in environment variables, not directly in the YAML file.

### MCP Client configuration

Amp · Claude Code · Cline · Cursor · VS Code · Windsurf · Zed

## Your first prompt

Place a CSV file at `~/data/sample.csv`, add it as a source in your config, then enter:

```
What columns are in the sample table? Show me the first 5 rows.
```

Your client should return the schema and a preview of the data.

## Tools

### Sources (2 tools)

- `connect_source`
- `list_sources`

### Schema (2 tools)

- `list_tables`
- `get_schema`

### Data (2 tools)

- `query`
- `transform`

### Health (1 tool)

- `check_health`

## Configuration

### `--config` / `--sources-config`

Path to the YAML file defining data sources.

Type: `string`
Default: `~/.mcp/data-sources.yaml`

### `--rest-cache-ttl`

Time-to-live in seconds for cached REST API responses. Set to `0` to disable caching.

Type: `number`
Default: `300`

### `--max-rows`

Maximum number of rows returned by a single `query` call. Prevents accidental large result sets.

Type: `number`
Default: `1000`

### `--read-only`

Reject any SQL statements that are not `SELECT` queries. Enforces read-only access across all sources.

Type: `boolean`
Default: `true`

Pass flags via the `args` property in your JSON config:

```json
{
  "mcpServers": {
    "data-connector": {
      "command": "npx",
      "args": ["-y", "mcp-data-pipeline-connector@latest", "--max-rows=5000", "--rest-cache-ttl=60"]
    }
  }
}
```

## Verification

Before publishing a new version, verify the server with MCP Inspector to confirm all tools are exposed correctly and the protocol handshake succeeds.

**Interactive UI** (opens browser):

```bash
npm run build && npm run inspect
```

**CLI mode** (scripted / CI-friendly):

```bash
# List all tools
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list

# List resources and prompts
npx @modelcontextprotocol/inspector --cli node dist/index.js --method resources/list
npx @modelcontextprotocol/inspector --cli node dist/index.js --method prompts/list

# Call a tool (example — replace with a relevant read-only tool for this plugin)
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call --tool-name list_sources

# Call a tool with arguments
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call --tool-name list_sources --tool-arg key=value
```

Run before publishing to catch regressions in tool registration and runtime startup.

## Contributing

Each connector lives in `src/connectors/` and must implement the `DataConnector` interface. Add fixture data files under `tests/fixtures/` for integration tests. Never log connection strings or credentials — sanitize before any output or error message.

```bash
npm install && npm test
```

## Listings

`mcp-data-pipeline-connector` is listed on [MCP Registry](https://registry.modelcontextprotocol.io) and [MCP Market](https://mcpmarket.io).

## Troubleshooting

- **REST source fails to connect**: Confirm the URL is reachable and any auth env var is set. Use `check_health` to retest after startup.
- **Cross-source join returns no results**: Ensure both sources are CSV type and registered before using `source='_all'`.
- **Query returns `truncated: true`**: Increase `--max-rows` or add a `LIMIT` clause to your SQL.
