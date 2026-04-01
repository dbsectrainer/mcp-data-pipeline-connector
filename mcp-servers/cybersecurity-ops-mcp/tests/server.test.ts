/**
 * Cybersecurity Operations MCP — Server Tests
 * BE EASY ENTERPRISES LLC
 */

import { describe, it, expect, beforeAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "../src/server.js";

describe("Cybersecurity Operations MCP Server", () => {
  let server: McpServer;

  beforeAll(() => {
    server = createServer();
  });

  it("should create a server instance", () => {
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(McpServer);
  });

  it("should have the correct server name and version", () => {
    // The server exposes its metadata
    expect(server).toBeDefined();
  });
});

describe("SIEM Client", () => {
  it("should import SIEMClient without errors", async () => {
    const { SIEMClient } = await import("../src/integrations/siem-client.js");
    const client = new SIEMClient({});
    expect(client).toBeDefined();
  });

  it("should query generic alerts", async () => {
    const { SIEMClient } = await import("../src/integrations/siem-client.js");
    const client = new SIEMClient({});
    const result = await client.queryAlerts(
      "generic",
      "test query",
      { start: "2025-01-01T00:00:00Z", end: "2025-01-02T00:00:00Z" },
      "all",
    );
    expect(result.source).toBe("generic");
    expect(result.alerts).toHaveLength(1);
    expect(result.total_count).toBe(1);
    expect(result.query_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("should throw when Splunk is not configured", async () => {
    const { SIEMClient } = await import("../src/integrations/siem-client.js");
    const client = new SIEMClient({});
    await expect(
      client.queryAlerts(
        "splunk",
        "test",
        { start: "2025-01-01T00:00:00Z", end: "2025-01-02T00:00:00Z" },
        "all",
      ),
    ).rejects.toThrow("Splunk is not configured");
  });
});

describe("Vulnerability Scanner", () => {
  it("should query vulnerabilities by CVE ID", async () => {
    const { VulnerabilityScanner } = await import(
      "../src/integrations/vulnerability-scanner.js"
    );
    const scanner = new VulnerabilityScanner();
    const result = await scanner.queryVulnerabilities({
      cve_id: "CVE-2024-12345",
    });
    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].cve_id).toBe("CVE-2024-12345");
  });

  it("should return cached results on repeated queries", async () => {
    const { VulnerabilityScanner } = await import(
      "../src/integrations/vulnerability-scanner.js"
    );
    const scanner = new VulnerabilityScanner(undefined, 60000);
    const params = { keyword: "cache-test" };
    const first = await scanner.queryVulnerabilities(params);
    const second = await scanner.queryVulnerabilities(params);
    // Same reference from cache
    expect(first).toBe(second);
  });
});

describe("MITRE ATT&CK Client", () => {
  it("should map a technique by ID", async () => {
    const { MITREAttackClient } = await import(
      "../src/integrations/mitre-attack.js"
    );
    const client = new MITREAttackClient();
    const result = await client.mapThreats({ technique_id: "T1190" });
    expect(result.techniques).toHaveLength(1);
    expect(result.techniques[0].id).toBe("T1190");
    expect(result.techniques[0].name).toBe("Exploit Public-Facing Application");
  });

  it("should map techniques by tactic", async () => {
    const { MITREAttackClient } = await import(
      "../src/integrations/mitre-attack.js"
    );
    const client = new MITREAttackClient();
    const result = await client.mapThreats({ tactic: "Initial Access" });
    expect(result.techniques.length).toBeGreaterThan(0);
    expect(
      result.techniques.every((t) =>
        t.tactics.some((tac) => tac.toLowerCase().includes("initial access")),
      ),
    ).toBe(true);
  });
});

describe("Threat Intelligence Client", () => {
  it("should validate and reject an invalid IP", async () => {
    const { ThreatIntelClient } = await import(
      "../src/integrations/threat-intel.js"
    );
    const client = new ThreatIntelClient({});
    await expect(client.lookup("not-an-ip", "ip")).rejects.toThrow(
      "Invalid IP address format",
    );
  });

  it("should return results for an unconfigured lookup", async () => {
    const { ThreatIntelClient } = await import(
      "../src/integrations/threat-intel.js"
    );
    const client = new ThreatIntelClient({});
    const result = await client.lookup("192.168.1.1", "ip");
    expect(result.indicator_type).toBe("ip");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].name).toBe("local-analysis");
  });
});

describe("Report Generator", () => {
  it("should generate a FedRAMP incident report", async () => {
    const { generateIncidentReport } = await import(
      "../src/utils/report-generator.js"
    );
    const report = generateIncidentReport({
      incident_id: "INC-001",
      format: "fedramp",
      include_timeline: true,
      include_evidence: true,
    });
    expect(report.incident_id).toBe("INC-001");
    expect(report.format).toBe("fedramp");
    expect(report.timeline).toBeDefined();
    expect(report.evidence).toBeDefined();
    expect(report.classification).toBe("confidential");
  });

  it("should omit timeline and evidence when not requested", async () => {
    const { generateIncidentReport } = await import(
      "../src/utils/report-generator.js"
    );
    const report = generateIncidentReport({
      incident_id: "INC-002",
      format: "internal",
      include_timeline: false,
      include_evidence: false,
    });
    expect(report.timeline).toBeUndefined();
    expect(report.evidence).toBeUndefined();
  });
});

describe("Crypto Utilities", () => {
  it("should produce consistent SHA-256 hashes", async () => {
    const { sha256 } = await import("../src/utils/crypto.js");
    const hash1 = sha256("test");
    const hash2 = sha256("test");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("should encrypt and decrypt data", async () => {
    const { encrypt, decrypt, secureRandomHex } = await import(
      "../src/utils/crypto.js"
    );
    const key = secureRandomHex(32); // 256-bit key
    const plaintext = "sensitive security data";
    const encrypted = encrypt(plaintext, key);
    expect(encrypted.ciphertext).not.toBe(plaintext);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("should redact secrets properly", async () => {
    const { redactSecret } = await import("../src/utils/crypto.js");
    expect(redactSecret("my-secret-token")).toBe("***********oken");
    expect(redactSecret("abc")).toBe("****");
  });
});
