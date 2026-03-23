import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import yaml from "js-yaml";
const DEFAULT_CONFIG_PATH = "~/.mcp/data-sources.yaml";
/**
 * Substitute ${ENV_VAR_NAME} placeholders with their environment variable values.
 * Throws a descriptive error if a referenced variable is not set.
 */
export function substituteEnvVars(value) {
  return value.replace(/\$\{([^}]+)\}/g, (_, name) => {
    const val = process.env[name];
    if (val === undefined || val === "") {
      throw new Error(`Environment variable ${name} is not set`);
    }
    return val;
  });
}
/**
 * Recursively walk an object/array and apply env var substitution to all string values.
 */
function substituteDeep(obj) {
  if (typeof obj === "string") {
    return substituteEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(substituteDeep);
  }
  if (obj !== null && typeof obj === "object") {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = substituteDeep(val);
    }
    return result;
  }
  return obj;
}
/**
 * Resolve ~ to the user's home directory in a file path string.
 */
function resolveConfigPath(configPath) {
  if (configPath.startsWith("~")) {
    return resolve(homedir(), configPath.slice(2));
  }
  return resolve(configPath);
}
/**
 * Load data sources from a YAML config file.
 * Performs env var substitution on all string values.
 *
 * @param configPath Path to the YAML file. Defaults to ~/.mcp/data-sources.yaml
 * @returns Parsed and substituted DataSourcesConfig, or null if the file doesn't exist
 */
export function loadConfig(configPath) {
  const effectivePath = resolveConfigPath(configPath ?? DEFAULT_CONFIG_PATH);
  if (!existsSync(effectivePath)) {
    return null;
  }
  let raw;
  try {
    raw = readFileSync(effectivePath, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read config file '${effectivePath}': ${err.message}`);
  }
  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(`Failed to parse YAML config '${effectivePath}': ${err.message}`);
  }
  if (!parsed || typeof parsed !== "object" || !("sources" in parsed)) {
    throw new Error(`Config file '${effectivePath}' must have a top-level 'sources' array`);
  }
  // Apply env var substitution to all string values
  const substituted = substituteDeep(parsed);
  if (!Array.isArray(substituted.sources)) {
    throw new Error(`Config file '${effectivePath}': 'sources' must be an array`);
  }
  // Validate each source has required fields
  for (const source of substituted.sources) {
    if (!source.name || typeof source.name !== "string") {
      throw new Error(`Each source in config must have a 'name' string field`);
    }
    if (!source.type || !["csv", "postgres", "rest"].includes(source.type)) {
      throw new Error(`Source '${source.name}': type must be one of 'csv', 'postgres', 'rest'`);
    }
  }
  return substituted;
}
