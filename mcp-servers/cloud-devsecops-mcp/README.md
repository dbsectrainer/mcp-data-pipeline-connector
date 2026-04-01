# Cloud & DevSecOps MCP Server

**AI cloud architect assistant for federal-grade infrastructure management.**

Built by **BE EASY ENTERPRISES LLC** as part of the MCP Data Pipeline Connector platform.

---

## Overview

The Cloud & DevSecOps MCP server provides seven tools that enable AI assistants to manage multi-cloud infrastructure, enforce security policies, monitor cloud posture, analyze costs, and scan containers and Kubernetes clusters for vulnerabilities.

All tools follow security-first patterns appropriate for federal-grade (FedRAMP, NIST, STIG) environments, with mandatory dry-run gates for production and GovCloud deployments.

## Tools

| Tool | Description |
|------|-------------|
| `deploy_infrastructure` | Deploy IaC templates (Terraform, CloudFormation, Bicep) to AWS, Azure, or GCP with mandatory dry-run support. Production/GovCloud deployments undergo automatic security preflight scanning. |
| `enforce_security_policies` | Evaluate cloud configurations against CIS benchmarks with optional auto-remediation. Covers compute, storage, network, and IAM scopes. |
| `monitor_cloud_posture` | Query provider-native security tools (AWS Security Hub, Microsoft Defender, GCP SCC) for posture findings and recommendations. |
| `cost_analysis` | Analyze cloud spend with breakdown by service, tag, account, or region. Includes optimization recommendations with estimated savings. |
| `kubernetes_security_scan` | Scan K8s clusters for RBAC misconfigurations, missing network policies, pod security violations, and vulnerable images. |
| `container_image_scan` | Scan container images for known CVEs with configurable severity thresholds. |
| `iac_security_review` | Review IaC templates against compliance frameworks (FedRAMP, CIS, NIST, STIG) for security issues including public access, hardcoded secrets, missing encryption, and IAM wildcards. |

## Project Structure

```
cloud-devsecops-mcp/
  src/
    index.ts                  # Entry point — stdio transport
    server.ts                 # MCP tool definitions
    types.ts                  # Zod schemas and TypeScript interfaces
    providers/
      aws-client.ts           # AWS Security Hub, CloudFormation, Cost Explorer
      azure-client.ts         # Azure Defender, ARM/Bicep, Cost Management
      gcp-client.ts           # GCP SCC, Deployment Manager, Billing
    security/
      policy-engine.ts        # CIS benchmark policy enforcement engine
      iac-scanner.ts          # Infrastructure-as-Code security scanner
    utils/
      cost-analyzer.ts        # Multi-provider cost analysis
  tests/
    server.test.ts            # Vitest test suite
  package.json
  tsconfig.json
  .env.example
```

## Getting Started

### Prerequisites

- Node.js >= 20.19.0
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

## Configuration

Copy `.env.example` to `.env` and populate with your cloud provider credentials:

```bash
cp .env.example .env
```

Required variables vary by provider. See `.env.example` for the full list including:

- **AWS**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- **Azure**: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- **GCP**: `GCP_PROJECT_ID`, `GCP_CREDENTIALS_PATH`

## MCP Integration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "cloud-devsecops": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/cloud-devsecops-mcp"
    }
  }
}
```

## Security Considerations

- Production and GovCloud deployments are blocked if critical IaC findings are detected.
- All tools default to read-only/dry-run operations where applicable.
- Auto-remediation is disabled by default and must be explicitly requested.
- Credentials are never logged or included in tool responses.
- Compliance scanning covers FedRAMP, CIS, NIST 800-53, and DISA STIG frameworks.

## License

UNLICENSED -- Proprietary to BE EASY ENTERPRISES LLC.
