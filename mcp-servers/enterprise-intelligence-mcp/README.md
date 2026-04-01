# Enterprise Intelligence MCP Server

**Consulting accelerator that turns data into client-ready insights for BE EASY ENTERPRISES LLC.**

Part of the [MCP Data Pipeline Connector](../../README.md) ecosystem, this server provides AI-assisted enterprise intelligence capabilities through the Model Context Protocol (MCP).

## Overview

The Enterprise Intelligence MCP server exposes seven tools that cover the full consulting engagement lifecycle — from data aggregation through analysis to client-ready deliverables.

## Tools

| Tool | Description |
|------|-------------|
| `aggregate_data_sources` | Pull and aggregate data from databases, APIs, files, and cloud storage with configurable merge strategies |
| `generate_executive_dashboard` | Generate executive-level dashboards (KPI cards, trend charts, heat maps, scorecards) for targeted audiences |
| `create_proposal` | Auto-generate technical proposals, executive summaries, capability statements, past performance volumes, and cost proposals |
| `risk_scoring` | Calculate composite risk scores using qualitative, quantitative, or hybrid methodologies |
| `competitive_analysis` | Analyze competitive landscape across pricing, capabilities, certifications, and contract vehicles |
| `trend_analysis` | Analyze trends with linear regression, seasonality detection, and forecasting |
| `generate_client_report` | Produce client-ready deliverable reports with classification-appropriate handling |

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## Architecture

```
src/
  index.ts                        # Entry point — stdio transport
  server.ts                       # MCP server with all tool registrations
  types.ts                        # Shared TypeScript type definitions
  data/
    aggregator.ts                 # Multi-source data aggregation engine
    transformer.ts                # Data normalization and transformation
  analytics/
    risk-engine.ts                # Risk scoring and assessment engine
    trend-engine.ts               # Trend analysis and forecasting
  reporting/
    dashboard-generator.ts        # Executive dashboard generation
    proposal-generator.ts         # Proposal auto-generation
    report-templates.ts           # Report type templates and formatting
tests/
  server.test.ts                  # Vitest test suite
```

## Configuration

Copy `.env.example` to `.env` and configure the required environment variables:

```bash
cp .env.example .env
```

Key configuration areas:

- **Server** — host, port, log level
- **Database** — primary and analytics database connection strings
- **Cloud Storage** — AWS S3 and Azure Blob credentials
- **External APIs** — Salesforce, Jira, and other integration credentials
- **Reporting** — output directories and template paths
- **Security** — encryption keys and API tokens

## MCP Integration

Register this server in your MCP client configuration:

```json
{
  "mcpServers": {
    "enterprise-intelligence": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/enterprise-intelligence-mcp"
    }
  }
}
```

## Requirements

- Node.js >= 20.19.0
- TypeScript >= 5.3.3

## License

UNLICENSED — Proprietary to BE EASY ENTERPRISES LLC.
