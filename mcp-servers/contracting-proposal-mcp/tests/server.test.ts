/**
 * Contracting & Proposal MCP Server — Tests
 * BE EASY ENTERPRISES LLC
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "../src/server.js";
import { RFPParser } from "../src/parsers/rfp-parser.js";
import { SAMGovClient } from "../src/parsers/sam-gov-client.js";
import { ProposalWriter } from "../src/generators/proposal-writer.js";
import { ComplianceMatrixGenerator } from "../src/generators/compliance-matrix.js";
import { PricingEngine } from "../src/analysis/pricing-engine.js";
import { CapabilityMapper } from "../src/analysis/capability-mapper.js";
import { ContractVehicleAnalyzer } from "../src/analysis/contract-vehicles.js";

// ---------------------------------------------------------------------------
// Server instantiation
// ---------------------------------------------------------------------------

describe("createServer", () => {
  it("should create a server instance without errors", () => {
    const server = createServer();
    expect(server).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// RFP Parser
// ---------------------------------------------------------------------------

describe("RFPParser", () => {
  it("should parse manual RFP text and extract requirements", async () => {
    const parser = new RFPParser();
    const rfp = await parser.parse({
      source: "manual",
      document_text:
        "NAICS 541512\n" +
        "The contractor shall provide cloud hosting services.\n" +
        "The contractor must maintain FedRAMP authorization.\n" +
        "Personnel should have active Secret clearance.\n" +
        "Evaluation criteria: Technical Approach, Past Performance, Price.",
    });

    expect(rfp.id).toBeTruthy();
    expect(rfp.source).toBe("manual");
    expect(rfp.naics_code).toBe("541512");
    expect(rfp.requirements.length).toBeGreaterThan(0);
    expect(rfp.requirements[0]!.priority).toBe("critical");
  });

  it("should throw when no text is provided for manual source", async () => {
    const parser = new RFPParser();
    await expect(
      parser.parse({ source: "manual", document_text: "" }),
    ).rejects.toThrow(/No document text/);
  });
});

// ---------------------------------------------------------------------------
// SAM.gov Client
// ---------------------------------------------------------------------------

describe("SAMGovClient", () => {
  it("should return mock results when no API key is configured", async () => {
    const client = new SAMGovClient({ apiKey: "" });
    const results = await client.search({
      keywords: ["cybersecurity"],
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.opportunity_id).toBeTruthy();
  });

  it("should return a mock opportunity by ID", async () => {
    const client = new SAMGovClient({ apiKey: "" });
    const opp = await client.getOpportunity("TEST-123");
    expect(opp.opportunity_id).toBe("TEST-123");
    expect(opp.description).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Proposal Writer
// ---------------------------------------------------------------------------

describe("ProposalWriter", () => {
  it("should generate a technical volume proposal", async () => {
    const writer = new ProposalWriter();
    const proposal = await writer.generate({
      rfp_id: "rfp-test-001",
      proposal_type: "technical_volume",
      company_capabilities: ["Cloud Engineering", "Cybersecurity"],
      page_limit: 30,
      compliance_matrix: false,
    });

    expect(proposal.rfp_id).toBe("rfp-test-001");
    expect(proposal.proposal_type).toBe("technical_volume");
    expect(proposal.sections.length).toBeGreaterThan(0);
    expect(proposal.total_pages).toBeGreaterThan(0);
    expect(proposal.compliance_score).toBeGreaterThanOrEqual(0);
    expect(proposal.compliance_score).toBeLessThanOrEqual(100);
  });

  it("should include a compliance matrix section when requested", async () => {
    const writer = new ProposalWriter();
    const proposal = await writer.generate({
      rfp_id: "rfp-test-002",
      proposal_type: "executive_summary",
      company_capabilities: ["IT Modernization"],
      compliance_matrix: true,
    });

    const matrixSection = proposal.sections.find(
      (s) => s.title === "Compliance Matrix",
    );
    expect(matrixSection).toBeDefined();
    expect(matrixSection!.content).toContain("Compliance Traceability Matrix");
  });
});

// ---------------------------------------------------------------------------
// Compliance Matrix Generator
// ---------------------------------------------------------------------------

describe("ComplianceMatrixGenerator", () => {
  it("should generate compliance items for specified check types", () => {
    const gen = new ComplianceMatrixGenerator();
    const items = gen.generateComplianceItems(
      ["format", "content", "pricing"],
      "prop-001",
      "rfp-001",
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.check_type)).toBe(true);
    expect(items.every((i) => i.status)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pricing Engine
// ---------------------------------------------------------------------------

describe("PricingEngine", () => {
  it("should calculate pricing model correctly", () => {
    const engine = new PricingEngine();
    const model = engine.analyze({
      contract_type: "firm_fixed_price",
      labor_categories: [
        { role: "Senior Developer", rate: 150, hours: 2000 },
        { role: "Project Manager", rate: 175, hours: 1000 },
      ],
      indirect_rates: {
        overhead: 0.40,
        ga: 0.10,
        fringe: 0.30,
      },
      profit_margin: 0.10,
    });

    expect(model.total_direct_labor).toBe(475_000);
    expect(model.total_indirect_costs).toBeGreaterThan(0);
    expect(model.total_price).toBeGreaterThan(model.total_direct_labor);
    expect(model.price_per_hour_blended).toBeGreaterThan(0);
    expect(model.competitive_assessment).toBeTruthy();
    expect(model.recommendations.length).toBeGreaterThan(0);
  });

  it("should flag high profit margins", () => {
    const engine = new PricingEngine();
    const model = engine.analyze({
      contract_type: "time_and_materials",
      labor_categories: [
        { role: "Analyst", rate: 100, hours: 500 },
      ],
      indirect_rates: {},
      profit_margin: 0.20,
    });

    const highMarginRec = model.recommendations.find((r) =>
      r.includes("profit margin"),
    );
    expect(highMarginRec).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Capability Mapper
// ---------------------------------------------------------------------------

describe("CapabilityMapper", () => {
  it("should map capabilities to requirements", () => {
    const mapper = new CapabilityMapper();
    const mappings = mapper.map({
      rfp_requirements: [
        {
          id: "REQ-001",
          text: "The contractor shall provide cloud migration services",
        },
        {
          id: "REQ-002",
          text: "The contractor must implement cybersecurity controls",
        },
      ],
      company_capabilities: [
        {
          id: "CAP-001",
          name: "Cloud Migration",
          description: "AWS and Azure cloud migration and modernization services",
        },
        {
          id: "CAP-002",
          name: "Cybersecurity",
          description: "NIST-aligned cybersecurity controls and monitoring",
        },
      ],
      gap_analysis: true,
    });

    expect(mappings.length).toBe(2);
    expect(mappings[0]!.requirement_id).toBe("REQ-001");
    expect(mappings[0]!.mapped_capabilities.length).toBeGreaterThan(0);
  });

  it("should produce a summary with coverage statistics", () => {
    const mapper = new CapabilityMapper();
    const mappings = mapper.map({
      rfp_requirements: [
        { id: "REQ-001", text: "Provide IT support" },
      ],
      company_capabilities: [
        { id: "CAP-001", name: "IT Support", description: "Full IT support services" },
      ],
      gap_analysis: false,
    });

    const summary = mapper.summarize(mappings);
    expect(summary.overall_coverage).toBeGreaterThanOrEqual(0);
    expect(
      summary.fully_covered + summary.partially_covered + summary.uncovered,
    ).toBe(mappings.length);
  });
});

// ---------------------------------------------------------------------------
// Contract Vehicle Analyzer
// ---------------------------------------------------------------------------

describe("ContractVehicleAnalyzer", () => {
  it("should return ranked contract vehicles for IT services", () => {
    const analyzer = new ContractVehicleAnalyzer();
    const vehicles = analyzer.analyze({
      service_type: "IT professional services cloud engineering",
      estimated_value: 5_000_000,
      small_business_set_aside: "8a",
    });

    expect(vehicles.length).toBeGreaterThan(0);
    expect(vehicles[0]!.suitability_score).toBeGreaterThanOrEqual(
      vehicles[vehicles.length - 1]!.suitability_score,
    );
  });

  it("should filter out low-scoring vehicles", () => {
    const analyzer = new ContractVehicleAnalyzer();
    const vehicles = analyzer.analyze({
      service_type: "IT",
      estimated_value: 100_000,
    });

    for (const v of vehicles) {
      expect(v.suitability_score).toBeGreaterThan(10);
    }
  });
});
