// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { parseConnections, warmFor } from "../src/main/engine";

const CSV = `Notes:
"When exporting your connection data, you may notice that some of the email addresses are missing."

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Sam,Rivera,https://www.linkedin.com/in/ps,,"Widgetly, Inc.",CTO,01 Oct 2026
Ann,Lee,https://www.linkedin.com/in/al,,Acme,Head of Growth,02 Oct 2026
`;

describe("LinkedIn import", () => {
  it("skips the note lines and reads quoted cells", () => {
    const c = parseConnections(CSV);
    expect(c).toHaveLength(2);
    expect(c[0]).toMatchObject({
      name: "Sam Rivera",
      company: "Widgetly, Inc.",
      position: "CTO",
    });
  });

  it("marks a company warm by name or domain, not by a loose substring", () => {
    const c = parseConnections(CSV);
    const co = (name: string, domain: string) => ({
      name,
      domain,
      hint: "",
      status: "candidate" as const,
    });
    expect(warmFor(co("Widgetly", "widgetly.dev"), c).map((p) => p.name)).toEqual(["Sam Rivera"]);
    expect(warmFor(co("Acme Labs", "acme.io"), c)).toHaveLength(1);
    expect(warmFor(co("Acmeflow", "acmeflow.com"), c)).toHaveLength(0);
  });
});
