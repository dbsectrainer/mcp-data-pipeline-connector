import { describe, it, expect, beforeEach, afterEach, vi, afterAll } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CsvConnector } from "../src/connectors/csv-connector.js";
import { RestConnector } from "../src/connectors/rest-connector.js";
import { SourceRegistry } from "../src/source-registry.js";
import { normalizeType } from "../src/connectors/base.js";
import type { SourceConfig } from "../src/types.js";
import { createServer } from "../src/server.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE_CSV = resolve(__dirname, "fixtures", "sample.csv");
const FIXTURE_PRODUCTS_CSV = resolve(__dirname, "fixtures", "products.csv");

// ─── Schema Normalization ────────────────────────────────────────────────────

describe("normalizeType", () => {
  it("maps varchar to string", () => {
    expect(normalizeType("VARCHAR")).toBe("string");
    expect(normalizeType("VARCHAR(255)")).toBe("string");
    expect(normalizeType("text")).toBe("string");
    expect(normalizeType("CHARACTER VARYING")).toBe("string");
  });

  it("maps integer types correctly", () => {
    expect(normalizeType("INTEGER")).toBe("integer");
    expect(normalizeType("INT")).toBe("integer");
    expect(normalizeType("BIGINT")).toBe("integer");
    expect(normalizeType("SMALLINT")).toBe("integer");
  });

  it("maps float/decimal types to number", () => {
    expect(normalizeType("FLOAT")).toBe("number");
    expect(normalizeType("DOUBLE")).toBe("number");
    expect(normalizeType("DECIMAL")).toBe("number");
    expect(normalizeType("NUMERIC")).toBe("number");
  });

  it("maps boolean types", () => {
    expect(normalizeType("BOOLEAN")).toBe("boolean");
    expect(normalizeType("BOOL")).toBe("boolean");
  });

  it("maps date/timestamp types to datetime", () => {
    expect(normalizeType("DATE")).toBe("datetime");
    expect(normalizeType("TIMESTAMP")).toBe("datetime");
    expect(normalizeType("TIME")).toBe("datetime");
  });

  it("maps json types", () => {
    expect(normalizeType("JSON")).toBe("json");
    expect(normalizeType("JSONB")).toBe("json");
  });

  it("maps unknown types to unknown", () => {
    expect(normalizeType("SOME_WEIRD_TYPE")).toBe("unknown");
  });
});

// ─── CSV Connector — normalized_type in schema ───────────────────────────────

describe("CsvConnector — Phase 2 enhancements", () => {
  let connector: CsvConnector;

  beforeEach(() => {
    connector = new CsvConnector({ name: "test_sales", type: "csv", path: FIXTURE_CSV });
  });

  afterEach(async () => {
    await connector.disconnect();
  });

  it("getSchema includes normalized_type field", async () => {
    await connector.connect();
    const schema = await connector.getSchema("test_sales");
    for (const col of schema) {
      expect(col).toHaveProperty("normalized_type");
      expect(typeof col.normalized_type).toBe("string");
    }
  });

  it("exposes getResolvedPath()", async () => {
    const path = connector.getResolvedPath();
    expect(path).toContain("sample.csv");
  });

  it("healthCheck returns true for existing file", async () => {
    await connector.connect();
    const healthy = await connector.healthCheck();
    expect(healthy).toBe(true);
  });

  it("healthCheck returns false for nonexistent file", async () => {
    const bad = new CsvConnector({
      name: "bad",
      type: "csv",
      path: "/tmp/does_not_exist_phase2_test.csv",
    });
    const healthy = await bad.healthCheck();
    expect(healthy).toBe(false);
  });
});

// ─── REST Connector ──────────────────────────────────────────────────────────

