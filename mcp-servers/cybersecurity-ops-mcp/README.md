# Cybersecurity Operations MCP Server

**@be-easy/cybersecurity-ops-mcp** -- the central brain for security workflows at BE EASY ENTERPRISES LLC.

This MCP (Model Context Protocol) server provides AI-accessible cybersecurity operations tooling for federal-grade IT, AI, and cloud environments. It integrates with SIEM platforms, vulnerability databases, threat intelligence feeds, and compliance frameworks to deliver automated security workflows through a standardized protocol.

## Tools

| Tool | Description |
|------|-------------|
| `siem_query_alerts` | Query alerts from Splunk, Microsoft Sentinel, or generic SIEM sources |
| `run_triage_playbook` | Execute automated triage playbooks with optional auto-remediation |
| `query_vulnerabilities` | Search CVE/NVD vulnerability database by ID, keyword, severity, or product |
| `mitre_attack_mapping` | Map threats to the MITRE ATT&CK framework |
| `generate_incident_report` | Generate incident reports in SOC2, FedRAMP, NIST, or internal formats |
| `threat_intelligence_lookup` | Look up IOCs across threat intelligence feeds (VirusTotal, AbuseIPDB, OTX) |
| `security_posture_assessment` | Assess security posture across scopes using NIST CSF, CIS, or MITRE frameworks |

## Prerequisites

- Node.js >= 20.19.0
- npm or compatible package manager

## Setup

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys and endpoints

# Build
npm run build

# Run in development mode
npm run dev
```

## Configuration

All integrations are configured via environment variables. See `.env.example` for the full list:

- **Splunk**: `SPLUNK_API_URL`, `SPLUNK_TOKEN`, `SPLUNK_VERIFY_SSL`
- **Microsoft Sentinel**: `SENTINEL_WORKSPACE_ID`, `SENTINEL_API_KEY`, `SENTINEL_TENANT_ID`, `SENTINEL_SUBSCRIPTION_ID`
- **NVD/CVE**: `NVD_API_KEY`, `NVD_API_URL`
- **Threat Intelligence**: `VIRUSTOTAL_API_KEY`, `ABUSEIPDB_API_KEY`, `OTX_API_KEY`
- **Encryption**: `ENCRYPTION_KEY`, `ENCRYPTION_ALGORITHM`

## Testing

```bash
npm test
```

## Architecture

```
src/
  index.ts                        # Entry point (stdio transport)
  server.ts                       # MCP tool registrations
  types.ts                        # TypeScript type definitions
  integrations/
    siem-client.ts                # Splunk/Sentinel SIEM client
    vulnerability-scanner.ts      # CVE/NVD query client with caching
    mitre-attack.ts               # MITRE ATT&CK framework utilities
    threat-intel.ts               # Threat intelligence feed aggregator
  utils/
    report-generator.ts           # Compliance-aware report generation
    crypto.ts                     # Cryptographic utilities
tests/
  server.test.ts                  # Test suite
```

## Security

- All indicator data is hashed before storage using SHA-256.
- Sensitive data encryption uses AES-256-GCM with authenticated encryption.
- API tokens and secrets are never logged; they are redacted in all output.
- Input validation is enforced via Zod schemas on all tool parameters.

## License

UNLICENSED -- Proprietary to BE EASY ENTERPRISES LLC.
