import type { DataSourcesConfig } from "./types.js";
/**
 * Substitute ${ENV_VAR_NAME} placeholders with their environment variable values.
 * Throws a descriptive error if a referenced variable is not set.
 */
export declare function substituteEnvVars(value: string): string;
/**
 * Load data sources from a YAML config file.
 * Performs env var substitution on all string values.
 *
 * @param configPath Path to the YAML file. Defaults to ~/.mcp/data-sources.yaml
 * @returns Parsed and substituted DataSourcesConfig, or null if the file doesn't exist
 */
export declare function loadConfig(configPath?: string): DataSourcesConfig | null;
