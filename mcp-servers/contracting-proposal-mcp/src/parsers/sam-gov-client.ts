/**
 * SAM.gov API Integration Client
 * BE EASY ENTERPRISES LLC
 *
 * Provides typed access to the SAM.gov Opportunities API for searching,
 * retrieving, and monitoring federal contracting opportunities.
 */

import type { SAMOpportunity, SAMGovSearchInput } from "../types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface SAMGovConfig {
  apiKey: string;
  baseUrl: string;
}

function loadConfig(): SAMGovConfig {
  return {
    apiKey: process.env["SAM_GOV_API_KEY"] ?? "",
    baseUrl:
      process.env["SAM_GOV_BASE_URL"] ??
      "https://api.sam.gov/opportunities/v2",
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class SAMGovClient {
  private readonly config: SAMGovConfig;

  constructor(config?: Partial<SAMGovConfig>) {
    const defaults = loadConfig();
    this.config = { ...defaults, ...config };
  }

  /**
   * Search SAM.gov for matching opportunities.
   */
  async search(input: SAMGovSearchInput): Promise<SAMOpportunity[]> {
    const params = new URLSearchParams();
    params.set("api_key", this.config.apiKey);

    if (input.keywords.length > 0) {
      params.set("keyword", input.keywords.join(" "));
    }
    if (input.naics_codes && input.naics_codes.length > 0) {
      params.set("naics", input.naics_codes.join(","));
    }
    if (input.set_aside) {
      params.set("typeOfSetAside", input.set_aside);
    }
    if (input.posted_date_range) {
      params.set("postedFrom", input.posted_date_range);
    }

    const url = `${this.config.baseUrl}/search?${params.toString()}`;

    if (!this.config.apiKey) {
      return this.getMockResults(input);
    }

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(
          `SAM.gov API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        opportunitiesData?: Array<Record<string, unknown>>;
      };
      return (data.opportunitiesData ?? []).map((opp) =>
        this.mapOpportunity(opp),
      );
    } catch (error) {
      if (
        error instanceof TypeError &&
        (error.message.includes("fetch") || error.message.includes("network"))
      ) {
        // Network unavailable — fall back to mock data for development
        return this.getMockResults(input);
      }
      throw error;
    }
  }

  /**
   * Retrieve a single opportunity by its ID.
   */
  async getOpportunity(opportunityId: string): Promise<SAMOpportunity> {
    if (!this.config.apiKey) {
      return this.getMockOpportunity(opportunityId);
    }

    const url = `${this.config.baseUrl}/${opportunityId}?api_key=${this.config.apiKey}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `SAM.gov API error fetching ${opportunityId}: ${response.status}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    return this.mapOpportunity(data);
  }

  // -------------------------------------------------------------------------
  // Mapping helpers
  // -------------------------------------------------------------------------

  private mapOpportunity(raw: Record<string, unknown>): SAMOpportunity {
    return {
      opportunity_id: String(raw["noticeId"] ?? raw["id"] ?? ""),
      title: String(raw["title"] ?? ""),
      agency: String(raw["fullParentPathName"] ?? raw["agency"] ?? ""),
      sub_agency: raw["subAgency"] ? String(raw["subAgency"]) : undefined,
      posted_date: String(raw["postedDate"] ?? ""),
      response_deadline: String(raw["responseDeadLine"] ?? raw["archiveDate"] ?? ""),
      naics_code: String(raw["naicsCode"] ?? ""),
      set_aside: raw["typeOfSetAside"] ? String(raw["typeOfSetAside"]) : undefined,
      type: String(raw["type"] ?? raw["noticeType"] ?? ""),
      url: String(
        raw["uiLink"] ??
          `https://sam.gov/opp/${raw["noticeId"] ?? raw["id"] ?? ""}`,
      ),
      description: String(raw["description"] ?? ""),
      place_of_performance: raw["placeOfPerformance"]
        ? String(raw["placeOfPerformance"])
        : undefined,
      point_of_contact: raw["pointOfContact"]
        ? {
            name: String(
              (raw["pointOfContact"] as Record<string, unknown>)["fullName"] ?? "",
            ),
            email:
              String(
                (raw["pointOfContact"] as Record<string, unknown>)["email"] ?? "",
              ) || undefined,
            phone:
              String(
                (raw["pointOfContact"] as Record<string, unknown>)["phone"] ?? "",
              ) || undefined,
          }
        : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Mock data for development / testing without API key
  // -------------------------------------------------------------------------

  private getMockResults(input: SAMGovSearchInput): SAMOpportunity[] {
    const keyword = input.keywords[0] ?? "IT Services";
    const naics = input.naics_codes?.[0] ?? "541512";
    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + 30);

    return [
      {
        opportunity_id: "MOCK-OPP-001",
        title: `${keyword} — Enterprise Support Services`,
        agency: "Department of Defense",
        sub_agency: "Defense Information Systems Agency",
        posted_date: now.toISOString().split("T")[0]!,
        response_deadline: deadline.toISOString().split("T")[0]!,
        naics_code: naics,
        set_aside: input.set_aside ?? "none",
        type: "Solicitation",
        url: "https://sam.gov/opp/MOCK-OPP-001/view",
        description: `The Government requires ${keyword} support services under NAICS ${naics}. The contractor shall provide qualified personnel, tools, and management oversight.`,
        place_of_performance: "Washington, DC",
        point_of_contact: {
          name: "Jane Doe, Contracting Officer",
          email: "jane.doe@agency.gov",
        },
      },
      {
        opportunity_id: "MOCK-OPP-002",
        title: `${keyword} — Modernization Initiative`,
        agency: "General Services Administration",
        posted_date: now.toISOString().split("T")[0]!,
        response_deadline: deadline.toISOString().split("T")[0]!,
        naics_code: naics,
        type: "Combined Synopsis/Solicitation",
        url: "https://sam.gov/opp/MOCK-OPP-002/view",
        description: `GSA seeks ${keyword} capabilities to modernize legacy systems. Offerors must demonstrate relevant past performance.`,
        place_of_performance: "Remote / Various CONUS locations",
      },
    ];
  }

  private getMockOpportunity(id: string): SAMOpportunity {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    return {
      opportunity_id: id,
      title: `Opportunity ${id} — IT Professional Services`,
      agency: "Department of Defense",
      posted_date: new Date().toISOString().split("T")[0]!,
      response_deadline: deadline.toISOString().split("T")[0]!,
      naics_code: "541512",
      type: "Solicitation",
      url: `https://sam.gov/opp/${id}/view`,
      description:
        "The contractor shall provide IT professional services including software development, cloud engineering, and cybersecurity support. The contractor must maintain personnel with active security clearances. The contractor should demonstrate experience with Agile methodologies.",
    };
  }
}
