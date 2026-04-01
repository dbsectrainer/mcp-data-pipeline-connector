/**
 * AI/ML Lifecycle MCP — Type Definitions
 * BE EASY ENTERPRISES LLC
 *
 * Core data structures for model lifecycle management, governance, and deployment.
 */

// ---------------------------------------------------------------------------
// Enums & Literals
// ---------------------------------------------------------------------------

export type Framework = "tensorflow" | "pytorch" | "sklearn" | "xgboost" | "custom";

export type TraceDirection = "upstream" | "downstream" | "full";

export type FairnessMetric =
  | "demographic_parity"
  | "equalized_odds"
  | "calibration"
  | "individual_fairness";

export type DriftType = "data" | "concept" | "prediction";

export type DriftSensitivity = "low" | "medium" | "high";

export type DeploymentTarget =
  | "sagemaker"
  | "vertex_ai"
  | "azure_ml"
  | "kubernetes"
  | "edge";

export type GovernanceCheckType =
  | "bias"
  | "explainability"
  | "security"
  | "privacy"
  | "compliance"
  | "performance";

export type ExperimentStatus = "running" | "completed" | "failed" | "cancelled";

// ---------------------------------------------------------------------------
// Model Version
// ---------------------------------------------------------------------------

export interface ModelVersion {
  model_name: string;
  version: string;
  framework: Framework;
  metrics: Record<string, number>;
  artifacts_path?: string;
  tags?: Record<string, string>;
  registered_at: string;
  lineage_id: string;
  checksum?: string;
}

// ---------------------------------------------------------------------------
// Data Lineage
// ---------------------------------------------------------------------------

export interface LineageNode {
  id: string;
  type: "dataset" | "model" | "transformation" | "feature_store";
  name: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LineageEdge {
  source_id: string;
  target_id: string;
  relationship: "derived_from" | "input_to" | "output_of" | "transformed_by";
  transformation?: string;
}

export interface DataLineage {
  root_id: string;
  direction: TraceDirection;
  nodes: LineageNode[];
  edges: LineageEdge[];
  total_depth: number;
  queried_at: string;
}

// ---------------------------------------------------------------------------
// Bias Report
// ---------------------------------------------------------------------------

export interface BiasMetricResult {
  metric: FairnessMetric;
  value: number;
  threshold: number;
  passed: boolean;
  details: string;
}

export interface AttributeBiasResult {
  attribute: string;
  group_distribution: Record<string, number>;
  metrics: BiasMetricResult[];
  overall_passed: boolean;
}

export interface BiasReport {
  report_id: string;
  model_id: string;
  dataset_id: string;
  protected_attributes: string[];
  results: AttributeBiasResult[];
  overall_bias_detected: boolean;
  recommendations: string[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Drift Report
// ---------------------------------------------------------------------------

export interface FeatureDrift {
  feature_name: string;
  drift_score: number;
  p_value: number;
  is_drifted: boolean;
  test_method: string;
}

export interface DriftReport {
  report_id: string;
  model_id: string;
  reference_dataset_id: string;
  current_dataset_id: string;
  drift_type: DriftType;
  sensitivity: DriftSensitivity;
  overall_drift_detected: boolean;
  drift_score: number;
  feature_drifts: FeatureDrift[];
  recommendations: string[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Deployment Config
// ---------------------------------------------------------------------------

export interface SecurityControls {
  encryption: boolean;
  access_control: boolean;
  audit_logging: boolean;
  input_validation: boolean;
}

export interface DeploymentConfig {
  deployment_id: string;
  model_id: string;
  version: string;
  target: DeploymentTarget;
  security_controls: SecurityControls;
  endpoint_url?: string;
  status: "pending" | "deploying" | "active" | "failed" | "rolled_back";
  deployed_at?: string;
  health_check_url?: string;
}

// ---------------------------------------------------------------------------
// Governance Check
// ---------------------------------------------------------------------------

export interface GovernanceCheckResult {
  check_type: GovernanceCheckType;
  passed: boolean;
  score: number;
  findings: string[];
  recommendations: string[];
  framework_references: string[];
}

export interface GovernanceCheck {
  check_id: string;
  model_id: string;
  checks_requested: GovernanceCheckType[];
  results: GovernanceCheckResult[];
  overall_passed: boolean;
  risk_level: "low" | "medium" | "high" | "critical";
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Experiment
// ---------------------------------------------------------------------------

export interface Experiment {
  experiment_id: string;
  experiment_name: string;
  parameters: Record<string, unknown>;
  metrics: Record<string, number>;
  status: ExperimentStatus;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  artifacts: string[];
  tags?: Record<string, string>;
}
