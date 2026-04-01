/**
 * Executive dashboard generation engine.
 *
 * Produces structured dashboard payloads suitable for rendering KPI cards,
 * trend charts, heat maps, scorecards, or combined views targeting different
 * executive audiences.
 */

import { randomUUID } from "node:crypto";
import type {
  AudienceType,
  Dashboard,
  DashboardMetric,
  VisualizationType,
} from "../types.js";

// ---------------------------------------------------------------------------
// Metric generation (simulated; production would query aggregated datasets)
// ---------------------------------------------------------------------------

const METRIC_CATALOG: Record<AudienceType, string[]> = {
  c_suite: [
    "Revenue Growth Rate",
    "Operating Margin",
    "Customer Acquisition Cost",
    "Net Promoter Score",
    "Employee Retention Rate",
    "Pipeline Value",
  ],
  technical: [
    "System Uptime",
    "Mean Time to Recovery",
    "Deploy Frequency",
    "Code Coverage",
    "Incident Count",
    "API Latency P95",
  ],
  board: [
    "Quarterly Revenue",
    "EBITDA",
    "Market Share",
    "Regulatory Compliance Score",
    "Strategic Initiative Progress",
    "Shareholder Return",
  ],
  client: [
    "Project Completion Rate",
    "SLA Compliance",
    "Deliverable Quality Score",
    "Issue Resolution Time",
    "Budget Utilization",
    "Milestone Adherence",
  ],
};

function generateMetricValue(metricName: string): DashboardMetric {
  const baseValue = 50 + Math.random() * 150;
  const previousValue = baseValue * (0.85 + Math.random() * 0.3);
  const changePercent =
    previousValue !== 0
      ? Math.round(((baseValue - previousValue) / previousValue) * 10000) / 100
      : 0;

  const trend: "up" | "down" | "stable" =
    changePercent > 2 ? "up" : changePercent < -2 ? "down" : "stable";

  const status: "healthy" | "warning" | "critical" =
    changePercent > -5 ? "healthy" : changePercent > -15 ? "warning" : "critical";

  return {
    name: metricName,
    value: Math.round(baseValue * 100) / 100,
    previous_value: Math.round(previousValue * 100) / 100,
    change_percent: changePercent,
    trend,
    status,
  };
}

function selectMetricsForAudience(
  audience: AudienceType,
  requestedMetrics: string[],
): string[] {
  if (requestedMetrics.length > 0) return requestedMetrics;
  return METRIC_CATALOG[audience] ?? METRIC_CATALOG["c_suite"];
}

function generateTitle(
  audience: AudienceType,
  visualizationType: VisualizationType,
): string {
  const audienceLabel: Record<AudienceType, string> = {
    c_suite: "Executive",
    technical: "Technical Operations",
    board: "Board of Directors",
    client: "Client-Facing",
  };

  const vizLabel: Record<VisualizationType, string> = {
    kpi_cards: "KPI Dashboard",
    trend_charts: "Trend Analysis Dashboard",
    heat_map: "Heat Map Dashboard",
    scorecard: "Scorecard",
    combined: "Comprehensive Dashboard",
  };

  return `${audienceLabel[audience]} ${vizLabel[visualizationType]}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an executive dashboard with metrics tailored to the target audience.
 */
export async function generateDashboard(
  dataSourceIds: string[],
  requestedMetrics: string[],
  timeRange: { start: string; end: string },
  visualizationType: VisualizationType,
  audience: AudienceType,
): Promise<Dashboard> {
  const metricNames = selectMetricsForAudience(audience, requestedMetrics);
  const metrics = metricNames.map((name) => generateMetricValue(name));
  const title = generateTitle(audience, visualizationType);

  // Determine refresh interval based on audience expectations
  const refreshInterval: Record<AudienceType, number> = {
    c_suite: 3600,     // hourly
    technical: 300,     // every 5 minutes
    board: 86400,       // daily
    client: 1800,       // every 30 minutes
  };

  return {
    id: randomUUID(),
    title,
    audience,
    visualization_type: visualizationType,
    metrics,
    time_range: timeRange,
    data_source_ids: dataSourceIds,
    generated_at: new Date().toISOString(),
    refresh_interval_seconds: refreshInterval[audience],
  };
}
