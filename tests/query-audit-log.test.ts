import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { QueryAuditLog, hashSql } from "../src/query-audit-log.js";
import type { AuditEntry } from "../src/query-audit-log.js";

describe("hashSql", () => {
  it("returns a 64-character hex string", () => {
    const hash = hashSql("SELECT * FROM users");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it("produces different hashes for different sql", () => {
    expect(hashSql("SELECT 1")).not.toBe(hashSql("SELECT 2"));
  });

  it("is deterministic", () => {
    const sql = "SELECT id FROM customers";
    expect(hashSql(sql)).toBe(hashSql(sql));
  });
});

describe("QueryAuditLog", () => {
  let tempDir: string;
  let logPath: string;
  let log: QueryAuditLog;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-log-test-"));
    logPath = path.join(tempDir, "audit.jsonl");
    log = new QueryAuditLog(logPath);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
    return {
      timestamp: new Date().toISOString(),
      user_id: "user1",
      source: "customers",
      sql_hash: hashSql("SELECT * FROM customers"),
      rows_returned: 10,
      duration_ms: 42,
      ...overrides,
    };
  }

  it("records an entry to the JSONL file", () => {
    const entry = makeEntry();
    log.record(entry);
    const content = fs.readFileSync(logPath, "utf-8");
    expect(content.trim()).not.toBe("");
    const parsed = JSON.parse(content.trim()) as AuditEntry;
    expect(parsed.user_id).toBe("user1");
    expect(parsed.source).toBe("customers");
  });

  it("appends multiple entries", () => {
    log.record(makeEntry({ user_id: "a" }));
    log.record(makeEntry({ user_id: "b" }));
    log.record(makeEntry({ user_id: "c" }));
    const entries = log.export();
    expect(entries).toHaveLength(3);
  });

  it("export returns empty array when file does not exist", () => {
    const emptyLog = new QueryAuditLog(path.join(tempDir, "nonexistent.jsonl"));
    expect(emptyLog.export()).toEqual([]);
  });

  it("export filters by from date", () => {
    const past = new Date("2020-01-01T00:00:00Z");
    const recent = new Date("2024-01-01T00:00:00Z");

    log.record(makeEntry({ timestamp: past.toISOString() }));
    log.record(makeEntry({ timestamp: recent.toISOString() }));

    const cutoff = new Date("2023-01-01T00:00:00Z");
    const results = log.export(cutoff);
    expect(results).toHaveLength(1);
    expect(results[0].timestamp).toBe(recent.toISOString());
  });

  it("export filters by to date", () => {
    const past = new Date("2020-01-01T00:00:00Z");
    const recent = new Date("2024-01-01T00:00:00Z");

    log.record(makeEntry({ timestamp: past.toISOString() }));
    log.record(makeEntry({ timestamp: recent.toISOString() }));

    const cutoff = new Date("2023-01-01T00:00:00Z");
    const results = log.export(undefined, cutoff);
    expect(results).toHaveLength(1);
    expect(results[0].timestamp).toBe(past.toISOString());
  });

  it("export filters by from and to range", () => {
    const d1 = new Date("2020-01-01T00:00:00Z");
    const d2 = new Date("2022-06-01T00:00:00Z");
    const d3 = new Date("2024-01-01T00:00:00Z");

    log.record(makeEntry({ timestamp: d1.toISOString() }));
    log.record(makeEntry({ timestamp: d2.toISOString() }));
    log.record(makeEntry({ timestamp: d3.toISOString() }));

    const from = new Date("2021-01-01T00:00:00Z");
    const to = new Date("2023-01-01T00:00:00Z");
    const results = log.export(from, to);
    expect(results).toHaveLength(1);
    expect(results[0].timestamp).toBe(d2.toISOString());
  });

  it("creates parent directory if it does not exist", () => {
    const deepPath = path.join(tempDir, "nested", "dir", "audit.jsonl");
    const deepLog = new QueryAuditLog(deepPath);
    deepLog.record(makeEntry());
    expect(fs.existsSync(deepPath)).toBe(true);
  });
});
