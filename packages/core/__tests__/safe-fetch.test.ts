// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";
import { SafeFetchError, safeFetch } from "../src/safe-fetch";

const okHtml = (body = "<html>ok</html>"): Response =>
  new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

const redirect = (location: string, status = 302): Response =>
  new Response(null, { status, headers: { location } });

describe("safeFetch — URL validation", () => {
  it("rejects http URLs", async () => {
    await expect(
      safeFetch("http://example.com", {
        fetchImpl: vi.fn(),
        resolveHost: async () => ["1.1.1.1"],
      })
    ).rejects.toMatchObject({ code: "BAD_SCHEME" });
  });

  it("rejects URLs with embedded credentials", async () => {
    await expect(
      safeFetch("https://user:pass@example.com", {
        fetchImpl: vi.fn(),
        resolveHost: async () => ["1.1.1.1"],
      })
    ).rejects.toMatchObject({ code: "BAD_SCHEME" });
  });

  it("rejects malformed URLs", async () => {
    await expect(safeFetch("::::not-a-url")).rejects.toMatchObject({ code: "INVALID_URL" });
  });

  it("blocks literal loopback IP", async () => {
    await expect(
      safeFetch("https://127.0.0.1/", {
        fetchImpl: vi.fn(),
        resolveHost: async () => {
          throw new Error("should not resolve");
        },
      })
    ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("blocks AWS metadata IP", async () => {
    await expect(
      safeFetch("https://169.254.169.254/latest/meta-data/", {
        fetchImpl: vi.fn(),
        resolveHost: async () => {
          throw new Error("should not resolve");
        },
      })
    ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("blocks RFC1918 ranges (10/8, 192.168/16, 172.16/12)", async () => {
    for (const ip of ["10.0.0.1", "192.168.1.1", "172.16.5.5", "172.31.255.254"]) {
      await expect(
        safeFetch(`https://${ip}/`, {
          fetchImpl: vi.fn(),
          resolveHost: async () => [ip],
        })
      ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
    }
  });

  it("blocks hostnames that resolve to private IPs", async () => {
    await expect(
      safeFetch("https://attacker.example.com/", {
        fetchImpl: vi.fn(),
        resolveHost: async () => ["10.0.0.5"],
      })
    ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("blocks IPv6 loopback ::1", async () => {
    await expect(
      safeFetch("https://[::1]/", {
        fetchImpl: vi.fn(),
        resolveHost: async () => {
          throw new Error("should not resolve");
        },
      })
    ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("blocks IPv4-mapped IPv6 loopback ::ffff:127.0.0.1", async () => {
    await expect(
      safeFetch("https://example.com/", {
        fetchImpl: vi.fn(),
        resolveHost: async () => ["::ffff:127.0.0.1"],
      })
    ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("fails when DNS returns no records", async () => {
    await expect(
      safeFetch("https://nx.example.com/", {
        fetchImpl: vi.fn(),
        resolveHost: async () => [],
      })
    ).rejects.toMatchObject({ code: "DNS_FAILURE" });
  });
});

describe("safeFetch — happy path", () => {
  it("returns body + content-type for a normal https GET", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okHtml("<h1>hello</h1>"));
    const result = await safeFetch("https://example.com/", {
      fetchImpl,
      resolveHost: async () => ["93.184.216.34"],
    });
    expect(result.status).toBe(200);
    expect(result.contentType).toBe("text/html");
    expect(result.body).toBe("<h1>hello</h1>");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects disallowed content-types", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("binary", {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      })
    );
    await expect(
      safeFetch("https://example.com/", {
        fetchImpl,
        resolveHost: async () => ["1.1.1.1"],
      })
    ).rejects.toMatchObject({ code: "BAD_CONTENT_TYPE" });
  });

  it("enforces response size cap", async () => {
    const huge = "x".repeat(2_000_001);
    const fetchImpl = vi.fn().mockResolvedValue(okHtml(huge));
    await expect(
      safeFetch("https://example.com/", {
        fetchImpl,
        resolveHost: async () => ["1.1.1.1"],
        maxBytes: 2_000_000,
      })
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  });
});

describe("safeFetch — redirects", () => {
  it("follows a single redirect, re-validating the target", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(redirect("https://final.example.com/"))
      .mockResolvedValueOnce(okHtml("final"));
    const result = await safeFetch("https://start.example.com/", {
      fetchImpl,
      resolveHost: async () => ["8.8.8.8"],
    });
    expect(result.body).toBe("final");
    expect(result.finalUrl).toBe("https://final.example.com/");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("blocks a redirect target that resolves to a private IP", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(redirect("https://internal.example.com/"));
    const resolveHost = vi
      .fn()
      .mockResolvedValueOnce(["8.8.8.8"])
      .mockResolvedValueOnce(["10.0.0.7"]);
    await expect(
      safeFetch("https://start.example.com/", { fetchImpl, resolveHost })
    ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("fails after exceeding the redirect cap", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(redirect("https://loop.example.com/"));
    await expect(
      safeFetch("https://loop.example.com/", {
        fetchImpl,
        resolveHost: async () => ["8.8.8.8"],
        maxRedirects: 2,
      })
    ).rejects.toMatchObject({ code: "TOO_MANY_REDIRECTS" });
  });

  it("rejects a redirect downgrading to http", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(redirect("http://example.com/"));
    await expect(
      safeFetch("https://example.com/", {
        fetchImpl,
        resolveHost: async () => ["8.8.8.8"],
      })
    ).rejects.toMatchObject({ code: "BAD_SCHEME" });
  });
});

describe("safeFetch — timeout", () => {
  it("aborts a slow request and throws TIMEOUT", async () => {
    const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    await expect(
      safeFetch("https://example.com/", {
        fetchImpl,
        resolveHost: async () => ["1.1.1.1"],
        timeoutMs: 50,
      })
    ).rejects.toBeInstanceOf(SafeFetchError);
  }, 2000);
});
