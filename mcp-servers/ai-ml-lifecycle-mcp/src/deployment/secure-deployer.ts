/**
 * Secure Model Deployment
 * BE EASY ENTERPRISES LLC
 *
 * Manages model deployment to target platforms with security controls
 * including encryption, access control, audit logging, and input validation.
 */

import crypto from "node:crypto";
import type { DeploymentConfig, DeploymentTarget, SecurityControls } from "../types.js";

/** In-memory deployment store. */
const deployments = new Map<string, DeploymentConfig>();

/**
 * Generate a target-specific endpoint URL.
 */
function generateEndpointUrl(
  target: DeploymentTarget,
  modelId: string,
  version: string,
): string {
  const slug = `${modelId}-${version}`.replace(/[^a-zA-Z0-9-]/g, "-");

  switch (target) {
    case "sagemaker":
      return `https://runtime.sagemaker.us-east-1.amazonaws.com/endpoints/${slug}/invocations`;
    case "vertex_ai":
      return `https://us-central1-aiplatform.googleapis.com/v1/projects/be-easy/locations/us-central1/endpoints/${slug}:predict`;
    case "azure_ml":
      return `https://be-easy-ml.azureml.ms/score/${slug}`;
    case "kubernetes":
      return `https://k8s.internal.be-easy.io/models/${slug}/predict`;
    case "edge":
      return `edge://${slug}/inference`;
  }
}

/**
 * Generate a health check URL for the deployment.
 */
function generateHealthCheckUrl(
  target: DeploymentTarget,
  modelId: string,
  version: string,
): string {
  const slug = `${modelId}-${version}`.replace(/[^a-zA-Z0-9-]/g, "-");

  switch (target) {
    case "sagemaker":
      return `https://runtime.sagemaker.us-east-1.amazonaws.com/endpoints/${slug}/health`;
    case "vertex_ai":
      return `https://us-central1-aiplatform.googleapis.com/v1/projects/be-easy/locations/us-central1/endpoints/${slug}:health`;
    case "azure_ml":
      return `https://be-easy-ml.azureml.ms/health/${slug}`;
    case "kubernetes":
      return `https://k8s.internal.be-easy.io/models/${slug}/health`;
    case "edge":
      return `edge://${slug}/health`;
  }
}

/**
 * Validate that security controls meet minimum requirements for the target.
 */
function validateSecurityControls(
  target: DeploymentTarget,
  controls: SecurityControls,
): string[] {
  const warnings: string[] = [];

  if (!controls.encryption) {
    warnings.push(
      "Encryption is disabled. All production deployments should use encryption at rest and in transit.",
    );
  }

  if (!controls.access_control) {
    warnings.push(
      "Access control is disabled. Model endpoints should require authentication.",
    );
  }

  if (!controls.audit_logging) {
    warnings.push(
      "Audit logging is disabled. Required for compliance with NIST AI RMF and enterprise policy.",
    );
  }

  if (!controls.input_validation) {
    warnings.push(
      "Input validation is disabled. Model is susceptible to adversarial inputs and injection attacks.",
    );
  }

  // Target-specific checks
  if (target === "edge" && !controls.encryption) {
    warnings.push(
      "Edge deployments without encryption pose elevated risk of model extraction.",
    );
  }

  return warnings;
}

/**
 * Deploy a model to the specified target with security controls.
 */
export function deployModel(params: {
  model_id: string;
  version: string;
  target: DeploymentTarget;
  security_controls: SecurityControls;
}): DeploymentConfig & { security_warnings: string[] } {
  const deploymentId = crypto.randomUUID();
  const warnings = validateSecurityControls(params.target, params.security_controls);

  const config: DeploymentConfig = {
    deployment_id: deploymentId,
    model_id: params.model_id,
    version: params.version,
    target: params.target,
    security_controls: params.security_controls,
    endpoint_url: generateEndpointUrl(params.target, params.model_id, params.version),
    status: "active",
    deployed_at: new Date().toISOString(),
    health_check_url: generateHealthCheckUrl(params.target, params.model_id, params.version),
  };

  deployments.set(deploymentId, config);

  return { ...config, security_warnings: warnings };
}

/**
 * Get deployment by ID.
 */
export function getDeployment(deploymentId: string): DeploymentConfig | undefined {
  return deployments.get(deploymentId);
}

/**
 * List all deployments for a model.
 */
export function listDeployments(modelId?: string): DeploymentConfig[] {
  const all = Array.from(deployments.values());
  if (!modelId) return all;
  return all.filter((d) => d.model_id === modelId);
}

/**
 * Clear deployments — useful for testing.
 */
export function clearDeployments(): void {
  deployments.clear();
}
