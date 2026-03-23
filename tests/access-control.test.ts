import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { applyAccessControl } from "../src/access-control.js";

describe("applyAccessControl", () => {
  let tempDir: string;
  let policyPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "access-control-test-"));
    policyPath = path.join(tempDir, "policy.yaml");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns sql unchanged when policy file is missing", () => {
    const sql = "SELECT id, name, ssn FROM customers";
    const result = applyAccessControl(sql, "customers", {}, "/nonexistent/path.yaml");
    expect(result).toBe(sql);
  });

  it("returns sql unchanged when no policy matches the source", () => {
    const yaml = `
policies:
  - source: "other_source"
    deny_columns: ["secret"]
`;
    fs.writeFileSync(policyPath, yaml, "utf-8");
    const sql = "SELECT id, name, secret FROM customers";
    const result = applyAccessControl(sql, "customers", {}, policyPath);
    expect(result).toBe(sql);
  });

  it("removes denied columns from SELECT list", () => {
    const yaml = `
policies:
  - source: "customers"
    deny_columns: ["ssn", "credit_card"]
`;
    fs.writeFileSync(policyPath, yaml, "utf-8");
    const sql = "SELECT id, name, ssn, credit_card FROM customers";
    const result = applyAccessControl(sql, "customers", {}, policyPath);
    expect(result).not.toMatch(/\bssn\b/i);
    expect(result).not.toMatch(/\bcredit_card\b/i);
    expect(result).toContain("id");
    expect(result).toContain("name");
  });

  it("appends WHERE clause when row_filter is set and no existing WHERE", () => {
    const yaml = `
policies:
  - source: "customers"
    row_filter: "region = 'us'"
`;
    fs.writeFileSync(policyPath, yaml, "utf-8");
    const sql = "SELECT id, name FROM customers";
    const result = applyAccessControl(sql, "customers", {}, policyPath);
    expect(result).toContain("WHERE");
    expect(result).toContain("region = 'us'");
  });

  it("inserts row_filter before existing WHERE clause using AND", () => {
    const yaml = `
policies:
  - source: "customers"
    row_filter: "region = 'us'"
`;
    fs.writeFileSync(policyPath, yaml, "utf-8");
    const sql = "SELECT id, name FROM customers WHERE active = true";
    const result = applyAccessControl(sql, "customers", {}, policyPath);
    expect(result).toContain("region = 'us'");
    expect(result).toContain("active = true");
    expect(result.toLowerCase().indexOf("where")).toBeLessThan(
      result.toLowerCase().lastIndexOf("and"),
    );
  });

  it("applies both column and row filtering together", () => {
    const yaml = `
policies:
  - source: "orders"
    deny_columns: ["internal_notes"]
    row_filter: "status = 'active'"
`;
    fs.writeFileSync(policyPath, yaml, "utf-8");
    const sql = "SELECT id, amount, internal_notes FROM orders";
    const result = applyAccessControl(sql, "orders", {}, policyPath);
    expect(result).not.toMatch(/\binternal_notes\b/i);
    expect(result).toContain("status = 'active'");
  });

  it("inserts row_filter before ORDER BY when no WHERE exists", () => {
    const yaml = `
policies:
  - source: "customers"
    row_filter: "region = 'us'"
`;
    fs.writeFileSync(policyPath, yaml, "utf-8");
    const sql = "SELECT id FROM customers ORDER BY id";
    const result = applyAccessControl(sql, "customers", {}, policyPath);
    expect(result).toContain("WHERE region = 'us'");
    expect(result).toContain("ORDER BY");
    const whereIdx = result.toUpperCase().indexOf("WHERE");
    const orderIdx = result.toUpperCase().indexOf("ORDER BY");
    expect(whereIdx).toBeLessThan(orderIdx);
  });
});
