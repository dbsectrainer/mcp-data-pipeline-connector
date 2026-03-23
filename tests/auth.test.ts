import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { createAuthMiddleware } from "../src/auth.js";
import * as crypto from "node:crypto";

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeRes(): {
  status: (code: number) => { json: (body: unknown) => void };
  statusCode: number;
  body: unknown;
} {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return {
        json(body: unknown) {
          res.body = body;
        },
      };
    },
  };
  return res;
}

function makeNext(): { called: boolean; fn: NextFunction } {
  const next = {
    called: false,
    fn: (() => {
      next.called = true;
    }) as NextFunction,
  };
  return next;
}

describe("createAuthMiddleware — no env vars", () => {
  beforeEach(() => {
    delete process.env["MCP_API_KEY"];
    delete process.env["MCP_JWT_SECRET"];
  });

  it("passes through when neither env var is set", () => {
    const mw = createAuthMiddleware();
    const next = makeNext();
    mw(makeReq(), makeRes() as unknown as Response, next.fn);
    expect(next.called).toBe(true);
  });
});

describe("createAuthMiddleware — MCP_API_KEY", () => {
  beforeEach(() => {
    process.env["MCP_API_KEY"] = "secret-key";
    delete process.env["MCP_JWT_SECRET"];
  });

  afterEach(() => {
    delete process.env["MCP_API_KEY"];
  });

  it("returns 401 when X-API-Key header is missing", () => {
    const mw = createAuthMiddleware();
    const res = makeRes();
    const next = makeNext();
    mw(makeReq(), res as unknown as Response, next.fn);
    expect(res.statusCode).toBe(401);
    expect(next.called).toBe(false);
  });

  it("returns 401 when X-API-Key header is wrong", () => {
    const mw = createAuthMiddleware();
    const res = makeRes();
    const next = makeNext();
    mw(makeReq({ "x-api-key": "wrong-key" }), res as unknown as Response, next.fn);
    expect(res.statusCode).toBe(401);
    expect(next.called).toBe(false);
  });

  it("passes through when X-API-Key header matches", () => {
    const mw = createAuthMiddleware();
    const next = makeNext();
    mw(makeReq({ "x-api-key": "secret-key" }), makeRes() as unknown as Response, next.fn);
    expect(next.called).toBe(true);
  });
});

describe("createAuthMiddleware — MCP_JWT_SECRET", () => {
  const secret = "test-jwt-secret";

  beforeEach(() => {
    delete process.env["MCP_API_KEY"];
    process.env["MCP_JWT_SECRET"] = secret;
  });

  afterEach(() => {
    delete process.env["MCP_JWT_SECRET"];
  });

  function makeValidJwt(): string {
    const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const p = Buffer.from(JSON.stringify({ sub: "user1" })).toString("base64url");
    const sig = crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
    return `${h}.${p}.${sig}`;
  }

  it("returns 401 when Authorization header is missing", () => {
    const mw = createAuthMiddleware();
    const res = makeRes();
    const next = makeNext();
    mw(makeReq(), res as unknown as Response, next.fn);
    expect(res.statusCode).toBe(401);
    expect(next.called).toBe(false);
  });

  it("returns 401 for malformed JWT (wrong part count)", () => {
    const mw = createAuthMiddleware();
    const res = makeRes();
    const next = makeNext();
    mw(makeReq({ authorization: "Bearer notajwt" }), res as unknown as Response, next.fn);
    expect(res.statusCode).toBe(401);
    expect(next.called).toBe(false);
  });

  it("returns 401 for JWT with bad signature", () => {
    const mw = createAuthMiddleware();
    const res = makeRes();
    const next = makeNext();
    const h = Buffer.from("{}").toString("base64url");
    const p = Buffer.from("{}").toString("base64url");
    const badJwt = `${h}.${p}.badsig`;
    mw(makeReq({ authorization: `Bearer ${badJwt}` }), res as unknown as Response, next.fn);
    expect(res.statusCode).toBe(401);
    expect(next.called).toBe(false);
  });

  it("passes through for valid JWT", () => {
    const mw = createAuthMiddleware();
    const next = makeNext();
    const jwt = makeValidJwt();
    mw(makeReq({ authorization: `Bearer ${jwt}` }), makeRes() as unknown as Response, next.fn);
    expect(next.called).toBe(true);
  });
});
