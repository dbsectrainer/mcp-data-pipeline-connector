/**
 * Enterprise Intelligence MCP — Core type definitions.
 *
 * All domain types used across the data aggregation, analytics, and reporting
 * subsystems of the Enterprise Intelligence platform.
 */

// ---------------------------------------------------------------------------
// Data Sources
// ---------------------------------------------------------------------------

export type DataSourceType = "database" | "api" | "file" | "cloud_storage";

export type MergeStrategy = "union" | "intersection" | "left_join" | "custom";

export interface ConnectionConfig {
  url?: string;
  headers?: Record<string, string>;
  credentials?: {
    username?: string;
    token?: string;
  };
  options?: Record<string, unknown>;
}

export interface DataSourceInput {
  type: DataSourceType;
  connection_config: ConnectionConfig;
}

export interface DataSource {
  id: string;
  type: DataSourceType;
  connection_config: ConnectionConfig;
  status: "connected" | "disconnected" | "error";
  last_synced: string | null;
  record_count: number;
  schema: Record<string, string>;
}

export interface AggregatedDataset {
  id: string;
  sources: DataSource[];
  merge_strategy: MergeStrategy;
  record_count: number;
  columns: string[];
  sample_data: Record<string, unknown>[];
  created_at: string;
  query?: string;
}

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export type VisualizationType =
  | "kpi_cards"
  | "trend_charts"
  | "heat_map"
  | "scorecard"
  | "combined";

export type AudienceType = "c_suite" | "technical" | "board" | "client";

export interface DashboardMetric {
  name: string;
  value: number;
  previous_value: number | null;
  change_percent: number | null;
  trend: "up" | "down" | "stable";
  status: "healthy" | "warning" | "critical";
}

export interface Dashboard {
  id: string;
  title: string;
  audience: AudienceType;
  visualization_type: VisualizationType;
  metrics: DashboardMetric[];
  time_range: {
    start: string;
    end: string;
  };
  data_source_ids: string[];
  generated_at: string;
  refresh_interval_seconds: number;
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export type TemplateType =
  | "technical_proposal"
  | "executive_summary"
  | "capability_statement"
  | "past_performance"
  | "cost_proposal";

export interface PastPerformanceEntry {
  project_name: string;
  client: string;
  contract_value: number;
  period: string;
  relevance_score: number;
  description: string;
}

export interface Proposal {
  id: string;
  template_type: TemplateType;
  client_name: string;
  project_scope: string;
  requirements: string[];
  sections: ProposalSection[];
  past_performance: PastPerformanceEntry[];
  generated_at: string;
  word_count: number;
  estimated_value: number | null;
}

export interface ProposalSection {
  title: string;
  content: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Risk Scoring
// ---------------------------------------------------------------------------

export type AssessmentType =
  | "project"
  | "vendor"
  | "compliance"
  | "cyber"
  | "financial";

export type RiskMethodology = "qualitative" | "quantitative" | "hybrid";

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  normalized_score: number;
  category: string;
}

export interface RiskMitigation {
  factor: string;
  strategy: string;
  priority: "high" | "medium" | "low";
  estimated_reduction: number;
}

export interface RiskScore {
  id: string;
  entity_id: string;
  assessment_type: AssessmentType;
  methodology: RiskMethodology;
  overall_score: number;
  risk_level: "critical" | "high" | "medium" | "low" | "minimal";
  factors: RiskFactor[];
  mitigations: RiskMitigation[];
  confidence: number;
  assessed_at: string;
}

// ---------------------------------------------------------------------------
// Competitive Analysis
// ---------------------------------------------------------------------------

export type AnalysisDimension =
  | "pricing"
  | "capabilities"
  | "past_performance"
  | "certifications"
  | "contract_vehicles";

export interface CompetitorProfile {
  name: string;
  scores: Record<AnalysisDimension, number>;
  strengths: string[];
  weaknesses: string[];
  market_share_estimate: number;
}

export interface CompetitiveAnalysis {
  id: string;
  market_segment: string;
  competitors: CompetitorProfile[];
  our_position: CompetitorProfile;
  dimensions: AnalysisDimension[];
  opportunities: string[];
  threats: string[];
  recommended_strategy: string;
  analyzed_at: string;
}

// ---------------------------------------------------------------------------
// Trend Analysis
// ---------------------------------------------------------------------------

export type TimeGranularity =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface TrendDataPoint {
  timestamp: string;
  value: number;
  is_forecast: boolean;
}

export interface TrendMetric {
  name: string;
  data_points: TrendDataPoint[];
  trend_direction: "increasing" | "decreasing" | "stable" | "volatile";
  slope: number;
  r_squared: number;
  seasonality_detected: boolean;
}

export interface TrendAnalysis {
  id: string;
  dataset_ids: string[];
  metrics: TrendMetric[];
  time_granularity: TimeGranularity;
  forecast_periods: number;
  analysis_window: {
    start: string;
    end: string;
  };
  insights: string[];
  analyzed_at: string;
}

// ---------------------------------------------------------------------------
// Client Reports
// ---------------------------------------------------------------------------

export type ReportType =
  | "assessment"
  | "recommendation"
  | "status_update"
  | "final_deliverable";

export type ReportFormat = "pdf" | "docx" | "pptx" | "markdown";

export type ClassificationLevel =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export interface ReportSection {
  title: string;
  content: string;
  order: number;
  charts: string[];
}

export interface ClientReport {
  id: string;
  report_type: ReportType;
  title: string;
  sections: ReportSection[];
  format: ReportFormat;
  classification: ClassificationLevel;
  generated_at: string;
  page_count: number;
  file_path: string | null;
  metadata: {
    author: string;
    version: string;
    review_status: "draft" | "review" | "approved" | "final";
  };
}
