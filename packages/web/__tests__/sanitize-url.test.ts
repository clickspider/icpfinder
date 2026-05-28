// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { sanitizeProvenanceUrl } from "../lib/sanitize-url";

describe("sanitizeProvenanceUrl (E10 critical-gap)", () => {
  it("accepts https URLs", () => {
    expect(sanitizeProvenanceUrl("https://stripe.com/news")).toBe("https://stripe.com/news");
  });
  it("accepts http URLs", () => {
    expect(sanitizeProvenanceUrl("http://acme.com")).toBe("http://acme.com/");
  });
  it("rejects javascript:", () => {
    expect(sanitizeProvenanceUrl("javascript:alert(1)")).toBe(null);
  });
  it("rejects data:", () => {
    expect(sanitizeProvenanceUrl("data:text/html,<script>alert(1)</script>")).toBe(null);
  });
  it("rejects vbscript:", () => {
    expect(sanitizeProvenanceUrl("vbscript:msgbox(1)")).toBe(null);
  });
  it("rejects file:", () => {
    expect(sanitizeProvenanceUrl("file:///etc/passwd")).toBe(null);
  });
  it("strips embedded credentials", () => {
    expect(sanitizeProvenanceUrl("https://user:pass@evil.com/")).toBe("https://evil.com/");
  });
  it("rejects null / non-string / empty", () => {
    expect(sanitizeProvenanceUrl(null)).toBe(null);
    expect(sanitizeProvenanceUrl(undefined)).toBe(null);
    expect(sanitizeProvenanceUrl(42)).toBe(null);
    expect(sanitizeProvenanceUrl("")).toBe(null);
    expect(sanitizeProvenanceUrl("   ")).toBe(null);
  });
  it("rejects malformed URLs", () => {
    expect(sanitizeProvenanceUrl("not a url")).toBe(null);
    expect(sanitizeProvenanceUrl("http://")).toBe(null);
  });
});
