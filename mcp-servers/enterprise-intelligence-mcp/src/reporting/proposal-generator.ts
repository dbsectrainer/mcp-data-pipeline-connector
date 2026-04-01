/**
 * Proposal and report auto-generation engine.
 *
 * Assembles structured proposals from templates, incorporates past performance,
 * and produces client-ready documents for various proposal types.
 */

import { randomUUID } from "node:crypto";
import type {
  PastPerformanceEntry,
  Proposal,
  ProposalSection,
  TemplateType,
} from "../types.js";
import { REPORT_TEMPLATES } from "./report-templates.js";

// ---------------------------------------------------------------------------
// Past performance database (simulated)
// ---------------------------------------------------------------------------

const PAST_PERFORMANCE_DB: PastPerformanceEntry[] = [
  {
    project_name: "Enterprise Data Migration — Department of Defense",
    client: "U.S. Department of Defense",
    contract_value: 4_500_000,
    period: "2022-2024",
    relevance_score: 92,
    description:
      "Led end-to-end data migration of 15+ legacy systems to a cloud-native architecture, " +
      "achieving 99.97% data integrity and delivering 3 weeks ahead of schedule.",
  },
  {
    project_name: "Cybersecurity Operations Center — DHS",
    client: "Department of Homeland Security",
    contract_value: 8_200_000,
    period: "2021-2024",
    relevance_score: 88,
    description:
      "Designed and staffed a 24/7 Security Operations Center with SIEM integration, " +
      "reducing mean time to detect from 72 hours to 45 minutes.",
  },
  {
    project_name: "Cloud Infrastructure Modernization — VA",
    client: "Department of Veterans Affairs",
    contract_value: 3_100_000,
    period: "2023-2025",
    relevance_score: 85,
    description:
      "Migrated mission-critical healthcare applications to AWS GovCloud with FedRAMP High " +
      "authorization, improving system availability from 99.5% to 99.99%.",
  },
  {
    project_name: "Business Intelligence Platform — GSA",
    client: "General Services Administration",
    contract_value: 1_800_000,
    period: "2022-2023",
    relevance_score: 90,
    description:
      "Built an enterprise BI platform consolidating data from 8 siloed systems, enabling " +
      "real-time executive dashboards and saving 200+ analyst-hours per month.",
  },
  {
    project_name: "IT Service Management Transformation — Treasury",
    client: "Department of the Treasury",
    contract_value: 2_400_000,
    period: "2023-2025",
    relevance_score: 78,
    description:
      "Implemented ITIL 4-aligned service management processes with ServiceNow, " +
      "reducing incident resolution time by 40% and improving customer satisfaction scores by 25%.",
  },
];

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

function generateExecutiveSummary(
  clientName: string,
  projectScope: string,
  requirements: string[],
): ProposalSection {
  return {
    title: "Executive Summary",
    content:
      `BE EASY ENTERPRISES LLC is pleased to submit this proposal to ${clientName} ` +
      `for ${projectScope}. Our approach leverages proven methodologies and deep domain ` +
      `expertise to deliver measurable outcomes aligned with your strategic objectives.\n\n` +
      `This proposal addresses ${requirements.length} key requirement(s) through a structured ` +
      `delivery framework that emphasizes quality, transparency, and continuous improvement. ` +
      `Our team brings decades of combined experience across federal and commercial sectors, ` +
      `with a track record of on-time, on-budget delivery.`,
    order: 1,
  };
}

function generateTechnicalApproach(
  projectScope: string,
  requirements: string[],
): ProposalSection {
  const reqList = requirements
    .map((r, i) => `  ${i + 1}. ${r}`)
    .join("\n");

  return {
    title: "Technical Approach",
    content:
      `Our technical approach to ${projectScope} is built on three pillars: ` +
      `Discovery & Assessment, Solution Design & Implementation, and Continuous Optimization.\n\n` +
      `Phase 1 — Discovery & Assessment (Weeks 1-4):\n` +
      `Comprehensive analysis of current-state environment, stakeholder interviews, and ` +
      `requirements validation.\n\n` +
      `Phase 2 — Solution Design & Implementation (Weeks 5-16):\n` +
      `Iterative delivery using Agile/SAFe methodology with bi-weekly sprint reviews.\n\n` +
      `Phase 3 — Optimization & Transition (Weeks 17-20):\n` +
      `Performance tuning, knowledge transfer, and operational handoff.\n\n` +
      `Requirements Addressed:\n${reqList}`,
    order: 2,
  };
}

function generateManagementApproach(): ProposalSection {
  return {
    title: "Management Approach",
    content:
      "BE EASY ENTERPRISES LLC employs a PMI-aligned project management methodology " +
      "supported by Earned Value Management (EVM) for cost and schedule tracking. " +
      "Our governance framework includes:\n\n" +
      "- Weekly status reports with RAG-coded risk and issue tracking\n" +
      "- Monthly executive steering committee reviews\n" +
      "- Integrated Change Control Board (CCB) for scope management\n" +
      "- Continuous quality assurance through independent verification and validation (IV&V)\n\n" +
      "Our Program Manager holds PMP and SAFe certifications and has successfully " +
      "delivered 15+ federal IT programs valued at over $50M.",
    order: 3,
  };
}

