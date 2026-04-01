/**
 * Compliance & Audit MCP Server — Tests
 * BE EASY ENTERPRISES LLC
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mapControls, getCrossMapping } from "../src/engines/control-mapper.js";
import {
  collectEvidence,
  runContinuousMonitoring,
} from "../src/engines/evidence-collector.js";
import { generateSSP, renderSSPMarkdown } from "../src/engines/ssp-generator.js";
import {
  createAuditTrailEntry,
  getAuditTrail,
  verifyAuditTrailIntegrity,
} from "../src/utils/audit-trail.js";
import { getAllNISTControls } from "../src/frameworks/nist-800-53.js";
import { getAllCMMCPractices } from "../src/frameworks/cmmc.js";
import { getAllFedRAMPControls } from "../src/frameworks/fedramp.js";
import { createServer } from "../src/server.js";

// ---------------------------------------------------------------------------
// Framework catalogs
// ---------------------------------------------------------------------------

describe("NIST 800-53 catalog", () => {
  it("returns controls across multiple families", () => {
    const controls = getAllNISTControls();
    expect(controls.length).toBeGreaterThan(0);
    const families = new Set(controls.map((c) => c.family));
    expect(families.size).toBeGreaterThanOrEqual(5);
  });

  it("all controls have required fields", () => {
    for (const c of getAllNISTControls()) {
      expect(c.id).toBeTruthy();
      expect(c.family).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.framework).toBe("nist_800_53");
    }
  });
});

describe("CMMC catalog", () => {
  it("returns practices with NIST mappings", () => {
    const practices = getAllCMMCPractices();
    expect(practices.length).toBeGreaterThan(0);
    for (const p of practices) {
      expect(p.nistMappings.length).toBeGreaterThan(0);
    }
  });
});

describe("FedRAMP catalog", () => {
  it("returns controls across baselines", () => {
    const controls = getAllFedRAMPControls();
    expect(controls.length).toBeGreaterThan(0);
    const baselines = new Set(controls.map((c) => c.baseline));
    expect(baselines.size).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Control mapper
// ---------------------------------------------------------------------------

describe("control-mapper", () => {
  it("maps NIST 800-53 controls", () => {
    const result = mapControls("nist_800_53");
    expect(result.framework).toBe("nist_800_53");
    expect(result.totalControls).toBeGreaterThan(0);
    expect(result.controls.length).toBe(result.totalControls);
  });

  it("filters by control family", () => {
    const result = mapControls("nist_800_53", "AC");
    expect(result.totalControls).toBeGreaterThan(0);
    for (const c of result.controls) {
      expect(c.family).toBe("AC");
    }
  });

  it("maps CMMC controls", () => {
    const result = mapControls("cmmc");
    expect(result.framework).toBe("cmmc");
    expect(result.totalControls).toBeGreaterThan(0);
  });

  it("maps FedRAMP controls", () => {
    const result = mapControls("fedramp");
    expect(result.framework).toBe("fedramp");
    expect(result.totalControls).toBeGreaterThan(0);
  });

  it("returns cross-framework mappings", () => {
    const mapping = getCrossMapping("AC-2");
    expect(mapping).toBeDefined();
    expect(mapping!.nist_800_53).toContain("AC-2");
    expect(mapping!.cmmc.length).toBeGreaterThan(0);
    expect(mapping!.fedramp.length).toBeGreaterThan(0);
  });

  it("handles HIPAA and SOX frameworks via mapping table", () => {
    const hipaa = mapControls("hipaa");
    expect(hipaa.totalControls).toBeGreaterThan(0);

    const sox = mapControls("sox");
    expect(sox.totalControls).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Evidence collector
// ---------------------------------------------------------------------------

describe("evidence-collector", () => {
  it("collects evidence for known control families", () => {
    const result = collectEvidence(
      "annual",
      ["AC-1", "AU-2", "CM-6"],
      "SYS-001",
      { start: "2026-01-01", end: "2026-03-31" },
    );
    expect(result.totalControlsRequested).toBe(3);
    expect(result.evidenceCollected.length).toBeGreaterThan(0);
    expect(result.collectionSummary.collected).toBeGreaterThan(0);
  });

  it("reports missing evidence for unknown families", () => {
    const result = collectEvidence(
      "quarterly",
      ["ZZ-99"],
      "SYS-001",
      { start: "2026-01-01", end: "2026-03-31" },
    );
    expect(result.missingEvidence).toContain("ZZ-99");
  });

  it("runs continuous monitoring checks", () => {
    const result = runContinuousMonitoring("SYS-001", [
      "access_control",
      "audit",
      "config_mgmt",
    ]);
    expect(result.categoriesChecked.length).toBe(3);
    expect(result.results.length).toBe(3);
    expect(result.complianceScore).toBeGreaterThanOrEqual(0);
    expect(result.complianceScore).toBeLessThanOrEqual(100);
    expect(["compliant", "non_compliant", "partial"]).toContain(
      result.overallStatus,
    );
  });
});

// ---------------------------------------------------------------------------
// SSP generator
// ---------------------------------------------------------------------------

describe("ssp-generator", () => {
  it("generates an SSP with controls", () => {
    const result = generateSSP(
      "Test System",
      "Cloud boundary within AWS GovCloud us-gov-west-1",
      ["CUI", "PII"],
      "moderate",
      "nist_800_53",
    );
    expect(result.ssp.systemName).toBe("Test System");
    expect(result.ssp.framework).toBe("nist_800_53");
    expect(result.controlCount).toBeGreaterThan(0);
    expect(result.ssp.preparedBy).toContain("BE EASY");
  });

  it("renders SSP as Markdown", () => {
    const result = generateSSP(
      "Markdown Test",
      "On-premises data center",
      ["Financial Data"],
      "high",
      "fedramp",
    );
    const md = renderSSPMarkdown(result.ssp);
    expect(md).toContain("# System Security Plan");
    expect(md).toContain("Markdown Test");
    expect(md).toContain("Authorization Boundary");
  });
});

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

describe("audit-trail", () => {
  it("creates entries with integrity hashes", () => {
    const entry = createAuditTrailEntry(
      "test_action",
      "test-actor",
      "test-resource",
      "RES-001",
      { key: "value" },
    );
    expect(entry.id).toMatch(/^ATR-/);
    expect(entry.integrity).toBeTruthy();
    expect(entry.integrity.length).toBe(64); // SHA-256 hex
  });

  it("maintains a verifiable chain", () => {
    createAuditTrailEntry("action1", "actor", "res", "R1");
    createAuditTrailEntry("action2", "actor", "res", "R2");
    const verification = verifyAuditTrailIntegrity();
    expect(verification.valid).toBe(true);
    expect(verification.totalEntries).toBeGreaterThanOrEqual(2);
  });

  it("returns audit trail entries", () => {
    const trail = getAuditTrail();
    expect(trail.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Server creation
// ---------------------------------------------------------------------------

describe("createServer", () => {
  it("returns an McpServer instance", () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe("function");
    expect(typeof server.close).toBe("function");
  });
});
