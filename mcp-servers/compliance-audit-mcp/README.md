# Compliance & Audit MCP Server

**`@be-easy/compliance-audit-mcp`** — Automates compliance workflows for federal contracts (FedRAMP, CMMC, NIST 800-53, FISMA, HIPAA, SOX).

Built by **BE EASY ENTERPRISES LLC**.

## Overview

This MCP server provides seven tools that streamline federal compliance management:

| Tool | Description |
|------|-------------|
| `map_controls` | Map security controls across frameworks with cross-framework mappings |
| `generate_ssp` | Generate System Security Plans with applicable controls |
| `continuous_monitoring` | Run compliance monitoring checks and compute compliance scores |
| `collect_audit_evidence` | Collect, catalog, and organize audit evidence for specific controls |
| `poam_management` | Create, update, close, and list Plan of Action & Milestones items |
| `compliance_gap_analysis` | Identify gaps between current and target compliance frameworks |
| `generate_audit_report` | Generate SSP, SAR, POA&M, and other compliance reports |

## Supported Frameworks

- **NIST 800-53 Rev 5** — Full control catalog with family-level organization
- **CMMC 2.0** — Levels 1-3 with practice-to-NIST mappings
- **FedRAMP** — Low, Moderate, and High baselines
- **FISMA** — Federal Information Security Modernization Act (leverages NIST 800-53)
- **HIPAA** — Health Insurance Portability and Accountability Act controls
- **SOX** — Sarbanes-Oxley IT General Controls

## Quick Start

### Prerequisites

- Node.js >= 20.19.0

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

### Development

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

## Architecture

```
src/
  index.ts                     # Entry point (stdio transport)
  server.ts                    # MCP tool definitions
  types.ts                     # Zod schemas and TypeScript types
  frameworks/
    nist-800-53.ts             # NIST 800-53 Rev 5 control catalog
    cmmc.ts                    # CMMC 2.0 domain and practice mapping
    fedramp.ts                 # FedRAMP baseline controls and templates
  engines/
    control-mapper.ts          # Cross-framework control mapping engine
    evidence-collector.ts      # Automated evidence collection
    ssp-generator.ts           # System Security Plan document generator
  utils/
    audit-trail.ts             # Immutable, hash-chained audit trail logging
tests/
  server.test.ts               # Vitest test suite
```

## Configuration

Copy `.env.example` to `.env` and configure as needed. See the example file for all available settings including:

- Audit trail storage path and retention
- Evidence storage and encryption
- GRC platform integration
- Notification webhooks

## MCP Integration

This server communicates over stdio and is compatible with any MCP-aware client. Add it to your MCP client configuration:

```json
{
  "mcpServers": {
    "compliance-audit": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## License

UNLICENSED — Proprietary. BE EASY ENTERPRISES LLC.