function generatePastPerformanceSection(
  requirements: string[],
): { section: ProposalSection; entries: PastPerformanceEntry[] } {
  // Select most relevant past performance entries
  const sorted = [...PAST_PERFORMANCE_DB].sort(
    (a, b) => b.relevance_score - a.relevance_score,
  );
  const selected = sorted.slice(0, 3);

  const content = selected
    .map(
      (pp) =>
        `**${pp.project_name}**\n` +
        `Client: ${pp.client} | Value: $${pp.contract_value.toLocaleString()} | Period: ${pp.period}\n` +
        `Relevance Score: ${pp.relevance_score}/100\n` +
        `${pp.description}`,
    )
    .join("\n\n");

  return {
    section: {
      title: "Past Performance",
      content:
        "The following past performance references demonstrate BE EASY ENTERPRISES LLC's " +
        "capability and experience relevant to this requirement:\n\n" +
        content,
      order: 4,
    },
    entries: selected,
  };
}

function generateCostSection(requirements: string[]): ProposalSection {
  const baseRate = 145;
  const estimatedHours = requirements.length * 320;
  const laborCost = baseRate * estimatedHours;
  const overhead = laborCost * 0.12;
  const gaAdmin = laborCost * 0.08;
  const profit = (laborCost + overhead + gaAdmin) * 0.1;
  const totalCost = laborCost + overhead + gaAdmin + profit;

  return {
    title: "Cost Proposal",
    content:
      "Cost Summary:\n\n" +
      `| Category | Amount |\n` +
      `|----------|--------|\n` +
      `| Direct Labor (${estimatedHours} hours @ $${baseRate}/hr blended) | $${laborCost.toLocaleString()} |\n` +
      `| Overhead (12%) | $${Math.round(overhead).toLocaleString()} |\n` +
      `| G&A (8%) | $${Math.round(gaAdmin).toLocaleString()} |\n` +
      `| Profit (10%) | $${Math.round(profit).toLocaleString()} |\n` +
      `| **Total Proposed Price** | **$${Math.round(totalCost).toLocaleString()}** |\n\n` +
      "All rates are consistent with GSA Schedule pricing and prevailing wage determinations.",
    order: 5,
  };
}

function generateCapabilityStatement(
  clientName: string,
  projectScope: string,
): ProposalSection {
  return {
    title: "Capability Statement",
    content:
      "BE EASY ENTERPRISES LLC\n\n" +
      "Core Competencies:\n" +
      "- Enterprise Data Analytics & Business Intelligence\n" +
      "- Cloud Migration & Modernization (AWS, Azure, GCP)\n" +
      "- Cybersecurity Operations & Compliance\n" +
      "- IT Service Management & Digital Transformation\n" +
      "- Artificial Intelligence & Machine Learning Solutions\n\n" +
      "Certifications & Contract Vehicles:\n" +
      "- ISO 27001 Certified\n" +
      "- CMMI Level 3 Appraised\n" +
      "- GSA MAS Schedule Holder\n" +
      "- 8(a) Certified Small Disadvantaged Business\n\n" +
      "DUNS: 123456789 | CAGE Code: 5ABC1 | UEI: A1B2C3D4E5F6\n\n" +
      `Prepared for: ${clientName}\n` +
      `Regarding: ${projectScope}`,
    order: 1,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a complete proposal document based on template type and inputs.
 */
export async function createProposal(
  templateType: TemplateType,
  clientName: string,
  projectScope: string,
  requirements: string[],
  includePastPerformance: boolean,
): Promise<Proposal> {
  const sections: ProposalSection[] = [];
  let pastPerformance: PastPerformanceEntry[] = [];

  switch (templateType) {
    case "technical_proposal": {
      sections.push(generateExecutiveSummary(clientName, projectScope, requirements));
      sections.push(generateTechnicalApproach(projectScope, requirements));
      sections.push(generateManagementApproach());
      if (includePastPerformance) {
        const pp = generatePastPerformanceSection(requirements);
        sections.push(pp.section);
        pastPerformance = pp.entries;
      }
      break;
    }
    case "executive_summary": {
      sections.push(generateExecutiveSummary(clientName, projectScope, requirements));
      if (includePastPerformance) {
        const pp = generatePastPerformanceSection(requirements);
        sections.push(pp.section);
        pastPerformance = pp.entries;
      }
      break;
    }
    case "capability_statement": {
      sections.push(generateCapabilityStatement(clientName, projectScope));
      if (includePastPerformance) {
        const pp = generatePastPerformanceSection(requirements);
        sections.push(pp.section);
        pastPerformance = pp.entries;
      }
      break;
    }
    case "past_performance": {
      const pp = generatePastPerformanceSection(requirements);
      sections.push(pp.section);
      pastPerformance = pp.entries;
      break;
    }
    case "cost_proposal": {
      sections.push(generateExecutiveSummary(clientName, projectScope, requirements));
      sections.push(generateCostSection(requirements));
      break;
    }
  }

  const totalWordCount = sections.reduce(
    (sum, s) => sum + s.content.split(/\s+/).length,
    0,
  );

  const estimatedValue = requirements.length * 320 * 145;

  return {
    id: randomUUID(),
    template_type: templateType,
    client_name: clientName,
    project_scope: projectScope,
    requirements,
    sections,
    past_performance: pastPerformance,
    generated_at: new Date().toISOString(),
    word_count: totalWordCount,
    estimated_value: estimatedValue,
  };
}
