/**
 * AI/ML Lifecycle MCP Server — Tool Definitions
 * BE EASY ENTERPRISES LLC
 *
 * Registers all MCP tools for AI/ML lifecycle management including
 * model tracking, governance, bias detection, drift monitoring,
 * secure deployment, and experiment tracking.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { registerModelVersion } from "./tracking/model-registry.js";
import { trackExperiment } from "./tracking/experiment-tracker.js";
import { runBiasDetection } from "./governance/bias-detector.js";
import { detectDrift } from "./governance/drift-monitor.js";
import { runGovernanceChecks } from "./governance/compliance-checker.js";
import { deployModel } from "./deployment/secure-deployer.js";
import { queryDataLineage } from "./lineage/data-lineage.js";

/**
 * Create and configure the AI/ML Lifecycle MCP server with all tools.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "ai-ml-lifecycle-mcp",
    version: "1.0.0",
  });

  // -------------------------------------------------------------------------
  // track_model_version
  // -------------------------------------------------------------------------
  server.tool(
    "track_model_version",
    "Track model versions and lineage. Registers a new model version with framework metadata, performance metrics, and optional artifact references for full lifecycle traceability.",
    {
      model_name: z.string().min(1).describe("Name of the model to register"),
      version: z.string().min(1).describe("Semantic version string (e.g. 1.0.0)"),
      framework: z
        .enum(["tensorflow", "pytorch", "sklearn", "xgboost", "custom"])
        .describe("ML framework used to train the model"),
      metrics: z
        .record(z.string(), z.number())
        .describe("Key performance metrics (e.g. { accuracy: 0.95, f1: 0.92 })"),
      artifacts_path: z
        .string()
        .optional()
        .describe("Path or URI to model artifacts (S3, GCS, local)"),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe("Arbitrary key-value tags for organization"),
    },
    async (params) => {
      try {
        const result = registerModelVersion({
          model_name: params.model_name,
          version: params.version,
          framework: params.framework,
          metrics: params.metrics,
          artifacts_path: params.artifacts_path,
          tags: params.tags,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error tracking model version: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // data_lineage_query
  // -------------------------------------------------------------------------
  server.tool(
    "data_lineage_query",
    "Query data lineage and governance. Traces the flow of data through the ML pipeline including dataset origins, transformations, feature engineering, and model inputs/outputs.",
    {
      dataset_id: z
        .string()
        .optional()
        .describe("Dataset identifier to trace lineage for"),
      model_id: z
        .string()
        .optional()
        .describe("Model identifier to trace lineage for"),
      trace_direction: z
        .enum(["upstream", "downstream", "full"])
        .describe("Direction to trace lineage: upstream (sources), downstream (consumers), or full"),
      include_transformations: z
        .boolean()
        .describe("Whether to include transformation steps in the lineage graph"),
    },
    async (params) => {
      try {
        const result = queryDataLineage({
          dataset_id: params.dataset_id,
          model_id: params.model_id,
          trace_direction: params.trace_direction,
          include_transformations: params.include_transformations,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error querying data lineage: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // bias_detection
  // -------------------------------------------------------------------------
  server.tool(
    "bias_detection",
    "Run bias detection on model/data. Evaluates a model against protected attributes using configurable fairness metrics and thresholds, producing an actionable bias report.",
    {
      model_id: z.string().min(1).describe("Model identifier to evaluate"),
      dataset_id: z.string().min(1).describe("Dataset identifier used for evaluation"),
      protected_attributes: z
        .array(z.string().min(1))
        .min(1)
        .describe("Protected attributes to check (e.g. ['race', 'gender', 'age'])"),
      fairness_metrics: z
        .array(
          z.enum([
            "demographic_parity",
            "equalized_odds",
            "calibration",
            "individual_fairness",
          ]),
        )
        .min(1)
        .describe("Fairness metrics to evaluate"),
      threshold: z
        .number()
        .min(0)
        .max(1)
        .describe("Maximum acceptable bias score (0-1). Lower is stricter."),
    },
    async (params) => {
      try {
        const result = runBiasDetection({
          model_id: params.model_id,
          dataset_id: params.dataset_id,
          protected_attributes: params.protected_attributes,
          fairness_metrics: params.fairness_metrics,
          threshold: params.threshold,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error running bias detection: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // drift_detection
  // -------------------------------------------------------------------------
  server.tool(
    "drift_detection",
    "Detect model/data drift. Compares a reference dataset against current data to identify statistical drift that may degrade model performance, using configurable sensitivity.",
    {
      model_id: z.string().min(1).describe("Model identifier to monitor"),
      reference_dataset_id: z
        .string()
        .min(1)
        .describe("Reference (baseline) dataset identifier"),
      current_dataset_id: z
        .string()
        .min(1)
        .describe("Current (production) dataset identifier"),
      drift_type: z
        .enum(["data", "concept", "prediction"])
        .describe("Type of drift to detect"),
      sensitivity: z
        .enum(["low", "medium", "high"])
        .describe("Detection sensitivity — higher sensitivity catches smaller shifts"),
    },
    async (params) => {
      try {
        const result = detectDrift({
          model_id: params.model_id,
          reference_dataset_id: params.reference_dataset_id,
          current_dataset_id: params.current_dataset_id,
          drift_type: params.drift_type,
          sensitivity: params.sensitivity,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error detecting drift: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // secure_model_deployment
  // -------------------------------------------------------------------------
  server.tool(
    "secure_model_deployment",
    "Deploy model with security controls. Provisions a model to a target platform with configurable encryption, access control, audit logging, and input validation.",
    {
      model_id: z.string().min(1).describe("Model identifier to deploy"),
      version: z.string().min(1).describe("Model version to deploy"),
      target: z
        .enum(["sagemaker", "vertex_ai", "azure_ml", "kubernetes", "edge"])
        .describe("Deployment target platform"),
      security_controls: z
        .object({
          encryption: z.boolean().describe("Enable encryption at rest and in transit"),
          access_control: z.boolean().describe("Enable authentication and authorization"),
          audit_logging: z.boolean().describe("Enable audit logging for all inference requests"),
          input_validation: z.boolean().describe("Enable input schema validation and sanitization"),
        })
        .describe("Security controls to apply to the deployment"),
    },
    async (params) => {
      try {
        const result = deployModel({
          model_id: params.model_id,
          version: params.version,
          target: params.target,
          security_controls: params.security_controls,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deploying model: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // model_governance_check
  // -------------------------------------------------------------------------
  server.tool(
    "model_governance_check",
    "Run governance checks on model. Evaluates a model against selected governance dimensions including bias, explainability, security, privacy, compliance, and performance per NIST AI RMF and EU AI Act.",
    {
      model_id: z.string().min(1).describe("Model identifier to evaluate"),
      checks: z
        .array(
          z.enum([
            "bias",
            "explainability",
            "security",
            "privacy",
            "compliance",
            "performance",
          ]),
        )
        .min(1)
        .describe("Governance check types to run"),
    },
    async (params) => {
      try {
        const result = runGovernanceChecks({
          model_id: params.model_id,
          checks: params.checks,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error running governance checks: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // experiment_tracking
  // -------------------------------------------------------------------------
  server.tool(
    "experiment_tracking",
    "Track ML experiments. Records experiment parameters, metrics, and status for reproducibility and comparison across training runs.",
    {
      experiment_name: z
        .string()
        .min(1)
        .describe("Human-readable experiment name"),
      parameters: z
        .record(z.string(), z.unknown())
        .describe("Hyperparameters and configuration (e.g. { learning_rate: 0.001, epochs: 50 })"),
      metrics: z
        .record(z.string(), z.number())
        .describe("Experiment result metrics (e.g. { accuracy: 0.95, loss: 0.12 })"),
      status: z
        .enum(["running", "completed", "failed", "cancelled"])
        .describe("Current status of the experiment run"),
    },
    async (params) => {
      try {
        const result = trackExperiment({
          experiment_name: params.experiment_name,
          parameters: params.parameters,
          metrics: params.metrics,
          status: params.status,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error tracking experiment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
