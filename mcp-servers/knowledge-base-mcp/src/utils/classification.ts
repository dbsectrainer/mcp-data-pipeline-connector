/**
 * Document Classification and Access Control Utilities
 * BE EASY ENTERPRISES LLC
 */

import {
  Classification,
  ClassificationLevel,
  type DocumentCategory,
} from "../types.js";

/**
 * Check whether a requested classification level is at or below the maximum
 * allowed level.  Returns true if access is permitted.
 */
export function isAccessPermitted(
  documentClassification: Classification,
  maxClassification: Classification,
): boolean {
  return (
    ClassificationLevel[documentClassification] <=
    ClassificationLevel[maxClassification]
  );
}

/**
 * Filter an array of items that carry a `classification` field, keeping only
 * those at or below `maxClassification`.
 */
export function filterByClassification<
  T extends { classification: Classification },
>(items: T[], maxClassification: Classification): T[] {
  return items.filter((item) =>
    isAccessPermitted(item.classification, maxClassification),
  );
}

/**
 * Validate that a classification level string is a known value.
 */
export function validateClassification(value: string): Classification {
  const result = Classification.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Invalid classification "${value}". Must be one of: ${Classification.options.join(", ")}`,
    );
  }
  return result.data;
}

/**
 * Determine a default classification based on the document category.
 * Policies and architectures default to "confidential"; everything else to
 * "internal".
 */
export function defaultClassificationForCategory(
  category: DocumentCategory,
): Classification {
  switch (category) {
    case "policy":
    case "architecture":
      return "confidential";
    case "playbook":
    case "procedure":
    case "template":
    case "lesson_learned":
    case "solution_pattern":
    case "reference":
      return "internal";
    default:
      return "internal";
  }
}

/**
 * Sanitize content for a given audience by stripping sections marked with
 * classification markers above the audience level.
 *
 * Markers follow the pattern: `<!-- classification:restricted -->` ...
 * `<!-- /classification:restricted -->`
 */
export function sanitizeForAudience(
  content: string,
  audience: "internal" | "client" | "partner",
): string {
  const maxLevel =
    audience === "internal"
      ? "restricted"
      : audience === "partner"
        ? "confidential"
        : "internal";

  const maxNumeric = ClassificationLevel[maxLevel];

  // Strip blocks classified above the audience level.
  let sanitized = content;
  for (const level of Classification.options) {
    if (ClassificationLevel[level] > maxNumeric) {
      const regex = new RegExp(
        `<!--\\s*classification:${level}\\s*-->[\\s\\S]*?<!--\\s*/classification:${level}\\s*-->`,
        "gi",
      );
      sanitized = sanitized.replace(regex, "[REDACTED]");
    }
  }

  return sanitized;
}
