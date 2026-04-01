/**
 * Cross-framework control mapping engine.
 * BE EASY ENTERPRISES LLC
 *
 * Maps controls across NIST 800-53, CMMC, FedRAMP, FISMA, HIPAA, and SOX
 * to enable gap analysis and compliance migration.
 */

import type { SecurityControl, Framework } from "../types.js";
import {
  getAllNISTControls,
  getNISTControlsByFamily,
  getNISTControlsByBaseline,
} from "../frameworks/nist-800-53.js";
import {
  getAllCMMCPractices,
  getCMMCPracticesByDomain,
  cmmcPracticesToControls,
} from "../frameworks/cmmc.js";
import {
  getAllFedRAMPControls,
  getFedRAMPControlsByFamily,
  getFedRAMPControlsByLevel,
} from "../frameworks/fedramp.js";

// ---------------------------------------------------------------------------
// Cross-framework mapping table
// ---------------------------------------------------------------------------

interface CrossMapping {
  nist_800_53: string[];
  cmmc: string[];
  fedramp: string[];
  fisma: string[];
  hipaa: string[];
  sox: string[];
}

/**
 * Canonical cross-framework mapping by control family.
 * Keys are NIST 800-53 control IDs; values map to equivalent controls
 * in other frameworks.
 */
const crossMappingTable: Record<string, CrossMapping> = {
  "AC-1": {
    nist_800_53: ["AC-1"],
    cmmc: ["AC.L1-3.1.1"],
    fedramp: ["FedRAMP-AC-1"],
    fisma: ["AC-1"],
    hipaa: ["164.312(a)(1)"],
    sox: ["ITGC-AC-01"],
  },
  "AC-2": {
    nist_800_53: ["AC-2"],
    cmmc: ["AC.L1-3.1.1", "AC.L2-3.1.5"],
    fedramp: ["FedRAMP-AC-2"],
    fisma: ["AC-2"],
    hipaa: ["164.312(a)(2)(i)"],
    sox: ["ITGC-AC-02"],
  },
  "AC-3": {
    nist_800_53: ["AC-3"],
    cmmc: ["AC.L1-3.1.2"],
    fedramp: ["FedRAMP-AC-3"],
    fisma: ["AC-3"],
    hipaa: ["164.312(a)(1)"],
    sox: ["ITGC-AC-03"],
  },
  "AC-6": {
    nist_800_53: ["AC-6"],
    cmmc: ["AC.L2-3.1.5"],
    fedramp: ["FedRAMP-AC-6"],
    fisma: ["AC-6"],
    hipaa: ["164.312(a)(2)(i)"],
    sox: ["ITGC-AC-04"],
  },
  "AU-2": {
    nist_800_53: ["AU-2"],
    cmmc: ["AU.L2-3.3.1"],
    fedramp: ["FedRAMP-AU-2"],
    fisma: ["AU-2"],
    hipaa: ["164.312(b)"],
    sox: ["ITGC-AU-01"],
  },
  "AU-6": {
    nist_800_53: ["AU-6"],
    cmmc: ["AU.L2-3.3.1"],
    fedramp: ["FedRAMP-AU-6"],
    fisma: ["AU-6"],
    hipaa: ["164.312(b)"],
    sox: ["ITGC-AU-02"],
  },
  "CM-2": {
    nist_800_53: ["CM-2"],
    cmmc: ["CM.L2-3.4.1"],
    fedramp: ["FedRAMP-CM-2"],
    fisma: ["CM-2"],
    hipaa: ["164.310(d)(2)(iii)"],
    sox: ["ITGC-CM-01"],
  },
  "CM-6": {
    nist_800_53: ["CM-6"],
    cmmc: ["CM.L2-3.4.2"],
    fedramp: ["FedRAMP-CM-6"],
    fisma: ["CM-6"],
    hipaa: ["164.310(d)(1)"],
    sox: ["ITGC-CM-02"],
  },
  "IA-2": {
    nist_800_53: ["IA-2"],
    cmmc: ["IA.L1-3.5.1", "IA.L1-3.5.2"],
    fedramp: ["FedRAMP-IA-2"],
    fisma: ["IA-2"],
    hipaa: ["164.312(d)"],
    sox: ["ITGC-IA-01"],
  },
  "IR-4": {
    nist_800_53: ["IR-4"],
    cmmc: ["IR.L2-3.6.1"],
    fedramp: ["FedRAMP-IR-4"],
    fisma: ["IR-4"],
    hipaa: ["164.308(a)(6)"],
    sox: ["ITGC-IR-01"],
  },
  "RA-5": {
    nist_800_53: ["RA-5"],
    cmmc: [],
    fedramp: ["FedRAMP-RA-5"],
    fisma: ["RA-5"],
    hipaa: ["164.308(a)(8)"],
    sox: ["ITGC-RA-01"],
  },
  "SC-7": {
    nist_800_53: ["SC-7"],
    cmmc: ["SC.L1-3.13.1"],
    fedramp: ["FedRAMP-SC-7"],
    fisma: ["SC-7"],
    hipaa: ["164.312(e)(1)"],
    sox: ["ITGC-SC-01"],
  },
  "SI-2": {
    nist_800_53: ["SI-2"],
    cmmc: ["SI.L1-3.14.1"],
    fedramp: ["FedRAMP-SI-2"],
    fisma: ["SI-2"],
    hipaa: ["164.308(a)(5)(ii)(B)"],
    sox: ["ITGC-SI-01"],
  },
  "SI-4": {
    nist_800_53: ["SI-4"],
    cmmc: ["SI.L2-3.14.3"],
    fedramp: ["FedRAMP-SI-4"],
    fisma: ["SI-4"],
    hipaa: ["164.312(b)"],
    sox: ["ITGC-SI-02"],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface MappingResult {
  framework: Framework;
  controlFamily: string | null;
  systemId: string | null;
  totalControls: number;
  controls: SecurityControl[];
  crossMappings: Record<string, string[]>[];
  timestamp: string;
}

/**
 * Map controls for the requested framework, optionally filtered by family
 * and annotated with cross-framework mappings.
 */
export function mapControls(
  framework: Framework,
  controlFamily?: string,
  systemId?: string,
): MappingResult {
  let controls: SecurityControl[];

  switch (framework) {
    case "nist_800_53":
      controls = controlFamily
        ? getNISTControlsByFamily(controlFamily)
        : getAllNISTControls();
      break;
    case "cmmc":
      controls = controlFamily
        ? cmmcPracticesToControls(getCMMCPracticesByDomain(controlFamily))
        : cmmcPracticesToControls(getAllCMMCPractices());
      break;
    case "fedramp":
      controls = controlFamily
        ? getFedRAMPControlsByFamily(controlFamily)
        : getAllFedRAMPControls();
      break;
    case "fisma":
      // FISMA leverages NIST 800-53 directly
      controls = (
        controlFamily
          ? getNISTControlsByFamily(controlFamily)
          : getAllNISTControls()
      ).map((c) => ({ ...c, framework: "fisma" as const }));
      break;
    case "hipaa":
    case "sox":
      // Generate from cross-mapping table
      controls = buildControlsFromMappingTable(framework, controlFamily);
      break;
    default:
      controls = [];
  }

  const crossMappings = controls.map((c) => {
    const nistId = resolveToNIST(c);
    const mapping = nistId ? crossMappingTable[nistId] : undefined;
    return mapping
      ? Object.fromEntries(
          Object.entries(mapping).filter(([k]) => k !== framework),
        )
      : {};
  });

  return {
    framework,
    controlFamily: controlFamily ?? null,
    systemId: systemId ?? null,
    totalControls: controls.length,
    controls,
    crossMappings,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get cross-framework equivalents for a single control ID.
 */
export function getCrossMapping(
  controlId: string,
): CrossMapping | undefined {
  // Try direct lookup
  if (crossMappingTable[controlId]) {
    return crossMappingTable[controlId];
  }
  // Search across all frameworks in the table
  for (const mapping of Object.values(crossMappingTable)) {
    for (const ids of Object.values(mapping)) {
      if (ids.includes(controlId)) {
        return mapping;
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveToNIST(control: SecurityControl): string | undefined {
  if (control.framework === "nist_800_53" || control.framework === "fisma") {
    return control.id;
  }
  // Look up in cross-mapping table
  for (const [nistId, mapping] of Object.entries(crossMappingTable)) {
    const frameworkIds =
      mapping[control.framework as keyof CrossMapping] ?? [];
    if (frameworkIds.includes(control.id)) {
      return nistId;
    }
  }
  return undefined;
}

function buildControlsFromMappingTable(
  framework: Framework,
  controlFamily?: string,
): SecurityControl[] {
  const controls: SecurityControl[] = [];
  for (const [nistId, mapping] of Object.entries(crossMappingTable)) {
    const frameworkIds =
      mapping[framework as keyof CrossMapping] ?? [];
    if (frameworkIds.length === 0) continue;

    const family = nistId.split("-")[0];
    if (controlFamily && family.toUpperCase() !== controlFamily.toUpperCase()) {
      continue;
    }

    for (const fid of frameworkIds) {
      controls.push({
        id: fid,
        family,
        title: `${framework.toUpperCase()} control mapped from NIST ${nistId}`,
        description: `Cross-mapped control from NIST 800-53 ${nistId} to ${framework.toUpperCase()} framework.`,
        framework,
        relatedControls: [nistId],
        crossFrameworkMappings: {
          nist_800_53: [nistId],
        },
      });
    }
  }
  return controls;
}
