/**
 * Cybersecurity Operations MCP — SIEM Integration Client
 * BE EASY ENTERPRISES LLC
 *
 * Abstractions for Splunk and Microsoft Sentinel SIEM APIs.
 */

import type {
  SIEMSource,
  SIEMAlert,
  SIEMQueryResult,
  AlertSeverity,
  TimeRange,
  SIEMConfig,
} from "../types.js";
import { redactSecret } from "../utils/crypto.js";

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

function loadConfig(): SIEMConfig {
  return {
    splunk: process.env.SPLUNK_API_URL
      ? {
          apiUrl: process.env.SPLUNK_API_URL,
          token: process.env.SPLUNK_TOKEN ?? "",
          verifySsl: process.env.SPLUNK_VERIFY_SSL !== "false",
        }
      : undefined,
    sentinel: process.env.SENTINEL_WORKSPACE_ID
      ? {
          workspaceId: process.env.SENTINEL_WORKSPACE_ID,
          apiKey: process.env.SENTINEL_API_KEY ?? "",
          tenantId: process.env.SENTINEL_TENANT_ID ?? "",
          subscriptionId: process.env.SENTINEL_SUBSCRIPTION_ID ?? "",
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// SIEM Client
// ---------------------------------------------------------------------------

export class SIEMClient {
  private config: SIEMConfig;

  constructor(config?: SIEMConfig) {
    this.config = config ?? loadConfig();
  }

  /**
   * Query alerts from the specified SIEM source.
   */
  async queryAlerts(
    source: SIEMSource,
    query: string,
    timeRange: TimeRange,
    severityFilter: AlertSeverity | "all",
  ): Promise<SIEMQueryResult> {
    const startTime = Date.now();

    switch (source) {
      case "splunk":
        return this.querySplunk(query, timeRange, severityFilter, startTime);
      case "sentinel":
        return this.querySentinel(query, timeRange, severityFilter, startTime);
      case "generic":
        return this.queryGeneric(query, timeRange, severityFilter, startTime);
      default:
        throw new Error(`Unsupported SIEM source: ${source as string}`);
    }
  }

  // -------------------------------------------------------------------------
  // Splunk
  // -------------------------------------------------------------------------

  private async querySplunk(
    query: string,
    timeRange: TimeRange,
    severityFilter: AlertSeverity | "all",
    startTime: number,
  ): Promise<SIEMQueryResult> {
    const cfg = this.config.splunk;
    if (!cfg) {
      throw new Error("Splunk is not configured. Set SPLUNK_API_URL and SPLUNK_TOKEN.");
    }

    // In production, this would call the Splunk REST API:
    //   POST /services/search/jobs  with the SPL query
    //   GET  /services/search/jobs/{sid}/results
    // For now we return a structured placeholder that proves connectivity info.
    const maskedToken = redactSecret(cfg.token);

    const alerts = buildSimulatedAlerts("splunk", query, timeRange, severityFilter);

    return {
      alerts,
      total_count: alerts.length,
      query_time_ms: Date.now() - startTime,
      source: "splunk",
      truncated: false,
    };
  }

  // -------------------------------------------------------------------------
  // Microsoft Sentinel
  // -------------------------------------------------------------------------

  private async querySentinel(
    query: string,
    timeRange: TimeRange,
    severityFilter: AlertSeverity | "all",
    startTime: number,
  ): Promise<SIEMQueryResult> {
    const cfg = this.config.sentinel;
    if (!cfg) {
      throw new Error(
        "Microsoft Sentinel is not configured. Set SENTINEL_WORKSPACE_ID and SENTINEL_API_KEY.",
      );
    }

    // Production: POST to Log Analytics query API
    //   https://api.loganalytics.io/v1/workspaces/{workspaceId}/query
    const alerts = buildSimulatedAlerts("sentinel", query, timeRange, severityFilter);

    return {
      alerts,
      total_count: alerts.length,
      query_time_ms: Date.now() - startTime,
      source: "sentinel",
      truncated: false,
    };
  }

  // -------------------------------------------------------------------------
  // Generic / fallback
  // -------------------------------------------------------------------------

  private async queryGeneric(
    query: string,
    timeRange: TimeRange,
    severityFilter: AlertSeverity | "all",
    startTime: number,
  ): Promise<SIEMQueryResult> {
    const alerts = buildSimulatedAlerts("generic", query, timeRange, severityFilter);

    return {
      alerts,
      total_count: alerts.length,
      query_time_ms: Date.now() - startTime,
      source: "generic",
      truncated: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Simulated data (replace with real API calls in production)
// ---------------------------------------------------------------------------

function buildSimulatedAlerts(
  source: SIEMSource,
  query: string,
  timeRange: TimeRange,
  severityFilter: AlertSeverity | "all",
): SIEMAlert[] {
  const base: SIEMAlert = {
    id: `ALERT-${source.toUpperCase()}-${Date.now()}`,
    source,
    title: `Simulated alert matching query: ${query.slice(0, 80)}`,
    description:
      "This is a simulated alert. In production this would be populated by live SIEM data.",
    severity: severityFilter === "all" ? "medium" : severityFilter,
    timestamp: new Date().toISOString(),
    raw_event: { query, time_range: timeRange },
    indicators: [],
    status: "new",
    mitre_tactics: ["Initial Access"],
    mitre_techniques: ["T1190"],
  };

  return [base];
}

export default SIEMClient;
