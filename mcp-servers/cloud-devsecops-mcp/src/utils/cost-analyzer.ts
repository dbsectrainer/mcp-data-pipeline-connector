/**
 * Cost Analysis and Optimization Utilities
 * Aggregates cost data across providers and generates optimization insights.
 * BE EASY ENTERPRISES LLC
 */

import type {
  CloudProvider,
  CostGroupBy,
  TimePeriod,
  CostAnalysisResult,
} from "../types.js";
import { AwsClient } from "../providers/aws-client.js";
import { AzureClient } from "../providers/azure-client.js";
import { GcpClient } from "../providers/gcp-client.js";

export class CostAnalyzer {
  private readonly awsClient: AwsClient;
  private readonly azureClient: AzureClient;
  private readonly gcpClient: GcpClient;

  constructor() {
    this.awsClient = new AwsClient();
    this.azureClient = new AzureClient();
    this.gcpClient = new GcpClient();
  }

  /**
   * Retrieve cost data from the specified cloud provider.
   */
  async analyze(
    provider: CloudProvider,
    timePeriod: TimePeriod,
    groupBy: CostGroupBy,
  ): Promise<CostAnalysisResult> {
    this.validateTimePeriod(timePeriod);

    switch (provider) {
      case "aws":
        return this.awsClient.getCostData(timePeriod, groupBy);
      case "azure":
        return this.azureClient.getCostData(timePeriod, groupBy);
      case "gcp":
        return this.gcpClient.getCostData(timePeriod, groupBy);
      default: {
        const _exhaustive: never = provider;
        throw new Error(`Unsupported provider: ${_exhaustive}`);
      }
    }
  }

  /**
   * Validate that the time period is well-formed and reasonable.
   */
  private validateTimePeriod(timePeriod: TimePeriod): void {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(timePeriod.start)) {
      throw new Error(
        `Invalid start date format: "${timePeriod.start}". Expected YYYY-MM-DD.`,
      );
    }
    if (!datePattern.test(timePeriod.end)) {
      throw new Error(
        `Invalid end date format: "${timePeriod.end}". Expected YYYY-MM-DD.`,
      );
    }

    const start = new Date(timePeriod.start);
    const end = new Date(timePeriod.end);

    if (isNaN(start.getTime())) {
      throw new Error(`Invalid start date: "${timePeriod.start}".`);
    }
    if (isNaN(end.getTime())) {
      throw new Error(`Invalid end date: "${timePeriod.end}".`);
    }
    if (start >= end) {
      throw new Error("Start date must be before end date.");
    }

    // Cap lookback to 1 year
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > oneYear) {
      throw new Error("Time period must not exceed 365 days.");
    }
  }
}
