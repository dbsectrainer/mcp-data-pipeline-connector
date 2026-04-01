/**
 * Trend analysis and forecasting engine.
 *
 * Performs linear regression, seasonality detection, and simple forecasting
 * across time-series datasets. Produces actionable insights for each metric.
 */

import { randomUUID } from "node:crypto";
import type {
  TimeGranularity,
  TrendAnalysis,
  TrendDataPoint,
  TrendMetric,
} from "../types.js";

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

function linearRegression(values: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, rSquared: 0 };

  const xs = values.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  const ssTot = values.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
  const ssRes = values.reduce((sum, y, i) => {
    const predicted = intercept + slope * i;
    return sum + (y - predicted) ** 2;
  }, 0);
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared: Math.max(0, rSquared) };
}

function detectSeasonality(values: number[], granularity: TimeGranularity): boolean {
  // Simple autocorrelation-based seasonality detection
  const period = granularity === "daily" ? 7
    : granularity === "weekly" ? 4
    : granularity === "monthly" ? 12
    : granularity === "quarterly" ? 4
    : 1;

  if (values.length < period * 2) return false;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  let autoCorr = 0;
  let variance = 0;

  for (let i = 0; i < values.length - period; i++) {
    autoCorr += (values[i] - mean) * (values[i + period] - mean);
  }
  for (const v of values) {
    variance += (v - mean) ** 2;
  }

  if (variance === 0) return false;
  const correlation = autoCorr / variance;

  return correlation > 0.3;
}

function classifyTrend(
  slope: number,
  rSquared: number,
  values: number[],
): "increasing" | "decreasing" | "stable" | "volatile" {
  if (rSquared < 0.2) return "volatile";
  const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
  const normalizedSlope = meanVal !== 0 ? Math.abs(slope / meanVal) : Math.abs(slope);

  if (normalizedSlope < 0.01) return "stable";
  return slope > 0 ? "increasing" : "decreasing";
}

function granularityToMs(granularity: TimeGranularity): number {
  switch (granularity) {
    case "daily": return 86_400_000;
    case "weekly": return 604_800_000;
    case "monthly": return 2_592_000_000;
    case "quarterly": return 7_776_000_000;
    case "yearly": return 31_536_000_000;
  }
}

// ---------------------------------------------------------------------------
// Data generation (simulated; production would pull from aggregated datasets)
// ---------------------------------------------------------------------------

function generateTimeSeriesData(
  metricName: string,
  granularity: TimeGranularity,
  periods: number,
): TrendDataPoint[] {
  const now = Date.now();
  const stepMs = granularityToMs(granularity);
  const dataPoints: TrendDataPoint[] = [];

  // Generate historical data with realistic patterns
  const baseValue = 50 + Math.random() * 200;
  const trend = (Math.random() - 0.4) * 2; // slight upward bias
  const noiseScale = baseValue * 0.1;

  for (let i = -periods; i < 0; i++) {
    const timestamp = new Date(now + i * stepMs).toISOString();
    const trendComponent = trend * (i + periods);
    const seasonalComponent = Math.sin((i / 6) * Math.PI) * baseValue * 0.15;
    const noise = (Math.random() - 0.5) * noiseScale;
    const value = Math.max(0, baseValue + trendComponent + seasonalComponent + noise);

    dataPoints.push({
      timestamp,
      value: Math.round(value * 100) / 100,
      is_forecast: false,
    });
  }

  return dataPoints;
}

function forecast(
  dataPoints: TrendDataPoint[],
  periods: number,
  granularity: TimeGranularity,
): TrendDataPoint[] {
  const values = dataPoints.map((dp) => dp.value);
  const { slope, intercept } = linearRegression(values);
  const stepMs = granularityToMs(granularity);
  const lastTimestamp = new Date(dataPoints[dataPoints.length - 1].timestamp).getTime();
  const forecasted: TrendDataPoint[] = [];

  for (let i = 1; i <= periods; i++) {
    const predicted = intercept + slope * (values.length + i - 1);
    forecasted.push({
      timestamp: new Date(lastTimestamp + i * stepMs).toISOString(),
      value: Math.round(Math.max(0, predicted) * 100) / 100,
      is_forecast: true,
    });
  }

  return forecasted;
}

