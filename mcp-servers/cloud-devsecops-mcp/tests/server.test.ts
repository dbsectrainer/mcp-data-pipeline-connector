/**
 * Cloud & DevSecOps MCP Server — Tests
 * BE EASY ENTERPRISES LLC
 */

import { describe, it, expect, beforeAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "../src/server.js";
import { PolicyEngine } from "../src/security/policy-engine.js";
import { IacScanner } from "../src/security/iac-scanner.js";
import { CostAnalyzer } from "../src/utils/cost-analyzer.js";

// ---------------------------------------------------------------------------
// Server creation
// ---------------------------------------------------------------------------

describe("createServer", () => {
  it("should return an McpServer instance", () => {
    const server = createServer();
    expect(server).toBeInstanceOf(McpServer);
  });

  it("should create a new server on each call (no shared state)", () => {
    const a = createServer();
    const b = createServer();
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// PolicyEngine
// ---------------------------------------------------------------------------

describe("PolicyEngine", () => {
  let engine: PolicyEngine;

  beforeAll(() => {
    engine = new PolicyEngine();
  });

  it("should return results for AWS IAM scope", () => {
    const result = engine.evaluate("aws", "1.5.0", "iam", false);
    expect(result.provider).toBe("aws");
    expect(result.benchmark_version).toBe("1.5.0");
    expect(result.scope).toBe("iam");
    expect(result.total_checks).toBeGreaterThan(0);
    expect(result.passed + result.failed + result.warnings).toBe(result.total_checks);
    expect(result.remediation_applied).toBe(false);
  });

  it("should return results for all scopes", () => {
    const result = engine.evaluate("gcp", "2.0.0", "all", false);
    expect(result.total_checks).toBeGreaterThan(0);
    expect(result.findings.length).toBe(result.failed + result.warnings);
  });

  it("should set remediation_applied when auto_remediate is true and there are failures", () => {
    const result = engine.evaluate("aws", "1.5.0", "all", true);
    if (result.failed > 0) {
      expect(result.remediation_applied).toBe(true);
    }
  });

  it("should include compliance references in findings", () => {
    const result = engine.evaluate("aws", "1.5.0", "all", false);
    for (const finding of result.findings) {
      expect(finding.compliance_references.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// IacScanner
// ---------------------------------------------------------------------------

describe("IacScanner", () => {
  let scanner: IacScanner;

  beforeAll(() => {
    scanner = new IacScanner();
  });

  it("should detect public access patterns in Terraform", () => {
    const template = `
resource "aws_security_group" "bad" {
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`;
    const result = scanner.scan(template, "terraform", "fedramp");
    const publicAccessFinding = result.findings.find(
      (f) => f.rule === "no-public-access",
    );
    expect(publicAccessFinding).toBeDefined();
    expect(publicAccessFinding!.severity).toBe("critical");
  });

  it("should detect hardcoded secrets", () => {
    const template = `
resource "aws_db_instance" "db" {
  password = "SuperSecret123!"
}`;
    const result = scanner.scan(template, "terraform", "cis");
    const secretFinding = result.findings.find(
      (f) => f.rule === "no-hardcoded-secrets",
    );
    expect(secretFinding).toBeDefined();
  });

  it("should flag missing encryption configuration", () => {
    const template = `
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}`;
    const result = scanner.scan(template, "terraform", "nist");
    const encryptionFinding = result.findings.find(
      (f) => f.rule === "encryption-at-rest-required",
    );
    expect(encryptionFinding).toBeDefined();
  });

  it("should return a compliance score", () => {
    const template = `
resource "aws_s3_bucket" "secure" {
  bucket = "secure-bucket"
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
      }
    }
  }
  logging {
    target_bucket = "log-bucket"
  }
  tags = {
    Environment = "prod"
  }
}`;
    const result = scanner.scan(template, "terraform", "fedramp");
    expect(result.overall_compliance_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_compliance_score).toBeLessThanOrEqual(100);
  });

  it("should support all compliance frameworks", () => {
    const template = `resource "aws_instance" "test" {}`;
    for (const fw of ["fedramp", "cis", "nist", "stig"] as const) {
      const result = scanner.scan(template, "terraform", fw);
      expect(result.compliance_framework).toBe(fw);
      expect(result.timestamp).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// CostAnalyzer
// ---------------------------------------------------------------------------

describe("CostAnalyzer", () => {
  let analyzer: CostAnalyzer;

  beforeAll(() => {
    analyzer = new CostAnalyzer();
  });

  it("should return AWS cost data", async () => {
    const result = await analyzer.analyze(
      "aws",
      { start: "2026-01-01", end: "2026-01-31" },
      "service",
    );
    expect(result.provider).toBe("aws");
    expect(result.currency).toBe("USD");
    expect(result.total_cost).toBeGreaterThan(0);
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.optimization_recommendations.length).toBeGreaterThan(0);
  });

  it("should return Azure cost data", async () => {
    const result = await analyzer.analyze(
      "azure",
      { start: "2026-01-01", end: "2026-01-31" },
      "tag",
    );
    expect(result.provider).toBe("azure");
    expect(result.total_cost).toBeGreaterThan(0);
  });

  it("should return GCP cost data", async () => {
    const result = await analyzer.analyze(
      "gcp",
      { start: "2026-01-01", end: "2026-01-31" },
      "region",
    );
    expect(result.provider).toBe("gcp");
    expect(result.total_cost).toBeGreaterThan(0);
  });

  it("should reject invalid date formats", async () => {
    await expect(
      analyzer.analyze("aws", { start: "not-a-date", end: "2026-01-31" }, "service"),
    ).rejects.toThrow("Invalid start date format");
  });

  it("should reject start date after end date", async () => {
    await expect(
      analyzer.analyze(
        "aws",
        { start: "2026-02-01", end: "2026-01-01" },
        "service",
      ),
    ).rejects.toThrow("Start date must be before end date");
  });

  it("should reject time periods exceeding 365 days", async () => {
    await expect(
      analyzer.analyze(
        "aws",
        { start: "2024-01-01", end: "2026-01-01" },
        "service",
      ),
    ).rejects.toThrow("must not exceed 365 days");
  });
});