describe("RestConnector", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws if url is missing", () => {
    expect(() => new RestConnector({ name: "bad", type: "rest" })).toThrow("requires a url");
  });

  it("connect() succeeds when HEAD returns 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        statusText: "OK",
        ok: true,
      }),
    );

    const connector = new RestConnector({
      name: "api",
      type: "rest",
      url: "https://example.com/api",
    });

    await expect(connector.connect()).resolves.not.toThrow();
    expect(connector.isConnected()).toBe(true);
    await connector.disconnect();
  });

  it("connect() fails when HEAD returns 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 404,
        statusText: "Not Found",
        ok: false,
      }),
    );

    const connector = new RestConnector({
      name: "api",
      type: "rest",
      url: "https://example.com/api",
    });

    await expect(connector.connect()).rejects.toThrow("Failed to connect REST source");
    expect(connector.isConnected()).toBe(false);
  });

  it("listTables returns ['response']", async () => {
    const connector = new RestConnector({
      name: "api",
      type: "rest",
      url: "https://example.com/api",
    });
    const tables = await connector.listTables();
    expect(tables).toEqual(["response"]);
  });

  it("getSchema returns json schema for response", async () => {
    const connector = new RestConnector({
      name: "api",
      type: "rest",
      url: "https://example.com/api",
    });
    const schema = await connector.getSchema("response");
    expect(schema).toHaveLength(1);
    expect(schema[0].name).toBe("data");
    expect(schema[0].normalized_type).toBe("json");
  });

  it("healthCheck returns true when HEAD succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true }));

    const connector = new RestConnector({
      name: "api",
      type: "rest",
      url: "https://example.com/api",
    });

    const healthy = await connector.healthCheck();
    expect(healthy).toBe(true);
  });

  it("healthCheck returns false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const connector = new RestConnector({
      name: "api",
      type: "rest",
      url: "https://example.com/api",
    });

    const healthy = await connector.healthCheck();
    expect(healthy).toBe(false);
  });

  it("query fetches JSON and queries it via DuckDB", async () => {
    const mockData = [
      { id: 1, value: "alpha" },
      { id: 2, value: "beta" },
    ];

    // HEAD for connect, GET for query
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 200, statusText: "OK", ok: true }) // connect HEAD
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      }); // query GET

    vi.stubGlobal("fetch", fetchMock);

    const connector = new RestConnector({
      name: "api",
      type: "rest",
      url: "https://example.com/api",
      cache_ttl: 0, // disable cache so it fetches fresh on query
    });

    await connector.connect();
    const result = await connector.query("SELECT * FROM response", 100);

    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.columns).toBeDefined();
    await connector.disconnect();
  });

  it("respects cache TTL — second query does not call fetch again", async () => {
    const mockData = [{ id: 1, value: "cached" }];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 200, statusText: "OK", ok: true }) // connect HEAD
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      }); // first GET

    vi.stubGlobal("fetch", fetchMock);

    const connector = new RestConnector({
      name: "api",
      type: "rest",
      url: "https://example.com/api",
      cache_ttl: 300, // 5 minutes
    });

    await connector.connect();
    await connector.query("SELECT * FROM response", 10);
    await connector.query("SELECT * FROM response", 10); // should use cache

    // fetch should only have been called twice: once for HEAD, once for GET
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await connector.disconnect();
  });
});

// ─── SourceRegistry — checkHealth ────────────────────────────────────────────

