// SPDX-License-Identifier: MIT

interface EmptyStateProps {
  onExamplePick: (example: string) => void;
}

const examples = [
  "AI invoicing tool for indie SaaS founders that auto-categorizes Stripe payouts",
  "Open-source DevTools for solo founders shipping their first app",
  "ICP finder for indie OSS maintainers looking for sponsors",
];

export function EmptyState({ onExamplePick }: EmptyStateProps) {
  return (
    <section className="grid gap-6 rounded-[20px] border border-[color:var(--hairline)] bg-[color:var(--bg-card)] p-6 md:p-8">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[color:var(--text)]">
          How it works
        </h2>
        <ol className="mt-3 grid gap-2 text-[14px] text-[color:var(--text-muted)] md:grid-cols-3">
          <li className="rounded-[12px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] p-3">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--mint-deep)] tabular">
              01
            </span>
            <span className="mt-1 block">Paste your product idea — one sentence is fine.</span>
          </li>
          <li className="rounded-[12px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] p-3">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--mint-deep)] tabular">
              02
            </span>
            <span className="mt-1 block">
              Three ICP archetypes stream in — role, industry, company size, buying signals.
            </span>
          </li>
          <li className="rounded-[12px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] p-3">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--mint-deep)] tabular">
              03
            </span>
            <span className="mt-1 block">
              Verified contact emails via Hunter — copy, export, run again.
            </span>
          </li>
        </ol>
      </div>

      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          Try one of these
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onExamplePick(ex)}
              aria-label={`Use example: ${ex}`}
              className="rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-3.5 py-1.5 text-[13px] text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hi)] hover:text-[color:var(--text)]"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
