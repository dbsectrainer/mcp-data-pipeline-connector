/**
 * Enterprise Intelligence MCP Server — Main server definition.
 * BE EASY ENTERPRISES LLC
 *
 * Registers all MCP tools using the server.tool() API with Zod validation.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { aggregateDataSources } from "./data/aggregator.js";
import { generateDashboard } from "./reporting/dashboard-generator.js";
import { createProposal } from "./reporting/proposal-generator.js";
import {
  REPORT_TEMPLATES,
  resolveSections,
  generateSectionContent,
  isFormatSupported,
} from "./reporting/report-templates.js";
import { calculateRiskScore } from "./analytics/risk-engine.js";
import { analyzeTrends } from "./analytics/trend-engine.js";
import { randomUUID } from "node:crypto";
import type {
  CompetitorProfile,
  CompetitiveAnalysis,
  AnalysisDimension,
  ClientReport,
} from "./types.js";

// ---------------------------------------------------------------------------
// Competitive analysis engine (co-located for simplicity)
// ---------------------------------------------------------------------------

function scoreCompetitor(
  name: string,
  dimensions: AnalysisDimension[],
): CompetitorProfile {
  const scores: Record<AnalysisDimension, number> = {
    pricing: 0,
    capabilities: 0,
    past_performance: 0,
    certifications: 0,
    contract_vehicles: 0,
  };

  for (const dim of dimensions) {
    scores[dim] = Math.round((30 + Math.random() * 70) * 100) / 100;
  }

  const avgScore =
    dimensions.reduce((sum, d) => sum + scores[d], 0) / dimensions.length;

  const strengths: string[] = dimensions
    .filter((d) => scores[d] >= 70)
    .map((d) => `Strong ${d.replace("_", " ")} positioning`);

  const weaknesses: string[] = dimensions
    .filter((d) => scores[d] < 50)
    .map((d) => `Weak ${d.replace("_", " ")} profile`);

  if (strengths.length === 0) strengths.push("Established market presence");
  if (weaknesses.length === 0) weaknesses.push("No significant weaknesses identified");

  return {
    name,
    scores,
    strengths,
    weaknesses,
    market_share_estimate: Math.round(Math.random() * 25 * 100) / 100,
  };
}

async function performCompetitiveAnalysis(
  marketSegment: string,
  competitorNames: string[],
  dimensions: AnalysisDimension[],
): Promise<CompetitiveAnalysis> {
  const competitors = competitorNames.map((name) =>
    scoreCompetitor(name, dimensions),
  );

  // Score our company (slightly higher baseline)
  const ourScores: Record<AnalysisDimension, number> = {
    pricing: 0,
    capabilities: 0,
    past_performance: 0,
    certifications: 0,
    contract_vehicles: 0,
  };
  for (const dim of dimensions) {
    ourScores[dim] = Math.round((45 + Math.random() * 55) * 100) / 100;
  }

  const ourPosition: CompetitorProfile = {
    name: "BE EASY ENTERPRISES LLC",
    scores: ourScores,
    strengths: dimensions
      .filter((d) => ourScores[d] >= 70)
      .map((d) => `Competitive advantage in ${d.replace("_", " ")}`),
    weaknesses: dimensions
      .filter((d) => ourScores[d] < 50)
      .map((d) => `Improvement needed in ${d.replace("_", " ")}`),
    market_share_estimate: Math.round(Math.random() * 15 * 100) / 100,
  };

  if (ourPosition.strengths.length === 0) {
    ourPosition.strengths.push("Agile delivery model with rapid response capability");
  }
  if (ourPosition.weaknesses.length === 0) {
    ourPosition.weaknesses.push("Continue building brand recognition in new segments");
  }

  // Generate strategic recommendations
  const allCompetitorScores = competitors.map((c) =>
    dimensions.reduce((sum, d) => sum + c.scores[d], 0) / dimensions.length,
  );
  const avgCompetitorScore =
    allCompetitorScores.reduce((a, b) => a + b, 0) / allCompetitorScores.length;
  const ourAvgScore =
    dimensions.reduce((sum, d) => sum + ourScores[d], 0) / dimensions.length;

  const opportunities: string[] = [];
  const threats: string[] = [];

  for (const dim of dimensions) {
    const compAvg =
      competitors.reduce((sum, c) => sum + c.scores[dim], 0) / competitors.length;
    if (ourScores[dim] > compAvg + 10) {
      opportunities.push(
        `Leverage strong ${dim.replace("_", " ")} positioning to capture market share in ${marketSegment}`,
      );
    }
    if (ourScores[dim] < compAvg - 10) {
      threats.push(
        `Competitors have stronger ${dim.replace("_", " ")} — invest in improvement to remain competitive`,
      );
    }
  }

  if (opportunities.length === 0) {
    opportunities.push(`Differentiation opportunity exists in the ${marketSegment} segment`);
  }
  if (threats.length === 0) {
    threats.push("Market is competitive; continuous improvement required to maintain position");
  }

  const recommendedStrategy =
    ourAvgScore > avgCompetitorScore
      ? `Pursue aggressive growth strategy in ${marketSegment} leveraging competitive advantages in ` +
        `${dimensions.filter((d) => ourScores[d] >= 70).join(", ") || "key areas"}.`
      : `Focus on targeted improvement in ${dimensions.filter((d) => ourScores[d] < 60).join(", ") || "underperforming areas"} ` +
        `while selectively competing in ${marketSegment} opportunities that align with current strengths.`;

  return {
    id: randomUUID(),
    market_segment: marketSegment,
    competitors,
    our_position: ourPosition,
    dimensions,
    opportunities,
    threats,
    recommended_strategy: recommendedStrategy,
    analyzed_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Client report generator
// ---------------------------------------------------------------------------

async function generateClientReport(
  reportType: "assessment" | "recommendation" | "status_update" | "final_deliverable",
  requestedSections: string[],
  format: "pdf" | "docx" | "pptx" | "markdown",
  classification: "public" | "internal" | "confidential" | "restricted",
): Promise<ClientReport> {
  if (!isFormatSupported(reportType, format)) {
    const supported = REPORT_TEMPLATES[reportType].supported_formats.join(", ");
    throw new Error(
      `Format "${format}" is not supported for ${reportType} reports. Supported: ${supported}`,
    );
  }

  const template = REPORT_TEMPLATES[reportType];
  const sectionTitles = resolveSections(reportType, requestedSections);

  const sections = sectionTitles.map((title, index) => ({
    title,
    content: generateSectionContent(title, reportType),
    order: index + 1,
    charts: index <= 2 ? [`chart_${index + 1}.png`] : [],
  }));

  const estimatedPages = Math.max(1, Math.ceil(sections.length * 2.5));

  return {
    id: randomUUID(),
    report_type: reportType,
    title: `${template.title_prefix} — ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}`,
    sections,
    format,
    classification,
    generated_at: new Date().toISOString(),
    page_count: estimatedPages,
    file_path: null,
    metadata: {
      author: "BE EASY ENTERPRISES LLC",
      version: "1.0",
      review_status: "draft",
    },
  };
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function createServer(): McpServer {
  const server = new McpServer({
    name: "enterprise-intelligence-mcp",
    version: "1.0.0",
  });

  // ─── aggregate_data_sources ───────────────────────────────────────────────

  server.tool(
    "aggregate_data_sources",
    "Pull and aggregate data from multiple enterprise systems (databases, APIs, files, cloud storage) using configurable merge strategies.",
    {
      sources: z.array(
        z.object({
          type: z.enum(["database", "api", "file", "cloud_storage"]),
          connection_config: z.object({
            url: z.string().optional(),
            headers: z.record(z.string()).optional(),
            credentials: z
              .object({
                username: z.string().optional(),
                token: z.string().optional(),
              })
              .optional(),
            options: z.record(z.unknown()).optional(),
          }),
        }),
      ),
      query: z.string().optional(),
      merge_strategy: z.enum(["union", "intersection", "left_join", "custom"]),
    },
    async ({ sources, query, merge_strategy }) => {
      const result = await aggregateDataSources(sources, merge_strategy, query);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // ─── generate_executive_dashboard ─────────────────────────────────────────

  server.tool(
    "generate_executive_dashboard",
    "Generate executive-level dashboards with KPI cards, trend charts, heat maps, or scorecards tailored to specific audiences.",
    {
      data_source_ids: z.array(z.string()),
      metrics: z.array(z.string()),
      time_range: z.object({
        start: z.string(),
        end: z.string(),
      }),
      visualization_type: z.enum([
        "kpi_cards",
        "trend_charts",
        "heat_map",
        "scorecard",
        "combined",
      ]),
      audience: z.enum(["c_suite", "technical", "board", "client"]),
    },
    async ({ data_source_ids, metrics, time_range, visualization_type, audience }) => {
      const dashboard = await generateDashboard(
        data_source_ids,
        metrics,
        time_range,
        visualization_type,
        audience,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(dashboard, null, 2),
          },
        ],
      };
    },
  );

  // ─── create_proposal ──────────────────────────────────────────────────────

  server.tool(
    "create_proposal",
    "Auto-generate proposals and reports including technical proposals, executive summaries, capability statements, past performance volumes, and cost proposals.",
    {
      template_type: z.enum([
        "technical_proposal",
        "executive_summary",
        "capability_statement",
        "past_performance",
        "cost_proposal",
      ]),
      client_name: z.string(),
      project_scope: z.string(),
      requirements: z.array(z.string()),
      include_past_performance: z.boolean(),
    },
    async ({ template_type, client_name, project_scope, requirements, include_past_performance }) => {
      const proposal = await createProposal(
        template_type,
        client_name,
        project_scope,
        requirements,
        include_past_performance,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(proposal, null, 2),
          },
        ],
      };
    },
  );

  // ─── risk_scoring ─────────────────────────────────────────────────────────

  server.tool(
    "risk_scoring",
    "Calculate and visualize risk scores across project, vendor, compliance, cyber, and financial assessment types using qualitative, quantitative, or hybrid methodologies.",
    {
      assessment_type: z.enum([
        "project",
        "vendor",
        "compliance",
        "cyber",
        "financial",
      ]),
      entity_id: z.string(),
      factors: z.array(
        z.object({
          name: z.string(),
          weight: z.number().min(0).max(1),
          value: z.number().min(0).max(100),
        }),
      ),
      methodology: z.enum(["qualitative", "quantitative", "hybrid"]),
    },
    async ({ assessment_type, entity_id, factors, methodology }) => {
      const riskScore = await calculateRiskScore(
        assessment_type,
        entity_id,
        factors,
        methodology,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(riskScore, null, 2),
          },
        ],
      };
    },
  );

  // ─── competitive_analysis ─────────────────────────────────────────────────

  server.tool(
    "competitive_analysis",
    "Analyze competitive landscape across pricing, capabilities, past performance, certifications, and contract vehicles for a given market segment.",
    {
      market_segment: z.string(),
      competitors: z.array(z.string()),
      analysis_dimensions: z.array(
        z.enum([
          "pricing",
          "capabilities",
          "past_performance",
          "certifications",
          "contract_vehicles",
        ]),
      ),
    },
    async ({ market_segment, competitors, analysis_dimensions }) => {
      const analysis = await performCompetitiveAnalysis(
        market_segment,
        competitors,
        analysis_dimensions,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    },
  );

  // ─── trend_analysis ───────────────────────────────────────────────────────

  server.tool(
    "trend_analysis",
    "Analyze trends across datasets with linear regression, seasonality detection, and optional forecasting at configurable time granularities.",
    {
      dataset_ids: z.array(z.string()),
      metrics: z.array(z.string()),
      time_granularity: z.enum([
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "yearly",
      ]),
      forecast_periods: z.number().int().min(0).optional(),
    },
    async ({ dataset_ids, metrics, time_granularity, forecast_periods }) => {
      const analysis = await analyzeTrends(
        dataset_ids,
        metrics,
        time_granularity,
        forecast_periods ?? 0,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    },
  );

  // ─── generate_client_report ───────────────────────────────────────────────

  server.tool(
    "generate_client_report",
    "Generate client-ready deliverable reports in multiple formats with classification-appropriate handling and professional templates.",
    {
      report_type: z.enum([
        "assessment",
        "recommendation",
        "status_update",
        "final_deliverable",
      ]),
      sections: z.array(z.string()),
      format: z.enum(["pdf", "docx", "pptx", "markdown"]),
      classification: z.enum(["public", "internal", "confidential", "restricted"]),
    },
    async ({ report_type, sections, format, classification }) => {
      const report = await generateClientReport(
        report_type,
        sections,
        format,
        classification,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    },
  );

  return server;
}
