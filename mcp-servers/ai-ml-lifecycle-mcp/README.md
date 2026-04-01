# AI/ML Lifecycle MCP Server

**BE EASY ENTERPRISES LLC**

Enterprise-grade Model Context Protocol (MCP) server for managing secure AI pipelines, model governance, bias detection, drift monitoring, and ML experiment tracking.

## Overview

The AI/ML Lifecycle MCP server provides AI assistants with tools to manage the complete machine learning lifecycle, from experiment tracking through production deployment and ongoing governance. It is designed for organizations that require auditable, compliant, and secure AI operations.

## Tools

| Tool | Description |
|------|-------------|
| `track_model_version` | Register model versions with framework metadata, metrics, and artifact references |
| `data_lineage_query` | Trace data flow through the ML pipeline — datasets, transformations, and model I/O |
| `bias_detection` | Evaluate models against protected attributes using fairness metrics |
| `drift_detection` | Detect data, concept, and prediction drift between reference and production data |
| `secure_model_deployment` | Deploy models to cloud and edge targets with encryption, access control, and audit logging |
| `model_governance_check` | Run governance checks covering bias, explainability, security, privacy, compliance, and performance |
| `experiment_tracking` | Record experiment parameters, metrics, and status for reproducibility |

## Architecture

```
src/
  index.ts                          # Entry point (stdio transport)
  server.ts                         # MCP tool registration
  types.ts                          # Shared type definitions
  tracking/
    model-registry.ts               # Model version registry
    experiment-tracker.ts           # Experiment tracking and comparison
  governance/
    bias-detector.ts                # Fairness metrics and bias detection
    drift-monitor.ts                # Statistical drift detection
    compliance-checker.ts           # NIST AI RMF / EU AI Act compliance
  deployment/
    secure-deployer.ts              # Secure model deployment
  lineage/
    data-lineage.ts                 # Data lineage tracking
```

## Governance Frameworks

The server references and evaluates against:

- **NIST AI Risk Management Framework (AI RMF)** — GOVERN, MAP, MEASURE, MANAGE functions
- **EU AI Act** — Articles 9, 10, 13, 15 covering risk management, data governance, transparency, and robustness
- **ISO/IEC 24027** — Bias in AI systems
- **ISO/IEC 22989** — AI concepts and terminology
- **NIST SP 800-53** — Security controls applicable to AI systems
- **FedRAMP** — Authorization requirements for AI in federal environments

## Getting Started

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

### Testing

```bash
npm test
```

## Configuration

Copy `.env.example` to `.env` and configure the following:

| Variable | Description |
|----------|-------------|
| `MLFLOW_TRACKING_URI` | MLflow tracking server URL |
| `SAGEMAKER_ROLE_ARN` | AWS IAM role for SageMaker deployments |
| `VERTEX_AI_PROJECT` | Google Cloud project for Vertex AI |
| `AZURE_ML_WORKSPACE` | Azure ML workspace name |
| `MODEL_REGISTRY_BACKEND` | Registry backend (`local`, `mlflow`, `s3`) |
| `GOVERNANCE_POLICY_PATH` | Path to governance policy definitions |
| `ENCRYPTION_KEY` | Encryption key for model artifact security |
| `DRIFT_CHECK_INTERVAL_HOURS` | Automated drift check interval |

## Deployment Targets

The `secure_model_deployment` tool supports:

- **AWS SageMaker** — Managed ML hosting with VPC isolation
- **Google Vertex AI** — Managed predictions with IAM controls
- **Azure ML** — Managed endpoints with Azure AD integration
- **Kubernetes** — Self-managed inference on K8s clusters
- **Edge** — On-device deployment for low-latency inference

All deployments enforce configurable security controls: encryption at rest/in transit, access control, audit logging, and input validation.

## License

UNLICENSED — Proprietary to BE EASY ENTERPRISES LLC
