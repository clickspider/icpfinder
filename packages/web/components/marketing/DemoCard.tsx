// SPDX-License-Identifier: MIT

interface DemoArchetype {
  n: string;
  role: string;
  meta: string;
  status: "done" | "streaming";
  cost: string;
  emails: string[];
  pending?: string;
}

const archetypes: DemoArchetype[] = [
  {
    n: "001",
    role: "Principal Designer",
    meta: "Boutique Brand Identity · 1–5 employees",
    status: "done",
    cost: "0.13¢",
    emails: ["sarah.chen@boutique.studio", "marcus.reed@formandcraft.co"],
  },
  {
    n: "002",
    role: "Head of Design Operations",
    meta: "SaaS Product Design · 11–50 employees",
    status: "done",
    cost: "0.14¢",
    emails: ["j.morales@plinth.studio", "amelia.fox@upliftworks.com"],
  },
  {
    n: "003",
    role: "Creative Director",
    meta: "Performance Marketing · 51–200 employees",
    status: "streaming",
    cost: "0.13¢",
    emails: ["henrik.j@motorcraft.agency"],
    pending: "tomas.b@... looking up",
  },
];

export function DemoCard() {
  return (
    <div
      aria-label="Live demo preview: streaming three ICP archetypes"
      className="overflow-hidden rounded-[28px] border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)]"
      style={{
        boxShadow:
          "0 40px 80px -20px rgba(15,16,20,0.18), 0 12px 24px -12px var(--iris-glow)",
      }}
    >
      {/* head */}
      <div
        className="flex items-center justify-between gap-3 border-b border-[color:var(--hairline)] px-5 py-3"
        style={{ background: "var(--bg-card-hi)" }}
      >
        <span className="text-[12px] font-medium text-[color:var(--text-muted)]">
          run · <span className="tabular">cmplnd1iw9q</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--mint-deep)]">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: "var(--mint-deep)",
              boxShadow: "0 0 10px var(--mint-glow)",
              animation: "icp-pulse 1100ms ease-in-out infinite",
            }}
          />
          streaming
        </span>
      </div>

      {/* input row */}
      <div className="flex gap-2.5 border-b border-[color:var(--hairline)] bg-[color:var(--bg-elev)] p-5">
        <div className="flex h-11 flex-1 items-center rounded-[14px] border border-[color:var(--hairline-2)] bg-[color:var(--bg)] px-3.5 text-sm text-[color:var(--text)]">
          AI invoicing tool for indie SaaS founders
        </div>
        <span
          className="inline-flex h-11 items-center gap-1.5 rounded-[14px] px-4 text-[13px] font-semibold text-white"
          style={{
            background: "linear-gradient(95deg, var(--mint-deep), var(--iris-deep))",
            boxShadow: "0 8px 20px -6px var(--iris-glow)",
          }}
        >
          Find ICPs <span aria-hidden="true">→</span>
        </span>
      </div>

      {/* progress */}
      <div
        className="relative h-[3px] overflow-hidden"
        style={{ background: "var(--bg-card-hi)" }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={2}
        aria-valuetext="2 of 3 archetypes done"
      >
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-full"
          style={{
            width: "66%",
            background: "linear-gradient(90deg, var(--mint-deep), var(--iris-deep))",
            boxShadow: "0 0 14px var(--mint-glow)",
          }}
        />
      </div>

      {/* results */}
      <div className="grid gap-2.5 p-4" style={{ background: "var(--bg)" }}>
        {archetypes.map((a) => (
          <article
            key={a.n}
            aria-labelledby={`demo-archetype-${a.n}`}
            className="rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--bg-elev)] p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
                archetype <span className="font-bold text-[color:var(--mint-deep)] tabular">{a.n}</span>
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{
                  color: a.status === "streaming" ? "var(--coral)" : "var(--mint-deep)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1 w-1 rounded-full"
                  style={{
                    background: a.status === "streaming" ? "var(--coral)" : "var(--mint-deep)",
                    boxShadow:
                      a.status === "streaming"
                        ? "0 0 6px var(--coral-glow)"
                        : "0 0 6px var(--mint-glow)",
                    animation:
                      a.status === "streaming"
                        ? "icp-pulse 1100ms ease-in-out infinite"
                        : undefined,
                  }}
                />
                {a.status} · <span className="tabular">{a.cost}</span>
              </span>
            </div>
            <h4
              id={`demo-archetype-${a.n}`}
              className="text-[15px] font-semibold tracking-[-0.005em] text-[color:var(--text)]"
            >
              {a.role}
            </h4>
            <p className="mb-2.5 text-[12px] font-medium text-[color:var(--text-muted)]">{a.meta}</p>
            <ul className="grid gap-1 text-[13px] text-[color:var(--text)]">
              {a.emails.map((e) => (
                <li key={e} className="font-mono">
                  <span className="font-sans font-bold text-[color:var(--mint-deep)]">→ </span>
                  {e}
                </li>
              ))}
              {a.pending ? (
                <li className="font-mono text-[color:var(--text-dim)]">
                  <span className="font-sans font-bold text-[color:var(--coral)]">→ </span>
                  {a.pending}
                </li>
              ) : null}
            </ul>
          </article>
        ))}
      </div>

      {/* foot */}
      <div
        className="flex items-center justify-between border-t border-[color:var(--hairline)] px-5 py-3 text-[12px] font-medium text-[color:var(--text-muted)]"
        style={{ background: "var(--bg-card-hi)" }}
      >
        <span>
          <span className="tabular">3.2s</span> elapsed ·{" "}
          <span className="tabular">2/3</span> archetypes ·{" "}
          <span className="tabular">5/9</span> emails
        </span>
        <span className="font-bold text-[color:var(--coral)] tabular">0.40¢</span>
      </div>
    </div>
  );
}
