/**
 * Enterprise Intelligence MCP Server — Tests
 * BE EASY ENTERPRISES LLC
 */

import { describe, it, expect } from "vitest";
import { createServer } from "../src/server.js";
import { aggregateDataSources } from "../src/data/aggregator.js";
import { calculateRiskScore } from "../src/analytics/risk-engine.js";
import { analyzeTrends } from "../src/analytics/trend-engine.js";
import { generateDashboard } from "../src/reporting/dashboard-generator.js";
import { createProposal } from "../src/reporting/proposal-generator.js";
import {
  resolveSections,
  generateSectionContent,
  isFormatSupported,
} from "../src/reporting/report-templates.js";
import {
  minMaxNormalize,
  zScoreNormalize,
  dropNulls,
  deduplicateByKey,
} from "../src/data/transformer.js";

// ---------------------------------------------------------------------------
// Server instantiation
// ---------------------------------------------------------------------------

describe("createServer", () => {
  it("should create an McpServer instance without throwing", () => {
    const server = createServer();
    expect(server).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Data aggregation
// ---------------------------------------------------------------------------

describe("aggregateDataSources", () => {
  it("should aggregate sources with union strategy", async () => {
    const result = await aggregateDataSources(
      [
        { type: "database", connection_config: { url: "postgres://localhost/test" } },
        { type: "api", connection_config: { url: "https://api.example.com" } },
      ],
      "union",
    );

    expect(result.id).toBeDefined();
    expect(result.sources).toHaveLength(2);
    expect(result.merge_strategy).toBe("union");
    expect(result.record_count).toBeGreaterThan(0);
    expect(result.columns.length).toBeGreaterThan(0);
    expect(result.sample_data.length).toBeGreaterThan(0);
  });

  it("should aggregate sources with intersection strategy", async () => {
    const result = await aggregateDataSources(
      [
        { type: "file", connection_config: {} },
        { type: "cloud_storage", connection_config: {} },
      ],
      "intersection",
    );

    expect(result.merge_strategy).toBe("intersection");
    expect(result.sources).toHaveLength(2);
  });

  it("should handle single source", async () => {
    const result = await aggregateDataSources(
      [{ type: "database", connection_config: { url: "postgres://localhost/db" } }],
      "left_join",
    );

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].status).toBe("connected");
  });

  it("should pass query through to result", async () => {
    const result = await aggregateDataSources(
      [{ type: "api", connection_config: {} }],
      "union",
      "SELECT * FROM events WHERE date > '2025-01-01'",
    );

    expect(result.query).toBe("SELECT * FROM events WHERE date > '2025-01-01'");
  });
});

// ---------------------------------------------------------------------------
// Risk scoring
// ---------------------------------------------------------------------------

describe("calculateRiskScore", () => {
  it("should compute a weighted risk score", async () => {
    const result = await calculateRiskScore(
      "project",
      "proj-001",
      [
        { name: "Budget overrun risk", weight: 0.4, value: 75 },
        { name: "Schedule delay risk", weight: 0.3, value: 60 },
        { name: "Technical complexity", weight: 0.3, value: 45 },
      ],
      "quantitative",
    );

    expect(result.id).toBeDefined();
    expect(result.entity_id).toBe("proj-001");
    expect(result.assessment_type).toBe("project");
    expect(result.methodology).toBe("quantitative");
    expect(result.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_score).toBeLessThanOrEqual(100);
    expect(result.risk_level).toBeDefined();
    expect(result.factors).toHaveLength(3);
    expect(result.mitigations.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("should classify high scores as critical or high", async () => {
    const result = await calculateRiskScore(
      "cyber",
      "sys-001",
      [
        { name: "Threat exposure", weight: 0.5, value: 95 },
        { name: "Vulnerability count", weight: 0.5, value: 90 },
      ],
      "quantitative",
    );

    expect(["critical", "high"]).toContain(result.risk_level);
  });

  it("should classify low scores as low or minimal", async () => {
    const result = await calculateRiskScore(
      "compliance",
      "audit-001",
      [
        { name: "Policy adherence", weight: 0.5, value: 10 },
        { name: "Gap count", weight: 0.5, value: 5 },
      ],
      "quantitative",
    );

    expect(["low", "minimal"]).toContain(result.risk_level);
  });
});

// ---------------------------------------------------------------------------
// Trend analysis
// ---------------------------------------------------------------------------

describe("analyzeTrends", () => {
  it("should analyze trends for given metrics", async () => {
    const result = await analyzeTrends(
      ["ds-001", "ds-002"],
      ["Revenue", "Customer Count"],
      "monthly",
      4,
    );

    expect(result.id).toBeDefined();
    expect(result.dataset_ids).toEqual(["ds-001", "ds-002"]);
    expect(result.metrics).toHaveLength(2);
    expect(result.time_granularity).toBe("monthly");
    expect(result.forecast_periods).toBe(4);
    expect(result.insights.length).toBeGreaterThan(0);

    for (const metric of result.metrics) {
      expect(metric.data_points.length).toBeGreaterThan(0);
      expect(["increasing", "decreasing", "stable", "volatile"]).toContain(
        metric.trend_direction,
      );
      expect(metric.r_squared).toBeGreaterThanOrEqual(0);
      expect(metric.r_squared).toBeLessThanOrEqual(1);

      // Should have forecast points
      const forecastPoints = metric.data_points.filter((dp) => dp.is_forecast);
      expect(forecastPoints.length).toBe(4);
    }
  });

  it("should work without forecast periods", async () => {
    const result = await analyzeTrends(["ds-001"], ["Throughput"], "weekly");

    expect(result.forecast_periods).toBe(0);
    const forecastPoints = result.metrics[0].data_points.filter(
      (dp) => dp.is_forecast,
    );
    expect(forecastPoints.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dashboard generation
// ---------------------------------------------------------------------------

describe("generateDashboard", () => {
  it("should generate a dashboard with requested metrics", async () => {
    const result = await generateDashboard(
      ["ds-001"],
      ["Revenue", "Costs"],
      { start: "2025-01-01", end: "2025-12-31" },
      "kpi_cards",
      "c_suite",
    );

    expect(result.id).toBeDefined();
    expect(result.audience).toBe("c_suite");
    expect(result.visualization_type).toBe("kpi_cards");
    expect(result.metrics).toHaveLength(2);
    expect(result.metrics[0].name).toBe("Revenue");
    expect(result.refresh_interval_seconds).toBe(3600);
  });

  it("should use default metrics when none provided", async () => {
    const result = await generateDashboard(
      ["ds-001"],
      [],
      { start: "2025-01-01", end: "2025-06-30" },
      "scorecard",
      "technical",
    );

    expect(result.metrics.length).toBeGreaterThan(0);
    expect(result.audience).toBe("technical");
  });
});

// ---------------------------------------------------------------------------
// Proposal generation
// ---------------------------------------------------------------------------

describe("createProposal", () => {
  it("should generate a technical proposal with past performance", async () => {
    const result = await createProposal(
      "technical_proposal",
      "Department of Commerce",
      "Enterprise Data Analytics Platform",
      ["Cloud-native architecture", "Real-time dashboards", "FISMA compliance"],
      true,
    );

    expect(result.id).toBeDefined();
    expect(result.template_type).toBe("technical_proposal");
    expect(result.client_name).toBe("Department of Commerce");
    expect(result.sections.length).toBeGreaterThanOrEqual(3);
    expect(result.past_performance.length).toBeGreaterThan(0);
    expect(result.word_count).toBeGreaterThan(0);
  });

  it("should generate a cost proposal", async () => {
    const result = await createProposal(
      "cost_proposal",
      "NASA",
      "Mission Control Modernization",
      ["System integration", "Training"],
      false,
    );

    expect(result.template_type).toBe("cost_proposal");
    expect(result.past_performance).toHaveLength(0);
    const costSection = result.sections.find((s) => s.title === "Cost Proposal");
    expect(costSection).toBeDefined();
    expect(costSection!.content).toContain("Direct Labor");
  });
});

// ---------------------------------------------------------------------------
// Report templates
// ---------------------------------------------------------------------------

describe("report templates", () => {
  it("should resolve default sections when none requested", () => {
    const sections = resolveSections("assessment", []);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections).toContain("Executive Summary");
  });

  it("should use requested sections when provided", () => {
    const custom = ["Introduction", "Analysis", "Conclusion"];
    const sections = resolveSections("recommendation", custom);
    expect(sections).toEqual(custom);
  });

  it("should generate content for known section titles", () => {
    const content = generateSectionContent("Executive Summary", "assessment");
    expect(content).toContain("high-level overview");
  });

  it("should generate fallback content for unknown section titles", () => {
    const content = generateSectionContent("Custom Section", "assessment");
    expect(content).toContain("Custom Section");
  });

  it("should validate format support correctly", () => {
    expect(isFormatSupported("assessment", "pdf")).toBe(true);
    expect(isFormatSupported("assessment", "pptx")).toBe(false);
    expect(isFormatSupported("status_update", "pptx")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Data transformer utilities
// ---------------------------------------------------------------------------

describe("transformer utilities", () => {
  it("should min-max normalize values to 0-1 range", () => {
    const result = minMaxNormalize([10, 20, 30, 40, 50]);
    expect(result[0]).toBe(0);
    expect(result[4]).toBe(1);
    expect(result[2]).toBeCloseTo(0.5);
  });

  it("should handle single-value normalization", () => {
    const result = minMaxNormalize([42]);
    expect(result).toEqual([0.5]);
  });

  it("should z-score normalize values", () => {
    const result = zScoreNormalize([10, 20, 30, 40, 50]);
    const mean = result.reduce((a, b) => a + b, 0) / result.length;
    expect(mean).toBeCloseTo(0, 5);
  });

  it("should drop rows with null values", () => {
    const rows = [
      { a: 1, b: "x" },
      { a: null, b: "y" },
      { a: 3, b: null },
      { a: 4, b: "z" },
    ];
    const result = dropNulls(rows, ["a", "b"]);
    expect(result).toHaveLength(2);
  });

  it("should deduplicate by key column", () => {
    const rows = [
      { id: 1, name: "first" },
      { id: 2, name: "second" },
      { id: 1, name: "duplicate" },
    ];
    const result = deduplicateByKey(rows, "id");
    expect(result).toHaveLength(2);
    expect(result[0]["name"]).toBe("first");
  });
});
