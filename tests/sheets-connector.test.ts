import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventEmitter } from "node:events";

// Mock node:https before importing the connector
vi.mock("node:https", async () => {
  const actual = await vi.importActual<typeof import("node:https")>("node:https");
  return { ...actual, request: vi.fn() };
});

// Mock node:crypto to stub out createSign so tests don't need a real RSA key
vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof import("node:crypto")>("node:crypto");
  return {
    ...actual,
    createSign: vi.fn(() => ({
      update: vi.fn(),
      sign: vi.fn(() => "mockedsignature"),
    })),
  };
});

import * as https from "node:https";
import { SheetsConnector } from "../src/connectors/sheets-connector.js";

const MOCK_SA = JSON.stringify({
  client_email: "test@project.iam.gserviceaccount.com",
  private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----",
});

function setupHttpsMock(bodies: string[]) {
  let callCount = 0;

  vi.mocked(https.request).mockImplementation(
    (_options: unknown, callback?: (res: NodeJS.ReadableStream) => void) => {
      const body = bodies[callCount % bodies.length];
      callCount++;

      const mockRes = new EventEmitter() as unknown as NodeJS.ReadableStream & EventEmitter;

      const mockReq = Object.assign(new EventEmitter(), {
        write: vi.fn(),
        end: vi.fn(() => {
          if (callback) callback(mockRes as NodeJS.ReadableStream);
          setTimeout(() => {
            mockRes.emit("data", Buffer.from(body));
            mockRes.emit("end");
          }, 0);
        }),
      });

      return mockReq as unknown as ReturnType<typeof https.request>;
    },
  );
}

describe("SheetsConnector", () => {
  const config = {
    name: "sheet1",
    type: "sheets" as const,
    spreadsheet_id: "abc123",
    sheet_name: "Sheet1",
  };

  beforeEach(() => {
    process.env["GOOGLE_SERVICE_ACCOUNT_JSON"] = MOCK_SA;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env["GOOGLE_SERVICE_ACCOUNT_JSON"];
  });

  it("connect throws if GOOGLE_SERVICE_ACCOUNT_JSON is not set", async () => {
    delete process.env["GOOGLE_SERVICE_ACCOUNT_JSON"];
    const connector = new SheetsConnector(config);
    await expect(connector.connect()).rejects.toThrow("GOOGLE_SERVICE_ACCOUNT_JSON");
  });

  it("connect throws if spreadsheet_id is missing", async () => {
    const connector = new SheetsConnector({ ...config, spreadsheet_id: "" });
    await expect(connector.connect()).rejects.toThrow("spreadsheet_id");
  });

  it("connect throws if sheet_name is missing", async () => {
    const connector = new SheetsConnector({ ...config, sheet_name: "" });
    await expect(connector.connect()).rejects.toThrow("sheet_name");
  });

  it("connect succeeds and sets isConnected to true on valid token response", async () => {
    setupHttpsMock([JSON.stringify({ access_token: "mock-token-123" })]);
    const connector = new SheetsConnector(config);
    await connector.connect();
    expect(connector.isConnected()).toBe(true);
    await connector.disconnect();
  });

  it("connect fails when token response has no access_token", async () => {
    setupHttpsMock([JSON.stringify({ error: "invalid_grant" })]);
    const connector = new SheetsConnector(config);
    await expect(connector.connect()).rejects.toThrow();
  });

  it("listTables returns sheet names", async () => {
    setupHttpsMock([
      JSON.stringify({ access_token: "tok" }),
      JSON.stringify({
        sheets: [{ properties: { title: "Sheet1" } }, { properties: { title: "Sheet2" } }],
      }),
    ]);
    const connector = new SheetsConnector(config);
    await connector.connect();
    const tables = await connector.listTables();
    expect(tables).toContain("Sheet1");
    expect(tables).toContain("Sheet2");
  });

  it("getSchema reads first row as headers", async () => {
    setupHttpsMock([
      JSON.stringify({ access_token: "tok" }),
      JSON.stringify({ values: [["id", "name", "email"]] }),
    ]);
    const connector = new SheetsConnector(config);
    await connector.connect();
    const schema = await connector.getSchema("Sheet1");
    expect(schema.map((c) => c.name)).toEqual(["id", "name", "email"]);
    expect(schema[0].normalized_type).toBe("string");
  });

  it("query returns row objects keyed by header", async () => {
    setupHttpsMock([
      JSON.stringify({ access_token: "tok" }),
      JSON.stringify({
        values: [
          ["id", "name"],
          ["1", "Alice"],
          ["2", "Bob"],
        ],
      }),
    ]);
    const connector = new SheetsConnector(config);
    await connector.connect();
    const result = await connector.query("SELECT * FROM Sheet1", 100);
    expect(result.rowCount).toBe(2);
    expect(result.rows[0]["name"]).toBe("Alice");
    expect(result.columns).toContain("id");
  });

  it("query respects LIMIT in sql", async () => {
    setupHttpsMock([
      JSON.stringify({ access_token: "tok" }),
      JSON.stringify({
        values: [
          ["id", "name"],
          ["1", "Alice"],
          ["2", "Bob"],
          ["3", "Carol"],
        ],
      }),
    ]);
    const connector = new SheetsConnector(config);
    await connector.connect();
    const result = await connector.query("SELECT * FROM Sheet1 LIMIT 1", 100);
    expect(result.rowCount).toBe(1);
    expect(result.truncated).toBe(true);
  });

  it("disconnect sets isConnected to false", async () => {
    setupHttpsMock([JSON.stringify({ access_token: "tok" })]);
    const connector = new SheetsConnector(config);
    await connector.connect();
    await connector.disconnect();
    expect(connector.isConnected()).toBe(false);
  });
});
