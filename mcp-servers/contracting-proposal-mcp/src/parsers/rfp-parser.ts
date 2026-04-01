/**
 * RFP Document Parsing & Requirement Extraction
 * BE EASY ENTERPRISES LLC
 *
 * Parses RFP documents from various sources (SAM.gov, eBuy, GSA Advantage,
 * manual text) and extracts structured requirements, evaluation criteria,
 * and key metadata.
 */

import type {
  RFP,
  RFPRequirement,
  RFPSource,
  ParseRFPInput,
} from "../types.js";
import { SAMGovClient } from "./sam-gov-client.js";

// ---------------------------------------------------------------------------
// Keyword heuristics for requirement extraction
// ---------------------------------------------------------------------------

const SECTION_PATTERNS: ReadonlyArray<{ regex: RegExp; category: string }> = [
  { regex: /\b(shall|must|required to|is required)\b/i, category: "mandatory" },
  { regex: /\b(should|may|preferred|desirable)\b/i, category: "preferred" },
  { regex: /\b(experience|past performance|prior work)\b/i, category: "past_performance" },
  { regex: /\b(certif|accredit|clearance|authorization)\b/i, category: "certification" },
  { regex: /\b(price|cost|rate|billing|invoice)\b/i, category: "pricing" },
  { regex: /\b(deliver|milestone|schedule|timeline)\b/i, category: "schedule" },
  { regex: /\b(security|FISMA|FedRAMP|NIST|CMMC)\b/i, category: "security" },
  { regex: /\b(SLA|uptime|availability|response time)\b/i, category: "performance" },
];

function inferPriority(
  text: string,
): "critical" | "important" | "nice_to_have" {
  if (/\b(shall|must|mandatory|required)\b/i.test(text)) return "critical";
  if (/\b(should|important|expected)\b/i.test(text)) return "important";
  return "nice_to_have";
}

function categorize(text: string): string {
  for (const { regex, category } of SECTION_PATTERNS) {
    if (regex.test(text)) return category;
  }
  return "general";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class RFPParser {
  private readonly samClient: SAMGovClient;

  constructor() {
    this.samClient = new SAMGovClient();
  }

  /**
   * Parse an RFP from the given input and return a structured RFP object.
   */
  async parse(input: ParseRFPInput): Promise<RFP> {
    let rawText: string;

    switch (input.source) {
      case "sam_gov":
        rawText = await this.fetchFromSAMGov(input.opportunity_id);
        break;
      case "ebuy":
        rawText = await this.fetchFromUrl(
          input.document_url ?? "",
          "eBuy",
        );
        break;
      case "gsa_advantage":
        rawText = await this.fetchFromUrl(
          input.document_url ?? "",
          "GSA Advantage",
        );
        break;
      case "manual":
        rawText = input.document_text ?? "";
        break;
      default:
        throw new Error(`Unsupported RFP source: ${input.source as string}`);
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error(
        "No document text available. Provide document_text or a valid document_url / opportunity_id.",
      );
    }

    return this.extractRFP(rawText, input.source, input.opportunity_id);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async fetchFromSAMGov(opportunityId?: string): Promise<string> {
    if (!opportunityId) {
      throw new Error("opportunity_id is required for SAM.gov source");
    }
    const opportunity = await this.samClient.getOpportunity(opportunityId);
    return opportunity.description;
  }

  private async fetchFromUrl(url: string, sourceName: string): Promise<string> {
    if (!url) {
      throw new Error(`document_url is required for ${sourceName} source`);
    }
    // In production this would download and OCR/parse the document.
    // For now, return a placeholder indicating the URL was received.
    return `[Document fetched from ${sourceName}: ${url}]`;
  }

  private extractRFP(
    text: string,
    source: RFPSource,
    opportunityId?: string,
  ): RFP {
    const requirements = this.extractRequirements(text);
    const evaluationCriteria = this.extractEvaluationCriteria(text);
    const naics = this.extractNAICS(text);
    const title = this.extractTitle(text);

    return {
      id: `rfp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      source,
      opportunity_id: opportunityId,
      agency: this.extractAgency(text),
      naics_code: naics,
      posted_date: new Date().toISOString(),
      response_deadline: this.extractDeadline(text),
      requirements,
      evaluation_criteria: evaluationCriteria,
      raw_text: text,
    };
  }

  private extractRequirements(text: string): RFPRequirement[] {
    const requirements: RFPRequirement[] = [];
    const sentences = text.split(/[.;\n]+/).filter((s) => s.trim().length > 20);

    let reqIndex = 0;
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (/\b(shall|must|should|required|may)\b/i.test(trimmed)) {
        reqIndex++;
        requirements.push({
          id: `REQ-${String(reqIndex).padStart(3, "0")}`,
          section: this.inferSection(trimmed),
          text: trimmed,
          priority: inferPriority(trimmed),
          category: categorize(trimmed),
        });
      }
    }

    return requirements;
  }

  private extractEvaluationCriteria(text: string): string[] {
    const criteria: string[] = [];
    const evalSection =
      text.match(
        /evaluation\s+(criteria|factors)[:\s]*([\s\S]*?)(?=\n\n|\bsection\b)/i,
      )?.[2] ?? "";

    if (evalSection) {
      const items = evalSection.split(/\n/).filter((l) => l.trim().length > 5);
      for (const item of items) {
        criteria.push(item.trim());
      }
    }

    if (criteria.length === 0) {
      criteria.push(
        "Technical Approach",
        "Management Approach",
        "Past Performance",
        "Price",
      );
    }

    return criteria;
  }

  private extractNAICS(text: string): string {
    const match = text.match(/\bNAICS\s*(?:code)?[:\s]*(\d{6})/i);
    return match?.[1] ?? "541512";
  }

  private extractTitle(text: string): string {
    const firstLine = text.split("\n").find((l) => l.trim().length > 10);
    return firstLine?.trim().slice(0, 200) ?? "Untitled RFP";
  }

  private extractAgency(text: string): string {
    const match = text.match(
      /\b(Department of|Agency|Bureau|Office of)\s+[\w\s]{3,40}/i,
    );
    return match?.[0]?.trim() ?? "Unknown Agency";
  }

  private extractDeadline(text: string): string {
    const match = text.match(
      /(?:due|deadline|respond by|close[sd]?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    );
    if (match?.[1]) {
      return new Date(match[1]).toISOString();
    }
    // Default: 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  }

  private inferSection(text: string): string {
    if (/\b(technical|approach|methodology)\b/i.test(text)) return "Technical";
    if (/\b(management|staffing|personnel)\b/i.test(text)) return "Management";
    if (/\b(past performance|experience)\b/i.test(text))
      return "Past Performance";
    if (/\b(cost|price|rate)\b/i.test(text)) return "Pricing";
    return "General";
  }
}
