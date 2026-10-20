import { useState } from "react";
import type { SubscriptionStatus } from "../../shared/subscriptions";
import type { Icp, State } from "../../shared/types";
import { SubscriptionConnection } from "./SubscriptionConnection";
import { SubscriptionDesignPreview } from "./SubscriptionDesignPreview";
import { Wizard } from "./Wizard";
import "./onboarding-gallery.css";

const product = {
  readAt: "2026-10-20T00:00:00Z",
  name: "Invoice Studio",
  url: "https://invoicestudio.example",
  sell: "Invoicing for small SaaS teams",
  problem: "Founders spend too much time chasing invoices.",
  different: "",
  price: "$19 / month",
  competitors: "",
  siteText: "Invoicing for indie SaaS founders.",
  audience: "Businesses" as const,
  progress: "Already serving customers" as const,
  marketplace: false,
};
const line = (text: string) => ({ text, why: "", source: "your product" });
const profiles: Icp[] = (
  [
    [
      "Founder",
      "Early B2B SaaS",
      "1–10 people",
      "Launching paid plans or adding their first customers",
    ],
    [
      "Head of operations",
      "Growing software teams",
      "10–30 people",
      "Hiring for operations or selling larger contracts",
    ],
    [
      "Studio owner",
      "Independent software studios",
      "2–10 people",
      "Taking on more clients or recurring retainers",
    ],
  ] as const
).map(([buyer, company, size, signal], index) => ({
  id: `sample-${index}`,
  name: buyer,
  industry: company,
  size: size,
  pain: "Less time chasing invoices. More time building.",
  sellingAngle: [
    "Keep invoicing from eating into the time founders need to build and sell.",
    "Handle more complex billing without adding more manual work for operations.",
    "Spend less time following up on client payments across projects and retainers.",
  ][index],
  signals: [signal],
  objections: [],
  art: index,
  hunted: false,
  companies: [],
  card: {
    buyer: line(buyer),
    company: line(`${company} · ${size}`),
    trigger: line(signal),
    skip: line("Already happy with fully automated billing"),
  },
}));
const fixture: State = {
  workspaces: [
    { id: "sample", product, icps: profiles, setupDone: false, createdAt: "2026-10-20T00:00:00Z" },
  ],
  activeId: "sample",
  contacts: [],
  settings: {
    provider: "codex",
    providerConfirmed: true,
    model: "gpt-5",
    hunterKey: "",
    windowDays: 120,
    dropTime: "06:00",
    askBeforeEmail: true,
    sources: { hn: true, reddit: false, x: false, linkedin: false, fallback: true },
  },
};
const known: SubscriptionStatus[] = [
  { provider: "codex", installed: true, connected: true },
  { provider: "claude", installed: true, connected: false },
  { provider: "xai", installed: true, connected: false },
];
const unknown = known.map((item) => ({ ...item, connected: false }));
const TABS = [
  ["welcome", "Welcome"],
  ["site", "Website"],
  ["idea", "Written idea"],
  ["ai", "AI · known"],
  ["choose", "AI · choose"],
  ["reading", "Reading product"],
  ["about", "How you sell"],
  ["finding", "Finding ICPs"],
  ["icp", "Your ICPs"],
  ["states", "AI states"],
] as const;
export function OnboardingGallery({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("welcome");
  const [surface, setSurface] = useState("rich");
  const [state, setState] = useState(fixture);
  const step =
    tab === "welcome"
      ? "welcome"
      : tab === "site" || tab === "idea"
        ? "product"
        : tab === "icp"
          ? "icp"
          : "about";
  return (
    <div className={`og-root ob-surface-${surface}`}>
      <header className="og-toolbar drag">
        <span>Onboarding review</span>
        <section className="og-surfaces" aria-label="Right panel style">
          {(
            [
              ["wash", "A · Light"],
              ["balanced", "B · Balanced"],
              ["rich", "C · Rich"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={surface === value}
              onClick={() => setSurface(value)}
            >
              {label}
            </button>
          ))}
        </section>
        <button type="button" className="og-exit" onClick={onExit}>
          Back to app
        </button>
      </header>
      <nav className="og-tabs" aria-label="Onboarding screens">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="og-screen" key={tab}>
        {tab === "ai" || tab === "choose" ? (
          <SubscriptionConnection
            state={state}
            onState={setState}
            product="invoicestudio.example"
            previewStatuses={tab === "ai" ? known : unknown}
            onBack={() => setTab("site")}
            onContinue={() => setTab("reading")}
          />
        ) : tab === "states" ? (
          <SubscriptionDesignPreview onExit={() => setTab("ai")} />
        ) : (
          <Wizard
            state={state}
            onState={setState}
            preview={{
              step,
              mode: tab === "idea" ? "idea" : "site",
              busy:
                tab === "reading"
                  ? "Reading your site…"
                  : tab === "finding"
                    ? "Finding your ICPs…"
                    : undefined,
            }}
          />
        )}
      </div>
      <footer className="og-footer">
        Design review · sample data · no AI calls or account changes
      </footer>
    </div>
  );
}
