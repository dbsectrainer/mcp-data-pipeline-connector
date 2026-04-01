# Contracting & Proposal MCP Server

**BE EASY ENTERPRISES LLC**

An enterprise-grade Model Context Protocol (MCP) server that streamlines government contracting and proposal development workflows. Built to help win federal contracts by automating RFP analysis, proposal generation, compliance checking, and pricing strategy.

## Features

| Tool | Description |
|------|-------------|
| `parse_rfp` | Parse and analyze RFPs from SAM.gov, eBuy, GSA Advantage, or manual text |
| `generate_proposal_draft` | Generate structured proposal drafts (technical, management, cost, past performance, executive summary) |
| `capability_requirements_mapping` | Map company capabilities to RFP requirements with gap analysis |
| `pricing_analysis` | Calculate fully-burdened rates, total pricing, and competitive positioning |
| `compliance_check` | Verify proposal compliance against RFP requirements |
| `past_performance_search` | Search and compile relevant past performance data |
| `contract_vehicle_analysis` | Analyze and recommend applicable contract vehicles (GSA MAS, OASIS+, CIO-SP3, etc.) |
| `sam_gov_search` | Search SAM.gov for federal contracting opportunities |

## Prerequisites

- Node.js >= 20.19.0
- SAM.gov API key (optional; mock data used when not configured)

## Setup

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
# Edit .env with your SAM.gov API key and company identifiers

# Build
npm run build

# Run in development mode
npm run dev
```

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `SAM_GOV_API_KEY` | API key for SAM.gov Opportunities API |
| `SAM_GOV_BASE_URL` | SAM.gov API base URL |
| `COMPANY_UEI` | Unique Entity Identifier |
| `COMPANY_CAGE_CODE` | Commercial and Government Entity code |
| `COMPANY_NAME` | Company legal name |
| `DEFAULT_OVERHEAD_RATE` | Default overhead rate for pricing |
| `DEFAULT_GA_RATE` | Default G&A rate |
| `DEFAULT_FRINGE_RATE` | Default fringe benefit rate |
| `DEFAULT_PROFIT_MARGIN` | Default profit margin |

## Usage with MCP Clients

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "contracting-proposal": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/contracting-proposal-mcp"
    }
  }
}
```

## Project Structure

```
src/
  index.ts                    # Entry point (stdio transport)
  server.ts                   # MCP server with tool registrations
  types.ts                    # Zod schemas and TypeScript types
  parsers/
    rfp-parser.ts             # RFP document parsing and extraction
    sam-gov-client.ts         # SAM.gov API integration
  generators/
    proposal-writer.ts        # Proposal draft generation
    compliance-matrix.ts      # Compliance traceability matrix
  analysis/
    pricing-engine.ts         # Pricing strategy and calculations
    capability-mapper.ts      # Capability-to-requirement mapping
    contract-vehicles.ts      # Contract vehicle recommendations
tests/
  server.test.ts              # Vitest test suite
```

## Testing

```bash
npm test
```

## License

UNLICENSED — Proprietary to BE EASY ENTERPRISES LLC.
