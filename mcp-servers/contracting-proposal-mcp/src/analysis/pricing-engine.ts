/**
 * Pricing Analysis & Strategy Engine
 * BE EASY ENTERPRISES LLC
 *
 * Calculates fully-burdened rates, total pricing, and competitive
 * positioning for government contract proposals.
 */

import type {
  PricingModel,
  PricingAnalysisInput,
  LaborCategory,
  IndirectRates,
  ContractType,
} from "../types.js";

// ---------------------------------------------------------------------------
// Defaults (from env or hard-coded fallback)
// ---------------------------------------------------------------------------

function defaultRate(envVar: string, fallback: number): number {
  const val = process.env[envVar];
  return val ? parseFloat(val) : fallback;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class PricingEngine {
  /**
   * Run a full pricing analysis and return a structured pricing model.
   */
  analyze(input: PricingAnalysisInput): PricingModel {
    const rates = this.resolveIndirectRates(input.indirect_rates);

    const totalDirectLabor = this.calcDirectLabor(input.labor_categories);
    const fringeCost = totalDirectLabor * (rates.fringe ?? 0);
    const overheadCost = totalDirectLabor * (rates.overhead ?? 0);
    const subTotalBeforeGA = totalDirectLabor + fringeCost + overheadCost;
    const gaCost = subTotalBeforeGA * (rates.ga ?? 0);
    const totalIndirectCosts = fringeCost + overheadCost + gaCost;
    const totalCost = totalDirectLabor + totalIndirectCosts;
    const profit = totalCost * input.profit_margin;
    const totalPrice = totalCost + profit;

    const totalHours = input.labor_categories.reduce(
      (sum, lc) => sum + lc.hours,
      0,
    );
    const blendedRate = totalHours > 0 ? totalPrice / totalHours : 0;

    const recommendations = this.generateRecommendations(
      input,
      totalPrice,
      blendedRate,
    );
    const assessment = this.assessCompetitiveness(
      input.contract_type,
      blendedRate,
      input.profit_margin,
    );

    return {
      contract_type: input.contract_type,
      labor_categories: input.labor_categories,
      indirect_rates: rates,
      profit_margin: input.profit_margin,
      total_direct_labor: round(totalDirectLabor),
      total_indirect_costs: round(totalIndirectCosts),
      total_price: round(totalPrice),
      price_per_hour_blended: round(blendedRate),
      competitive_assessment: assessment,
      recommendations,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private resolveIndirectRates(provided: IndirectRates): IndirectRates {
    return {
      overhead:
        provided.overhead ?? defaultRate("DEFAULT_OVERHEAD_RATE", 0.45),
      ga: provided.ga ?? defaultRate("DEFAULT_GA_RATE", 0.12),
      fringe:
        provided.fringe ?? defaultRate("DEFAULT_FRINGE_RATE", 0.35),
      material_handling: provided.material_handling ?? 0,
    };
  }

  private calcDirectLabor(categories: LaborCategory[]): number {
    return categories.reduce((sum, lc) => sum + lc.rate * lc.hours, 0);
  }

  private assessCompetitiveness(
    contractType: ContractType,
    blendedRate: number,
    profitMargin: number,
  ): string {
    // Simplified heuristic benchmarks per contract type
    const benchmarks: Record<ContractType, { low: number; high: number }> = {
      firm_fixed_price: { low: 85, high: 175 },
      time_and_materials: { low: 90, high: 200 },
      cost_plus: { low: 80, high: 160 },
      idiq: { low: 85, high: 185 },
      bpa: { low: 80, high: 170 },
    };

    const bench = benchmarks[contractType];

    if (blendedRate < bench.low) {
      return "Below market range — may raise cost realism concerns. Consider adjusting rates upward.";
    }
    if (blendedRate > bench.high) {
      return "Above typical market range — ensure strong technical differentiators to justify pricing.";
    }
    if (profitMargin > 0.15) {
      return "Competitive blended rate but high profit margin; government may negotiate margin down.";
    }
    return "Pricing is within the competitive range for this contract type.";
  }

  private generateRecommendations(
    input: PricingAnalysisInput,
    totalPrice: number,
    blendedRate: number,
  ): string[] {
    const recs: string[] = [];

    if (input.profit_margin > 0.12) {
      recs.push(
        `Current profit margin (${(input.profit_margin * 100).toFixed(1)}%) is above the ` +
          `typical 8-12% range for government contracts. Consider reducing to improve competitiveness.`,
      );
    }

    if (input.profit_margin < 0.05) {
      recs.push(
        `Profit margin (${(input.profit_margin * 100).toFixed(1)}%) is very low — ensure ` +
          `this is sustainable over the period of performance.`,
      );
    }

    const overhead = input.indirect_rates.overhead ?? 0;
    if (overhead > 0.6) {
      recs.push(
        "Overhead rate exceeds 60%. Review overhead pool for potential cost reduction opportunities.",
      );
    }

    if (input.contract_type === "firm_fixed_price") {
      recs.push(
        "For FFP: build in appropriate management reserve (5-10%) to account for scope uncertainty.",
      );
    }

    if (input.contract_type === "cost_plus") {
      recs.push(
        "Ensure indirect rate proposals are supported by an adequate accounting system per DCAA requirements.",
      );
    }

    if (input.labor_categories.length > 10) {
      recs.push(
        "Consider consolidating labor categories to simplify the cost volume and reduce administrative burden.",
      );
    }

    if (recs.length === 0) {
      recs.push(
        "Pricing structure appears well-balanced. Validate against independent government cost estimate (IGCE) if available.",
      );
    }

    return recs;
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