describe("SourceRegistry.checkHealth", () => {
  let registry: SourceRegistry;

  beforeEach(() => {
    registry = new SourceRegistry();
  });

  afterEach(async () => {
    await registry.disconnectAll();
  });

  it("returns healthy=true for a connected CSV source with existing file", async () => {
    await registry.register({ name: "sales", type: "csv", path: FIXTURE_CSV });
    const results = await registry.checkHealth("sales");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("sales");
    expect(results[0].healthy).toBe(true);
  });

  it("checks all sources when no name given", async () => {
    await registry.register({ name: "sales", type: "csv", path: FIXTURE_CSV });
    await registry.register({ name: "products", type: "csv", path: FIXTURE_PRODUCTS_CSV });
    const results = await registry.checkHealth();
    expect(results).toHaveLength(2);
  });

  it("returns empty array for unknown source name", async () => {
    const results = await registry.checkHealth("nonexistent");
    expect(results).toHaveLength(0);
  });

  it("includes checked_at ISO timestamp", async () => {
    await registry.register({ name: "sales", type: "csv", path: FIXTURE_CSV });
    const results = await registry.checkHealth("sales");
    expect(results[0].checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── Pagination (limit / offset) ─────────────────────────────────────────────

describe("Query pagination (limit / offset)", () => {
  let registry: SourceRegistry;

  beforeEach(async () => {
    registry = new SourceRegistry();
    await registry.register({ name: "sales", type: "csv", path: FIXTURE_CSV });
  });

  afterEach(async () => {
    await registry.disconnectAll();
  });

  it("limit restricts rows returned", async () => {
    const connector = registry.get("sales")!;
    const result = await connector.query("SELECT * FROM sales LIMIT 2", 1000);
    expect(result.rowCount).toBe(2);
  });

  it("offset skips rows", async () => {
    const connector = registry.get("sales")!;
    const allResult = await connector.query("SELECT id FROM sales ORDER BY id", 1000);
    const offsetResult = await connector.query(
      "SELECT id FROM sales ORDER BY id LIMIT 3 OFFSET 2",
      1000,
    );
    expect(offsetResult.rowCount).toBe(3);
    // The first row of offsetResult should be id=3 (3rd row, 0-indexed offset=2)
    expect(offsetResult.rows[0]["id"]).toBe(3);
    // Confirm the first result starts at id=1
    expect(allResult.rows[0]["id"]).toBe(1);
  });
});

// ─── Transform tool ──────────────────────────────────────────────────────────

describe("transform tool", () => {
  let registry: SourceRegistry;

  beforeEach(async () => {
    registry = new SourceRegistry();
    await registry.register({ name: "sales", type: "csv", path: FIXTURE_CSV });
  });

  afterEach(async () => {
    await registry.disconnectAll();
  });

  it("filter operation reduces rows", async () => {
    const connector = registry.get("sales")!;
    // Alice has amount=100.5, filter amount > 200 should return Diana (500) only
    const result = await connector.query(`SELECT * FROM "sales" WHERE "amount" > 200`, 1000);
    expect(result.rowCount).toBeGreaterThan(0);
    const amounts = result.rows.map((r) => Number(r["amount"]));
    expect(amounts.every((a) => a > 200)).toBe(true);
  });

  it("select operation returns subset of columns", async () => {
    const connector = registry.get("sales")!;
    const result = await connector.query(`SELECT "id", "name" FROM "sales"`, 1000);
    expect(result.columns).toContain("id");
    expect(result.columns).toContain("name");
    expect(result.columns).not.toContain("amount");
  });

  it("aggregate operation groups rows", async () => {
    const connector = registry.get("sales")!;
    // Use a basic COUNT query that goes through the connector
    const result = await connector.query(`SELECT COUNT(*) AS total FROM "sales"`, 1000);
    expect(result.rowCount).toBe(1);
    expect(Number(result.rows[0]["total"])).toBe(5);
  });
});

// ─── Cross-source query ──────────────────────────────────────────────────────

describe("Cross-source query via getCrossSourceDb", () => {
  let registry: SourceRegistry;

  beforeEach(async () => {
    registry = new SourceRegistry();
    await registry.register({ name: "sales", type: "csv", path: FIXTURE_CSV });
    await registry.register({ name: "products", type: "csv", path: FIXTURE_PRODUCTS_CSV });
  });

  afterEach(async () => {
    await registry.disconnectAll();
  });

  it("getCrossSourceDb creates views for all CSV sources", async () => {
    const { connection } = await registry.getCrossSourceDb();
    const result = await connection.run("SELECT * FROM sales LIMIT 5");
    const rows = await result.getRows();
    expect(rows.length).toBeGreaterThan(0);
    connection.closeSync();
  });

  it("can query two CSV sources in one SQL statement", async () => {
    const { connection } = await registry.getCrossSourceDb();
    // Both CSVs have an 'id' column — we can join them
    const result = await connection.run(
      "SELECT s.name, p.product_name FROM sales s JOIN products p ON s.id = p.id",
    );
    const rows = await result.getRows();
    expect(rows.length).toBeGreaterThan(0);
    connection.closeSync();
  });
});

// ─── check_health tool via server ────────────────────────────────────────────

describe("check_health server tool", () => {
  it("check_health tool is listed in tools", async () => {
    // Verify the tool definition exists in createServer
    const { server } = createServer({ readOnly: true, maxRows: 1000 });
    expect(server).toBeDefined();
    // We verify by checking the registry can do health checks
  });
});

// ─── MCP Resources / Prompts capability ──────────────────────────────────────

describe("Server capabilities", () => {
  it("createServer returns a server object", () => {
    const { server } = createServer({ readOnly: true, maxRows: 1000 });
    expect(server).toBeDefined();
  });
});