// ---------------------------------------------------------------------------
// Insight generation
// ---------------------------------------------------------------------------

function generateInsights(metrics: TrendMetric[]): string[] {
  const insights: string[] = [];

  for (const metric of metrics) {
    const values = metric.data_points.filter((dp) => !dp.is_forecast).map((dp) => dp.value);
    if (values.length === 0) continue;

    const latest = values[values.length - 1];
    const first = values[0];
    const changePercent = first !== 0 ? ((latest - first) / first) * 100 : 0;

    if (metric.trend_direction === "increasing") {
      insights.push(
        `${metric.name} shows an upward trend (+${changePercent.toFixed(1)}%) ` +
        `with R-squared of ${metric.r_squared.toFixed(2)}, indicating ${metric.r_squared > 0.7 ? "strong" : "moderate"} predictability.`,
      );
    } else if (metric.trend_direction === "decreasing") {
      insights.push(
        `${metric.name} is declining (${changePercent.toFixed(1)}%). ` +
        `Immediate attention recommended if this metric is a KPI.`,
      );
    } else if (metric.trend_direction === "volatile") {
      insights.push(
        `${metric.name} exhibits high volatility (R-squared: ${metric.r_squared.toFixed(2)}). ` +
        `Consider investigating external factors driving variability.`,
      );
    }

    if (metric.seasonality_detected) {
      insights.push(
        `Seasonality detected in ${metric.name}. Factor seasonal patterns into forecasting models.`,
      );
    }
  }

  if (insights.length === 0) {
    insights.push("All metrics are stable with no significant trends detected.");
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze trends across multiple metrics and optionally forecast future periods.
 */
export async function analyzeTrends(
  datasetIds: string[],
  metricNames: string[],
  granularity: TimeGranularity,
  forecastPeriods: number = 0,
): Promise<TrendAnalysis> {
  const historicalPeriods = granularity === "daily" ? 90
    : granularity === "weekly" ? 52
    : granularity === "monthly" ? 24
    : granularity === "quarterly" ? 12
    : 5;

  const metrics: TrendMetric[] = metricNames.map((metricName) => {
    // Generate historical data (in production, query from aggregated datasets)
    const historicalData = generateTimeSeriesData(metricName, granularity, historicalPeriods);

    // Forecast if requested
    const forecastData = forecastPeriods > 0
      ? forecast(historicalData, forecastPeriods, granularity)
      : [];

    const allDataPoints = [...historicalData, ...forecastData];
    const historicalValues = historicalData.map((dp) => dp.value);

    // Compute regression stats
    const { slope, rSquared } = linearRegression(historicalValues);
    const seasonalityDetected = detectSeasonality(historicalValues, granularity);
    const trendDirection = classifyTrend(slope, rSquared, historicalValues);

    return {
      name: metricName,
      data_points: allDataPoints,
      trend_direction: trendDirection,
      slope: Math.round(slope * 10000) / 10000,
      r_squared: Math.round(rSquared * 10000) / 10000,
      seasonality_detected: seasonalityDetected,
    };
  });

  const insights = generateInsights(metrics);

  const allTimestamps = metrics
    .flatMap((m) => m.data_points.filter((dp) => !dp.is_forecast))
    .map((dp) => new Date(dp.timestamp).getTime());

  return {
    id: randomUUID(),
    dataset_ids: datasetIds,
    metrics,
    time_granularity: granularity,
    forecast_periods: forecastPeriods,
    analysis_window: {
      start: allTimestamps.length > 0 ? new Date(Math.min(...allTimestamps)).toISOString() : new Date().toISOString(),
      end: allTimestamps.length > 0 ? new Date(Math.max(...allTimestamps)).toISOString() : new Date().toISOString(),
    },
    insights,
    analyzed_at: new Date().toISOString(),
  };
}
