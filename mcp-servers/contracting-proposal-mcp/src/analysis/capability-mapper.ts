/**
 * Capability-to-Requirement Mapping Engine
 * BE EASY ENTERPRISES LLC
 *
 * Maps company capabilities to RFP requirements, identifies coverage
 * gaps, and generates actionable recommendations for strengthening
 * proposals.
 */

import type { CapabilityMapping, CapabilityMappingInput } from "../types.js";

// ---------------------------------------------------------------------------
// Similarity helpers
// ---------------------------------------------------------------------------

/**
 * Naive keyword-overlap similarity between two strings.  Returns a
 * score from 0 to 100.
 */
function textSimilarity(a: string, b: string): number {
  const tokenize = (s: string): Set<string> =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }

  return Math.round((overlap / Math.max(tokensA.size, tokensB.size)) * 100);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class CapabilityMapper {
  /**
   * Map company capabilities to RFP requirements and optionally
   * perform gap analysis.
   */
  map(input: CapabilityMappingInput): CapabilityMapping[] {
    const mappings: CapabilityMapping[] = [];

    for (const req of input.rfp_requirements) {
      const scored = input.company_capabilities.map((cap) => ({
        cap,
        score: textSimilarity(
          `${req.text} ${req.id}`,
          `${cap.name} ${cap.description}`,
        ),
      }));

      scored.sort((a, b) => b.score - a.score);

      const mapped = scored.filter((s) => s.score > 15);
      const coverageScore =
        mapped.length > 0
          ? Math.round(
              mapped.reduce((sum, m) => sum + m.score, 0) / mapped.length,
            )
          : 0;

      const gaps: string[] = [];
      const recommendations: string[] = [];

      if (input.gap_analysis) {
        if (coverageScore < 30) {
          gaps.push(
            `No strong capability match for requirement "${req.text.slice(0, 80)}..."`,
          );
          recommendations.push(
            "Consider partnering with a subcontractor or teaming partner that can fill this gap.",
          );
          recommendations.push(
            "Highlight any transferable experience from adjacent domains.",
          );
        } else if (coverageScore < 60) {
          gaps.push(
            `Partial coverage for requirement "${req.text.slice(0, 80)}..."`,
          );
          recommendations.push(
            "Strengthen this area with additional past performance examples or personnel qualifications.",
          );
        }

        if (mapped.length === 0) {
          recommendations.push(
            `Evaluate whether this requirement can be addressed via a mentor-protege or JV arrangement.`,
          );
        }
      }

      mappings.push({
        requirement_id: req.id,
        requirement_text: req.text,
        mapped_capabilities: mapped.map((m) => m.cap.id),
        coverage_score: coverageScore,
        gaps,
        recommendations,
      });
    }

    return mappings;
  }

  /**
   * Compute a summary gap analysis across all mappings.
   */
  summarize(mappings: CapabilityMapping[]): {
    overall_coverage: number;
    fully_covered: number;
    partially_covered: number;
    uncovered: number;
    critical_gaps: string[];
  } {
    const total = mappings.length;
    if (total === 0) {
      return {
        overall_coverage: 0,
        fully_covered: 0,
        partially_covered: 0,
        uncovered: 0,
        critical_gaps: [],
      };
    }

    let fully = 0;
    let partially = 0;
    let uncovered = 0;
    const criticalGaps: string[] = [];

    for (const m of mappings) {
      if (m.coverage_score >= 70) {
        fully++;
      } else if (m.coverage_score >= 30) {
        partially++;
      } else {
        uncovered++;
        criticalGaps.push(
          `${m.requirement_id}: ${m.requirement_text.slice(0, 100)}`,
        );
      }
    }

    const overallCoverage = Math.round(
      mappings.reduce((sum, m) => sum + m.coverage_score, 0) / total,
    );

    return {
      overall_coverage: overallCoverage,
      fully_covered: fully,
      partially_covered: partially,
      uncovered,
      critical_gaps: criticalGaps,
    };
  }
}
