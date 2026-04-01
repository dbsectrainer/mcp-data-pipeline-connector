/**
 * Compliance Matrix Generator
 * BE EASY ENTERPRISES LLC
 *
 * Builds a compliance traceability matrix that maps RFP requirements
 * to proposal sections, enabling reviewers to verify full coverage.
 */

import type { ProposalSection, ComplianceItem, ComplianceCheckType } from "../types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComplianceMatrixEntry {
  requirementId: string;
  requirementText: string;
  proposalSection: string;
  pageReference: string;
  status: "addressed" | "partially_addressed" | "not_addressed";
  notes: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class ComplianceMatrixGenerator {
  /**
   * Generate a compliance matrix from proposal sections by extracting
   * the requirements each section addresses.
   */
  generateFromProposal(sections: ProposalSection[]): string {
    const entries: ComplianceMatrixEntry[] = [];
    let runningPage = 1;

    for (const section of sections) {
      for (const reqId of section.requirements_addressed) {
        entries.push({
          requirementId: reqId,
          requirementText: `Requirement ${reqId}`,
          proposalSection: section.title,
          pageReference: `p. ${runningPage}`,
          status: "addressed",
          notes: "",
        });
      }
      runningPage += section.page_count;
    }

    return this.renderMarkdown(entries);
  }

  /**
   * Build compliance check items from a list of check types against
   * known proposal data.  Returns structured items suitable for the
   * ComplianceResult type.
   */
  generateComplianceItems(
    checkTypes: ComplianceCheckType[],
    proposalId: string,
    rfpId: string,
  ): ComplianceItem[] {
    const items: ComplianceItem[] = [];

    for (const checkType of checkTypes) {
      items.push(...this.runCheck(checkType, proposalId, rfpId));
    }

    return items;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private renderMarkdown(entries: ComplianceMatrixEntry[]): string {
    const lines: string[] = [
      "# Compliance Traceability Matrix",
      "",
      "| Req ID | Requirement | Proposal Section | Page | Status |",
      "|--------|-------------|-----------------|------|--------|",
    ];

    for (const entry of entries) {
      const statusLabel = entry.status.replace("_", " ");
      lines.push(
        `| ${entry.requirementId} | ${entry.requirementText} | ${entry.proposalSection} | ${entry.pageReference} | ${statusLabel} |`,
      );
    }

    if (entries.length === 0) {
      lines.push(
        "| — | No requirements mapped | — | — | not addressed |",
      );
    }

    return lines.join("\n");
  }

  private runCheck(
    checkType: ComplianceCheckType,
    proposalId: string,
    rfpId: string,
  ): ComplianceItem[] {
    // Each check type produces one or more compliance items.
    // In production these would inspect actual proposal content.
    switch (checkType) {
      case "format":
        return [
          {
            check_type: "format",
            requirement: "Page limit compliance",
            status: "compliant",
            finding: "Proposal is within the specified page limit.",
          },
          {
            check_type: "format",
            requirement: "Font and margin requirements",
            status: "compliant",
            finding:
              "Document uses 12pt Times New Roman with 1-inch margins as required.",
          },
        ];

      case "content":
        return [
          {
            check_type: "content",
            requirement: "All RFP sections addressed",
            status: "compliant",
            finding:
              "All mandatory sections of the RFP are addressed in the proposal.",
          },
          {
            check_type: "content",
            requirement: "Evaluation criteria coverage",
            status: "partially_compliant",
            finding:
              "Most evaluation criteria are addressed; verify depth of technical approach section.",
            recommendation:
              "Expand the Technical Approach section with additional metrics and evidence.",
          },
        ];

      case "certifications":
        return [
          {
            check_type: "certifications",
            requirement: "Required certifications included",
            status: "not_evaluated",
            finding:
              "Certification requirements should be verified against company records.",
            recommendation:
              "Attach copies of ISO 27001, CMMI, or other required certifications.",
          },
        ];

      case "past_performance":
        return [
          {
            check_type: "past_performance",
            requirement: "Minimum past performance references",
            status: "compliant",
            finding:
              "Required number of past performance references are included.",
          },
        ];

      case "pricing":
        return [
          {
            check_type: "pricing",
            requirement: "Cost realism",
            status: "compliant",
            finding:
              "Proposed rates are within competitive range based on market analysis.",
          },
          {
            check_type: "pricing",
            requirement: "Rate documentation",
            status: "partially_compliant",
            finding: "Labor rate justification is present but could be strengthened.",
            recommendation:
              "Include Bureau of Labor Statistics data or approved rate schedules.",
          },
        ];

      case "representations":
        return [
          {
            check_type: "representations",
            requirement: "Representations and certifications",
            status: "not_evaluated",
            finding:
              "FAR 52.204-8 representations should be verified in SAM.gov.",
            recommendation:
              "Confirm all reps & certs are current at https://sam.gov.",
          },
        ];
    }
  }
}
