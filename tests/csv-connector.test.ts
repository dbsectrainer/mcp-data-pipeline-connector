import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CsvConnector } from "../src/connectors/csv-connector.js";
import type { SourceConfig } from "../src/types.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE_CSV = resolve(__dirname, "fixtures", "sample.csv");

function makeConfig(overrides: Partial<SourceConfig> = {}): SourceConfig {
  return {
    name: "test_sales",
    type: "csv",
    path: FIXTURE_CSV,
    ...overrides,
  };
}

describe("CsvConnector", () => {
  let connector: CsvConnector;

  beforeEach(() => {
    connector = new CsvConnector(makeConfig());
  });

  afterEach(async () => {
    await connector.disconnect();
  });

  it("should throw if path is missing", () => {
    expect(() => new CsvConnector({ name: "bad", type: "csv" })).toThrow("requires a path");
  });

  it("connects without error", async () => {
    await expect(connector.connect()).resolves.not.toThrow();
    expect(connector.isConnected()).toBe(true);
  });

  it("listTables returns the source name as the table", async () => {
    await connector.connect();
    const tables = await connector.listTables();
    expect(tables).toEqual(["test_sales"]);
  });

  it("getSchema returns column names and normalized types", async () => {
    await connector.connect();
    const schema = await connector.getSchema("test_sales");
    const colNames = schema.map((c) => c.name);

    expect(colNames).toContain("id");
    expect(colNames).toContain("name");
    expect(colNames).toContain("amount");
    expect(colNames).toContain("created_at");

    // All types should be normalized strings (Phase 2 expanded set)
    const validTypes = new Set([
      "string",
      "integer",
      "number",
      "boolean",
      "date",
      "datetime",
      "json",
      "unknown",
    ]);
    for (const col of schema) {
      expect(validTypes.has(col.type)).toBe(true);
    }
  });

  it("query returns rows matching the fixture data", async () => {
    await connector.connect();
    const result = await connector.query("SELECT * FROM test_sales", 100);

    expect(result.rowCount).toBe(5);
    expect(result.truncated).toBe(false);
    expect(result.columns).toContain("name");

    const names = result.rows.map((r) => r["name"] as string);
    expect(names).toContain("Alice");
    expect(names).toContain("Eve");
  });

  it("query respects max_rows and sets truncated=true when over limit", async () => {
    await connector.connect();
    const result = await connector.query("SELECT * FROM test_sales", 3);

    expect(result.rowCount).toBe(3);
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(3);
  });

  it("query respects existing LIMIT clause", async () => {
    await connector.connect();
    const result = await connector.query("SELECT * FROM test_sales LIMIT 2", 100);

    expect(result.rowCount).toBe(2);
    expect(result.truncated).toBe(false);
  });

  it("query returns only requested columns", async () => {
    await connector.connect();
    const result = await connector.query("SELECT id, name FROM test_sales ORDER BY id", 100);

    expect(result.columns).toEqual(["id", "name"]);
    expect(result.rows[0]).toHaveProperty("name");
    expect(result.rows[0]).not.toHaveProperty("amount");
  });

  it("isConnected returns false before connect", () => {
    expect(connector.isConnected()).toBe(false);
  });

  it("isConnected returns false after disconnect", async () => {
    await connector.connect();
    expect(connector.isConnected()).toBe(true);
    await connector.disconnect();
    expect(connector.isConnected()).toBe(false);
  });
});
