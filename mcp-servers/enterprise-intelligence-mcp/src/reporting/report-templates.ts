/**
 * Templates for various client report types.
 *
 * Provides section blueprints, formatting rules, and boilerplate content
 * used by the report generator to produce client-ready deliverables.
 */

import type { ClassificationLevel, ReportFormat, ReportType } from "../types.js";

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

export interface ReportTemplate {
  report_type: ReportType;
  title_prefix: string;
  default_sections: string[];
  header: string;
  footer: string;
  classification_banner: Record<ClassificationLevel, string>;
  formatting: {
    font_family: string;
    heading_color: string;
    accent_color: string;
    page_margins: string;
  };
  supported_formats: ReportFormat[];
}

export const REPORT_TEMPLATES: Record<ReportType, ReportTemplate> = {
  assessment: {
    report_type: "assessment",
    title_prefix: "Assessment Report",
    default_sections: [
      "Executive Summary",
      "Scope & Methodology",
      "Current State Analysis",
      "Findings & Observations",
      "Risk Assessment",
      "Recommendations",
      "Appendices",
    ],
    header: "BE EASY ENTERPRISES LLC | Assessment Report",
    footer: "Confidential | BE EASY ENTERPRISES LLC | Page {page} of {total}",
    classification_banner: {
      public: "",
      internal: "INTERNAL USE ONLY",
      confidential: "CONFIDENTIAL — DO NOT DISTRIBUTE",
      restricted: "RESTRICTED — AUTHORIZED PERSONNEL ONLY",
    },
    formatting: {
      font_family: "Inter, Helvetica, Arial, sans-serif",
      heading_color: "#1a365d",
      accent_color: "#2b6cb0",
      page_margins: "1in",
    },
    supported_formats: ["pdf", "docx", "markdown"],
  },

  recommendation: {
    report_type: "recommendation",
    title_prefix: "Recommendation Report",
    default_sections: [
      "Executive Summary",
      "Background & Context",
      "Analysis",
      "Options Evaluation",
      "Recommended Approach",
      "Implementation Roadmap",
      "Cost-Benefit Analysis",
      "Next Steps",
    ],
    header: "BE EASY ENTERPRISES LLC | Recommendation Report",
    footer: "Confidential | BE EASY ENTERPRISES LLC | Page {page} of {total}",
    classification_banner: {
      public: "",
      internal: "INTERNAL USE ONLY",
      confidential: "CONFIDENTIAL — DO NOT DISTRIBUTE",
      restricted: "RESTRICTED — AUTHORIZED PERSONNEL ONLY",
    },
    formatting: {
      font_family: "Inter, Helvetica, Arial, sans-serif",
      heading_color: "#22543d",
      accent_color: "#38a169",
      page_margins: "1in",
    },
    supported_formats: ["pdf", "docx", "pptx", "markdown"],
  },

  status_update: {
    report_type: "status_update",
    title_prefix: "Status Update",
    default_sections: [
      "Period Overview",
      "Accomplishments",
      "Milestones & Schedule",
      "Budget Status",
      "Risks & Issues",
      "Upcoming Activities",
      "Action Items",
    ],
    header: "BE EASY ENTERPRISES LLC | Project Status Update",
    footer: "BE EASY ENTERPRISES LLC | Page {page} of {total}",
    classification_banner: {
      public: "",
      internal: "INTERNAL USE ONLY",
      confidential: "CONFIDENTIAL — DO NOT DISTRIBUTE",
      restricted: "RESTRICTED — AUTHORIZED PERSONNEL ONLY",
    },
    formatting: {
      font_family: "Inter, Helvetica, Arial, sans-serif",
      heading_color: "#744210",
      accent_color: "#d69e2e",
      page_margins: "0.75in",
    },
    supported_formats: ["pdf", "docx", "pptx", "markdown"],
  },

  final_deliverable: {
    report_type: "final_deliverable",
    title_prefix: "Final Deliverable",
    default_sections: [
      "Executive Summary",
      "Project Overview",
      "Methodology",
      "Detailed Findings",
      "Analysis & Results",
      "Recommendations",
      "Implementation Guide",
      "Lessons Learned",
      "Appendices",
    ],
    header: "BE EASY ENTERPRISES LLC | Final Deliverable",
    footer: "Confidential | BE EASY ENTERPRISES LLC | Page {page} of {total}",
    classification_banner: {
      public: "",
      internal: "INTERNAL USE ONLY",
      confidential: "CONFIDENTIAL — DO NOT DISTRIBUTE",
      restricted: "RESTRICTED — AUTHORIZED PERSONNEL ONLY",
    },
    formatting: {
      font_family: "Inter, Helvetica, Arial, sans-serif",
      heading_color: "#553c9a",
      accent_color: "#805ad5",
      page_margins: "1in",
    },
    supported_formats: ["pdf", "docx", "markdown"],
  },
};

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the section list for a report, merging requested sections with defaults.
 */
export function resolveSections(
  reportType: ReportType,
  requestedSections: string[],
): string[] {
  const template = REPORT_TEMPLATES[reportType];
  if (requestedSections.length > 0) return requestedSections;
  return template.default_sections;
}

/**
 * Generate section content boilerplate for a given section title.
 */
export function generateSectionContent(
  sectionTitle: string,
  reportType: ReportType,
): string {
  const boilerplate: Record<string, string> = {
    "Executive Summary":
      "This section provides a high-level overview of the engagement, key findings, " +
      "and primary recommendations for executive stakeholders.",
    "Scope & Methodology":
      "This section describes the scope boundaries, assessment methodology, data collection " +
      "methods, and analytical frameworks employed during this engagement.",
    "Current State Analysis":
      "This section documents the current-state environment, including infrastructure, " +
      "processes, organizational structure, and technology stack.",
    "Findings & Observations":
      "This section presents detailed findings organized by category, including supporting " +
      "evidence and severity ratings.",
    "Risk Assessment":
      "This section provides a comprehensive risk assessment with scoring, heat maps, " +
      "and recommended mitigation strategies.",
    "Recommendations":
      "This section presents prioritized recommendations with implementation timelines, " +
      "resource requirements, and expected outcomes.",
    "Implementation Roadmap":
      "This section outlines a phased implementation plan with milestones, dependencies, " +
      "and success criteria.",
    "Cost-Benefit Analysis":
      "This section quantifies the expected costs and benefits of proposed recommendations, " +
      "including ROI projections and payback period analysis.",
    "Appendices":
      "Supporting documentation, detailed data tables, and reference materials.",
  };

  return boilerplate[sectionTitle] ??
    `Content for "${sectionTitle}" section. This section covers the relevant analysis, ` +
    `data, and recommendations specific to this topic area.`;
}

/**
 * Validate that the requested format is supported for the given report type.
 */
export function isFormatSupported(
  reportType: ReportType,
  format: ReportFormat,
): boolean {
  return REPORT_TEMPLATES[reportType].supported_formats.includes(format);
}
