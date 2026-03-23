import { describe, it, expect } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { createRateLimiter } from "../src/rate-limiter.js";

function makeReq(ip = "127.0.0.1", apiKey?: string): Request {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  return {
    headers,
    ip,
    socket: { remoteAddress: ip },
  } as unknown as Request;
}

function makeRes(): {
  statusCode: number;
  body: unknown;
  status: (code: number) => { json: (b: unknown) => void };
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

describe("createRateLimiter", () => {
  it("passes requests under the limit", () => {
    const mw = createRateLimiter(3, 60000);
    const req = makeReq("10.0.0.1");

    for (let i = 0; i < 3; i++) {
      const next = makeNext();
      const res = makeRes();
      mw(req, res as unknown as Response, next.fn);
      expect(next.called).toBe(true);
      expect(res.statusCode).toBe(200);
    }
  });

  it("returns 429 when limit is exceeded", () => {
    const mw = createRateLimiter(2, 60000);
    const req = makeReq("10.0.0.2");

    for (let i = 0; i < 2; i++) {
      const next = makeNext();
      mw(req, makeRes() as unknown as Response, next.fn);
    }

    const res = makeRes();
    const next = makeNext();
    mw(req, res as unknown as Response, next.fn);
    expect(res.statusCode).toBe(429);
    expect(next.called).toBe(false);
    expect((res.body as { error: string }).error).toBe("Rate limit exceeded");
  });

  it("treats different IPs independently", () => {
    const mw = createRateLimiter(1, 60000);

    const req1 = makeReq("192.168.1.1");
    const req2 = makeReq("192.168.1.2");

    const n1 = makeNext();
    mw(req1, makeRes() as unknown as Response, n1.fn);
    expect(n1.called).toBe(true);

    const n2 = makeNext();
    mw(req2, makeRes() as unknown as Response, n2.fn);
    expect(n2.called).toBe(true);
  });

  it("uses API key as identity when present", () => {
    const mw = createRateLimiter(1, 60000);

    const req1 = makeReq("127.0.0.1", "key-abc");
    const req2 = makeReq("127.0.0.1", "key-xyz");

    // key-abc gets one request
    const n1 = makeNext();
    mw(req1, makeRes() as unknown as Response, n1.fn);
    expect(n1.called).toBe(true);

    // key-xyz also gets one request (different key)
    const n2 = makeNext();
    mw(req2, makeRes() as unknown as Response, n2.fn);
    expect(n2.called).toBe(true);

    // key-abc second request should be rejected
    const res = makeRes();
    const n3 = makeNext();
    mw(req1, res as unknown as Response, n3.fn);
    expect(res.statusCode).toBe(429);
    expect(n3.called).toBe(false);
  });

  it("resets after window expires", async () => {
    const windowMs = 50; // very short window for testing
    const mw = createRateLimiter(1, windowMs);
    const req = makeReq("10.0.0.5");

    // Use up the limit
    const n1 = makeNext();
    mw(req, makeRes() as unknown as Response, n1.fn);
    expect(n1.called).toBe(true);

    // Should be over limit
    const res1 = makeRes();
    mw(req, res1 as unknown as Response, makeNext().fn);
    expect(res1.statusCode).toBe(429);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, windowMs + 10));

    // Should pass again
    const n2 = makeNext();
    const res2 = makeRes();
    mw(req, res2 as unknown as Response, n2.fn);
    expect(n2.called).toBe(true);
    expect(res2.statusCode).toBe(200);
  });
});
