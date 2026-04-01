/**
 * Proposal Draft Generation Engine
 * BE EASY ENTERPRISES LLC
 *
 * Generates structured proposal drafts based on RFP requirements,
 * company capabilities, and the requested proposal volume type.
 */

import type {
  Proposal,
  ProposalSection,
  ProposalType,
  GenerateProposalInput,
} from "../types.js";
import { ComplianceMatrixGenerator } from "./compliance-matrix.js";

// ---------------------------------------------------------------------------
// Section templates by proposal type
// ---------------------------------------------------------------------------

interface SectionTemplate {
  title: string;
  instructions: string;
}

const SECTION_TEMPLATES: Record<ProposalType, SectionTemplate[]> = {
  technical_volume: [
    {
      title: "Technical Understanding",
      instructions:
        "Demonstrate clear understanding of the government's requirements, objectives, and challenges.",
    },
    {
      title: "Technical Approach",
      instructions:
        "Detail the proposed technical methodology, tools, frameworks, and processes.",
    },
    {
      title: "Innovation & Value-Added Solutions",
      instructions:
        "Highlight innovative approaches, efficiencies, and value the offeror brings beyond minimum requirements.",
    },
    {
      title: "Quality Assurance",
      instructions:
        "Describe the quality management plan, metrics, and continuous improvement processes.",
    },
    {
      title: "Risk Mitigation",
      instructions:
        "Identify potential risks and present concrete mitigation strategies.",
    },
  ],
  management_volume: [
    {
      title: "Management Approach",
      instructions:
        "Describe the overall management philosophy, organizational structure, and governance model.",
    },
    {
      title: "Organizational Structure",
      instructions:
        "Present the org chart, reporting lines, and roles/responsibilities of key personnel.",
    },
    {
      title: "Key Personnel",
      instructions:
        "Provide qualifications and relevant experience of proposed key personnel.",
    },
    {
      title: "Staffing Plan",
      instructions:
        "Detail recruiting, retention, and knowledge transfer strategies.",
    },
    {
      title: "Transition Plan",
      instructions:
        "Outline the approach for transitioning services from the incumbent or standing up new operations.",
    },
  ],
  past_performance: [
    {
      title: "Past Performance Overview",
      instructions:
        "Summarize the offeror's relevant contract history and overall performance record.",
    },
    {
      title: "Relevant Contract References",
      instructions:
        "Provide detailed descriptions of 3-5 contracts similar in scope, size, and complexity.",
    },
    {
      title: "Performance Metrics & Outcomes",
      instructions:
        "Highlight quantifiable results, on-time delivery rates, customer satisfaction scores.",
    },
    {
      title: "Lessons Learned",
      instructions:
        "Demonstrate continuous improvement with specific examples of corrective actions taken.",
    },
  ],
  cost_volume: [
    {
      title: "Cost Methodology",
      instructions:
        "Explain the basis of the cost estimate, assumptions, and pricing methodology.",
    },
    {
      title: "Labor Rate Justification",
      instructions:
        "Justify proposed labor rates relative to market surveys and government benchmarks.",
    },
    {
      title: "Cost Breakdown Structure",
      instructions:
        "Provide detailed breakdown of direct labor, indirect costs, ODCs, and profit.",
    },
    {
      title: "Cost Realism",
      instructions:
        "Demonstrate that proposed costs are realistic and achievable for the stated scope.",
    },
  ],
  executive_summary: [
    {
      title: "Executive Summary",
      instructions:
        "Provide a compelling, high-level overview of the offeror's solution and differentiators.",
    },
    {
      title: "Company Overview",
      instructions:
        "Briefly introduce the company, its mission, and relevance to this opportunity.",
    },
    {
      title: "Solution Highlights",
      instructions:
        "Summarize the top 3-5 features of the proposed solution that directly address evaluation criteria.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class ProposalWriter {
  private readonly companyName: string;

  constructor() {
    this.companyName =
      process.env["COMPANY_NAME"] ?? "BE EASY ENTERPRISES LLC";
  }

  /**
   * Generate a proposal draft for the given input parameters.
   */
  async generate(input: GenerateProposalInput): Promise<Proposal> {
    const templates = SECTION_TEMPLATES[input.proposal_type];
    const pageLimit = input.page_limit ?? 50;
    const pagesPerSection = Math.max(
      1,
      Math.floor(pageLimit / templates.length),
    );

    const sections: ProposalSection[] = templates.map((tpl, index) => {
      const content = this.renderSection(
        tpl,
        input.company_capabilities,
        input.proposal_type,
        pagesPerSection,
      );

      return {
        title: tpl.title,
        content,
        page_count: pagesPerSection,
        requirements_addressed: this.assignRequirements(
          index,
          templates.length,
        ),
      };
    });

    let complianceMatrixContent: string | undefined;
    if (input.compliance_matrix) {
      const generator = new ComplianceMatrixGenerator();
      const matrix = generator.generateFromProposal(sections);
      complianceMatrixContent = matrix;
      sections.push({
        title: "Compliance Matrix",
        content: matrix,
        page_count: 2,
        requirements_addressed: [],
      });
    }

    const totalPages = sections.reduce((sum, s) => sum + s.page_count, 0);

    return {
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      rfp_id: input.rfp_id,
      proposal_type: input.proposal_type,
      title: `${this.companyName} — ${this.formatProposalType(input.proposal_type)}`,
      sections,
      total_pages: totalPages,
      compliance_score: this.estimateComplianceScore(
        sections,
        input.company_capabilities,
      ),
      generated_at: new Date().toISOString(),
      company_name: this.companyName,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private renderSection(
    template: SectionTemplate,
    capabilities: string[],
    proposalType: ProposalType,
    pageTarget: number,
  ): string {
    const lines: string[] = [];

    lines.push(`## ${template.title}`);
    lines.push("");
    lines.push(`[${template.instructions}]`);
    lines.push("");

    // Draft boilerplate contextual to the section
    lines.push(
      `${this.companyName} is pleased to present our ${this.formatProposalType(proposalType).toLowerCase()} ` +
        `addressing the requirements outlined in this solicitation.`,
    );
    lines.push("");

    if (capabilities.length > 0) {
      lines.push("### Relevant Capabilities");
      lines.push("");
      for (const cap of capabilities) {
        lines.push(`- **${cap}**: ${this.companyName} brings proven expertise in ${cap.toLowerCase()}, ` +
          `with demonstrated results across federal agencies.`);
      }
      lines.push("");
    }

    lines.push(
      `*[Draft content — expand to approximately ${pageTarget} page(s) with specific details, ` +
        `metrics, and references relevant to the solicitation requirements.]*`,
    );

    return lines.join("\n");
  }

  private formatProposalType(type: ProposalType): string {
    const labels: Record<ProposalType, string> = {
      technical_volume: "Technical Volume",
      management_volume: "Management Volume",
      past_performance: "Past Performance Volume",
      cost_volume: "Cost/Price Volume",
      executive_summary: "Executive Summary",
    };
    return labels[type];
  }

  private assignRequirements(
    sectionIndex: number,
    totalSections: number,
  ): string[] {
    // Placeholder: distribute requirement IDs evenly across sections
    const reqs: string[] = [];
    const base = sectionIndex * 3 + 1;
    for (let i = 0; i < 3; i++) {
      reqs.push(`REQ-${String(base + i).padStart(3, "0")}`);
    }
    return reqs;
  }

  private estimateComplianceScore(
    sections: ProposalSection[],
    capabilities: string[],
  ): number {
    // Heuristic: more sections and capabilities generally yield better coverage
    const sectionScore = Math.min(50, sections.length * 10);
    const capScore = Math.min(50, capabilities.length * 10);
    return Math.min(100, sectionScore + capScore);
  }
}
