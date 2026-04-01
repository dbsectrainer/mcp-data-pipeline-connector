/**
 * Contract Vehicle Analysis & Recommendation Engine
 * BE EASY ENTERPRISES LLC
 *
 * Evaluates applicable government contract vehicles based on service
 * type, agency, value, and small-business set-aside requirements.
 */

import type {
  ContractVehicle,
  ContractVehicleAnalysisInput,
  SetAside,
} from "../types.js";

// ---------------------------------------------------------------------------
// Known contract vehicles database (representative sample)
// ---------------------------------------------------------------------------

interface VehicleRecord {
  id: string;
  name: string;
  type: string;
  agency: string;
  description: string;
  eligible_naics: string[];
  ceiling_value: number;
  ordering_period_end: string;
  set_aside_types: SetAside[];
  advantages: string[];
  requirements: string[];
  service_keywords: string[];
  min_value: number;
  max_value: number;
}

const VEHICLE_DATABASE: VehicleRecord[] = [
  {
    id: "GSA-MAS",
    name: "GSA Multiple Award Schedule (MAS)",
    type: "GWAC/Schedule",
    agency: "General Services Administration",
    description:
      "Governmentwide schedule contract for IT, professional services, and more.",
    eligible_naics: ["541512", "541511", "541519", "541611", "541613", "541690"],
    ceiling_value: 0, // no ceiling
    ordering_period_end: "2035-09-30",
    set_aside_types: ["8a", "hubzone", "sdvosb", "wosb", "none"],
    advantages: [
      "Broad agency access across all federal agencies",
      "Pre-negotiated terms and pricing",
      "Streamlined ordering process via GSA eBuy",
      "Access to GSA Advantage online marketplace",
    ],
    requirements: [
      "Two years of corporate experience",
      "Financial stability documentation",
      "Past performance references",
      "Adequate accounting system",
    ],
    service_keywords: ["IT", "consulting", "professional services", "cloud", "cybersecurity", "software"],
    min_value: 0,
    max_value: Infinity,
  },
  {
    id: "CIO-SP3",
    name: "CIO-SP3 Small Business",
    type: "GWAC",
    agency: "National Institutes of Health (NIH/NITAAC)",
    description:
      "Government-wide IT contract for small businesses, covering a full range of IT services.",
    eligible_naics: ["541512", "541511", "541519"],
    ceiling_value: 20_000_000_000,
    ordering_period_end: "2028-05-31",
    set_aside_types: ["8a", "hubzone", "sdvosb", "wosb"],
    advantages: [
      "Focused on small business IT providers",
      "Government-wide ordering authority",
      "10 task areas covering full IT lifecycle",
      "eGOS electronic ordering system",
    ],
    requirements: [
      "Small business size standard for NAICS 541512",
      "Relevant IT past performance",
      "CMMI Level 2 or ISO certification preferred",
      "Security clearance capability",
    ],
    service_keywords: ["IT", "software", "cybersecurity", "cloud", "data", "infrastructure"],
    min_value: 0,
    max_value: 50_000_000,
  },
  {
    id: "ALLIANT-2",
    name: "Alliant 2",
    type: "GWAC",
    agency: "General Services Administration",
    description:
      "GSA's premier large-business GWAC for complex IT solutions.",
    eligible_naics: ["541512", "541511", "541519", "518210"],
    ceiling_value: 50_000_000_000,
    ordering_period_end: "2029-06-30",
    set_aside_types: ["none"],
    advantages: [
      "Suitable for large, complex IT requirements",
      "Government-wide ordering",
      "Best-in-class IT solutions",
      "Supports emerging technologies",
    ],
    requirements: [
      "Large business size standard",
      "Significant IT past performance",
      "ISO and CMMI certifications",
      "Demonstrated large contract management capability",
    ],
    service_keywords: ["IT", "enterprise", "infrastructure", "cloud", "AI", "modernization"],
    min_value: 10_000_000,
    max_value: Infinity,
  },
  {
    id: "OASIS-PLUS",
    name: "OASIS+ (One Acquisition Solution for Integrated Services Plus)",
    type: "GWAC",
    agency: "General Services Administration",
    description:
      "Next-generation best-in-class GWAC for professional services including IT, engineering, and management consulting.",
    eligible_naics: ["541611", "541612", "541613", "541614", "541690", "541512", "541330", "541715"],
    ceiling_value: 0,
    ordering_period_end: "2034-09-30",
    set_aside_types: ["8a", "hubzone", "sdvosb", "wosb", "none"],
    advantages: [
      "Broad professional services scope",
      "Available to all federal agencies",
      "Small business and unrestricted pools",
      "Supports complex, integrated requirements",
    ],
    requirements: [
      "Relevant professional services past performance",
      "Financial capacity documentation",
      "Quality management system",
      "Demonstrated domain expertise",
    ],
    service_keywords: ["consulting", "management", "engineering", "professional services", "IT", "program management"],
    min_value: 0,
    max_value: Infinity,
  },
  {
    id: "SEWP-V",
    name: "SEWP V (Solutions for Enterprise-Wide Procurement)",
    type: "GWAC",
    agency: "NASA",
    description:
      "Government-wide contract for IT products and product-based services.",
    eligible_naics: ["541512", "334111", "334118"],
    ceiling_value: 15_000_000_000,
    ordering_period_end: "2029-04-30",
    set_aside_types: ["8a", "hubzone", "sdvosb", "wosb", "none"],
    advantages: [
      "Fast procurement for IT products",
      "Low fee structure",
      "Government-wide access",
      "Catalog-based ordering",
    ],
    requirements: [
      "IT product-focused offerings",
      "Product reseller or manufacturer status",
      "Past performance in IT product delivery",
    ],
    service_keywords: ["hardware", "software", "products", "IT", "infrastructure", "cloud"],
    min_value: 0,
    max_value: 20_000_000,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class ContractVehicleAnalyzer {
  /**
   * Analyze and rank contract vehicles for the given requirements.
   */
  analyze(input: ContractVehicleAnalysisInput): ContractVehicle[] {
    const scored = VEHICLE_DATABASE.map((vehicle) => ({
      vehicle,
      score: this.scoreVehicle(vehicle, input),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored
      .filter((s) => s.score > 10)
      .map((s) => this.toContractVehicle(s.vehicle, s.score));
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private scoreVehicle(
    vehicle: VehicleRecord,
    input: ContractVehicleAnalysisInput,
  ): number {
    let score = 0;

    // Service keyword match (up to 40 points)
    const serviceTerms = input.service_type
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    let keywordHits = 0;
    for (const term of serviceTerms) {
      if (vehicle.service_keywords.some((kw) => kw.toLowerCase().includes(term))) {
        keywordHits++;
      }
    }
    score += Math.min(40, (keywordHits / Math.max(1, serviceTerms.length)) * 40);

    // Agency match (15 points)
    if (input.agency) {
      const agencyLower = input.agency.toLowerCase();
      if (
        vehicle.agency.toLowerCase().includes(agencyLower) ||
        vehicle.type === "GWAC/Schedule" ||
        vehicle.description.toLowerCase().includes("government-wide")
      ) {
        score += 15;
      }
    } else {
      // No agency preference — government-wide vehicles score well
      if (vehicle.description.toLowerCase().includes("government-wide")) {
        score += 10;
      }
    }

    // Value range (15 points)
    if (
      input.estimated_value >= vehicle.min_value &&
      input.estimated_value <= vehicle.max_value
    ) {
      score += 15;
    }

    // Set-aside match (20 points)
    if (input.small_business_set_aside) {
      if (vehicle.set_aside_types.includes(input.small_business_set_aside)) {
        score += 20;
      } else if (input.small_business_set_aside === "none") {
        score += 10;
      }
    } else {
      score += 10; // neutral
    }

    // Ordering period still open (10 points)
    if (new Date(vehicle.ordering_period_end) > new Date()) {
      score += 10;
    }

    return Math.round(Math.min(100, score));
  }

  private toContractVehicle(
    record: VehicleRecord,
    suitabilityScore: number,
  ): ContractVehicle {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      agency: record.agency,
      description: record.description,
      eligible_naics: record.eligible_naics,
      ceiling_value: record.ceiling_value > 0 ? record.ceiling_value : undefined,
      ordering_period_end: record.ordering_period_end,
      set_aside_types: record.set_aside_types,
      advantages: record.advantages,
      requirements: record.requirements,
      suitability_score: suitabilityScore,
    };
  }
}
