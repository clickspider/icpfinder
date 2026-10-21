// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { emailsIn, pickEmail } from "../src/shared/emails";

describe("site emails", () => {
  it("reads mailto links and obfuscated text, skips junk", () => {
    const html = `<a href="mailto:Philip@PingChange.io">mail</a> hello&#64;pingchange.io
      noreply@pingchange.io logo@2x.png sentry@sentry.io`;
    expect(emailsIn(html)).toEqual(["philip@pingchange.io", "hello@pingchange.io"]);
  });
  it("picks the person, then hello@ before support@, never another domain", () => {
    const all = ["support@acme.dev", "hello@acme.dev", "ada@acme.dev", "ada@gmail.com"];
    expect(pickEmail(all, "acme.dev", "Ada Lovelace")).toBe("ada@acme.dev");
    expect(pickEmail(["support@acme.dev", "hello@acme.dev"], "acme.dev")).toBe("hello@acme.dev");
    expect(pickEmail(["ada@gmail.com"], "acme.dev", "Ada")).toBeNull();
  });
});
