import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventEmitter } from "node:events";

// Mock node:https before importing the connector
vi.mock("node:https", async () => {
  const actual = await vi.importActual<typeof import("node:https")>("node:https");
  return { ...actual, request: vi.fn() };
});

import * as https from "node:https";
import { AirtableConnector } from "../src/connectors/airtable-connector.js";

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

describe("AirtableConnector", () => {
  const config = {
    name: "crm",
    type: "airtable" as const,
    base_id: "appXYZ123",
    table_name: "Contacts",
  };

  beforeEach(() => {
    process.env["AIRTABLE_API_KEY"] = "mock-airtable-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env["AIRTABLE_API_KEY"];
  });

  it("connect throws if AIRTABLE_API_KEY is not set", async () => {
    delete process.env["AIRTABLE_API_KEY"];
    const connector = new AirtableConnector(config);
    await expect(connector.connect()).rejects.toThrow("AIRTABLE_API_KEY");
  });

  it("connect throws if base_id is missing", async () => {
    const connector = new AirtableConnector({ ...config, base_id: "" });
    await expect(connector.connect()).rejects.toThrow("base_id");
  });

  it("connect throws if table_name is missing", async () => {
    const connector = new AirtableConnector({ ...config, table_name: "" });
    await expect(connector.connect()).rejects.toThrow("table_name");
  });

  it("connect succeeds and sets isConnected to true", async () => {
    const connector = new AirtableConnector(config);
    await connector.connect();
    expect(connector.isConnected()).toBe(true);
    await connector.disconnect();
  });

  it("disconnect sets isConnected to false", async () => {
    const connector = new AirtableConnector(config);
    await connector.connect();
    await connector.disconnect();
    expect(connector.isConnected()).toBe(false);
  });

  it("listTables returns table names from metadata API", async () => {
    setupHttpsMock([
      JSON.stringify({
        tables: [
          { id: "tblA", name: "Contacts" },
          { id: "tblB", name: "Deals" },
        ],
      }),
    ]);

    const connector = new AirtableConnector(config);
    await connector.connect();
    const tables = await connector.listTables();
    expect(tables).toContain("Contacts");
    expect(tables).toContain("Deals");
  });

  it("listTables falls back to config table_name on error", async () => {
    // Return invalid JSON to trigger catch block
    setupHttpsMock(["INVALID JSON"]);

    const connector = new AirtableConnector(config);
    await connector.connect();
    const tables = await connector.listTables();
    expect(tables).toContain("Contacts");
  });

  it("getSchema infers columns from first record fields", async () => {
    setupHttpsMock([
      JSON.stringify({
        records: [
          {
            id: "recABC",
            fields: { Name: "Alice", Email: "alice@example.com", Phone: "555-1234" },
          },
        ],
      }),
    ]);

    const connector = new AirtableConnector(config);
    await connector.connect();
    const schema = await connector.getSchema("Contacts");
    const names = schema.map((c) => c.name);
    expect(names).toContain("Name");
    expect(names).toContain("Email");
  });

  it("query returns row objects with field values", async () => {
    setupHttpsMock([
      JSON.stringify({
        records: [
          { id: "rec1", fields: { Name: "Alice", Email: "a@a.com" } },
          { id: "rec2", fields: { Name: "Bob", Email: "b@b.com" } },
        ],
      }),
    ]);

    const connector = new AirtableConnector(config);
    await connector.connect();
    const result = await connector.query("SELECT * FROM Contacts", 100);
    expect(result.rowCount).toBe(2);
    expect(result.columns).toContain("_id");
    expect(result.columns).toContain("Name");
    expect(result.rows[0]["_id"]).toBe("rec1");
    expect(result.rows[0]["Name"]).toBe("Alice");
  });

  it("query respects LIMIT in sql", async () => {
    setupHttpsMock([
      JSON.stringify({
        records: [
          { id: "rec1", fields: { Name: "Alice" } },
          { id: "rec2", fields: { Name: "Bob" } },
          { id: "rec3", fields: { Name: "Carol" } },
        ],
      }),
    ]);

    const connector = new AirtableConnector(config);
    await connector.connect();
    const result = await connector.query("SELECT * FROM Contacts LIMIT 2", 100);
    expect(result.rowCount).toBe(2);
    expect(result.truncated).toBe(true);
  });

  it("query pages through results when offset is present", async () => {
    let callCount = 0;
    const pages = [
      JSON.stringify({
        records: [{ id: "rec1", fields: { Name: "Alice" } }],
        offset: "page2",
      }),
      JSON.stringify({
        records: [{ id: "rec2", fields: { Name: "Bob" } }],
      }),
    ];

    vi.mocked(https.request).mockImplementation(
      (_options: unknown, callback?: (res: NodeJS.ReadableStream) => void) => {
        const body = pages[callCount % pages.length];
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

    const connector = new AirtableConnector(config);
    await connector.connect();
    const result = await connector.query("SELECT * FROM Contacts", 100);
    expect(result.rowCount).toBe(2);
  });
});
