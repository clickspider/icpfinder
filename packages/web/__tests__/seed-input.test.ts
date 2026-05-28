// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import {
  canonicalDiffersFromRaw,
  classifySeed,
  normalizeUrlCandidate,
  shortUrlLabel,
} from "../lib/seed-input";

describe("classifySeed", () => {
  it("classifies bare domains as url", () => {
    expect(classifySeed("linear.app").kind).toBe("url");
    expect(classifySeed("acme.co").kind).toBe("url");
    expect(classifySeed("sub.example.com/path?x=1").kind).toBe("url");
  });

  it("classifies full https URLs as url", () => {
    const c = classifySeed("https://linear.app/docs");
    expect(c.kind).toBe("url");
    expect(c.url).toContain("linear.app");
  });

  it("falls back to text for multi-token input even with a URL inside", () => {
    expect(classifySeed("paste linear.app and let's go").kind).toBe("text");
  });

  it("classifies free text as text", () => {
    expect(classifySeed("AI invoicing tool for indie SaaS founders").kind).toBe("text");
  });

  it("rejects nonsense single tokens", () => {
    expect(classifySeed("hello").kind).toBe("text");
    expect(classifySeed("foo.").kind).toBe("text");
    expect(classifySeed(".bar").kind).toBe("text");
  });

  it("rejects literal IPv4 hosts (SSRF defense in depth)", () => {
    expect(classifySeed("127.0.0.1").kind).toBe("text");
    expect(classifySeed("192.168.1.1").kind).toBe("text");
    expect(classifySeed("169.254.169.254").kind).toBe("text");
    expect(classifySeed("http://10.0.0.5/admin").kind).toBe("text");
  });

  it("rejects bracketed IPv6 literals (SSRF defense in depth)", () => {
    expect(classifySeed("[::1]").kind).toBe("text");
    expect(classifySeed("http://[fe80::1]/").kind).toBe("text");
  });

  it("trims and rejects empty", () => {
    expect(classifySeed("   ").kind).toBe("text");
    expect(classifySeed("   ").raw).toBe("");
  });
});

describe("normalizeUrlCandidate (F2 paste-cruft fuzz)", () => {
  const cases: Array<[string, string]> = [
    ["linear.app", "linear.app"],
    ["LINEAR.APP", "linear.app"],
    [" linear.app ", "linear.app"],
    ["\tlinear.app\n", "linear.app"],
    ['"linear.app"', "linear.app"],
    ["'linear.app'", "linear.app"],
    ["(linear.app)", "linear.app"],
    ["[linear.app]", "linear.app"],
    ["<linear.app>", "linear.app"],
    ["linear.app.", "linear.app"],
    ["linear.app,", "linear.app"],
    ["linear.app;", "linear.app"],
    ["linear.app)", "linear.app"],
    ['"https://linear.app"', "https://linear.app"],
    ["(https://linear.app/docs)", "https://linear.app/docs"],
    ["https://LINEAR.APP/Docs?ref=hn", "https://linear.app/docs?ref=hn"],
    ["  ((linear.app)).  ", "linear.app"],
    ["linear.app/", "linear.app/"],
    ["sub.linear.app", "sub.linear.app"],
    ["https://www.linear.app", "https://www.linear.app"],
  ];
  for (const [input, expected] of cases) {
    it(`normalizes \`${input}\` → \`${expected}\``, () => {
      expect(normalizeUrlCandidate(input)).toBe(expected);
    });
  }

  it("is idempotent", () => {
    for (const [input] of cases) {
      const once = normalizeUrlCandidate(input);
      const twice = normalizeUrlCandidate(once);
      expect(twice).toBe(once);
    }
  });
});

describe("classifySeed (F2 fuzz — paste shapes all classify as url)", () => {
  const urlShapes = [
    "linear.app",
    " linear.app ",
    '"linear.app"',
    "(linear.app)",
    "<linear.app>",
    "LINEAR.APP/DOCS?ref=hn",
    "linear.app.",
    "linear.app,",
    "linear.app)",
    '"https://linear.app"',
    "(https://linear.app/docs)",
    "https://linear.app",
    "http://linear.app",
    " https://linear.app ",
  ];
  for (const shape of urlShapes) {
    it(`\`${shape}\` → url`, () => {
      const c = classifySeed(shape);
      expect(c.kind).toBe("url");
      expect(c.url).toContain("linear.app");
    });
  }

  it("multi-token after wrappers fall through to text", () => {
    expect(classifySeed("linear.app and notes").kind).toBe("text");
  });
});

describe("shortUrlLabel + IDN", () => {
  it("strips www and protocol", () => {
    expect(shortUrlLabel("https://www.linear.app/docs")).toBe("linear.app");
    expect(shortUrlLabel("acme.co")).toBe("acme.co");
  });

  it("converts IDN to punycode", () => {
    expect(shortUrlLabel("münchen.de")).toBe("xn--mnchen-3ya.de");
  });

  it("canonicalDiffersFromRaw flags IDN→punycode", () => {
    expect(canonicalDiffersFromRaw("münchen.de")).toBe(true);
    expect(canonicalDiffersFromRaw("linear.app")).toBe(false);
  });
});
