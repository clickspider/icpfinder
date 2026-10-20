// SPDX-License-Identifier: MIT
//
// Blocking setup: the shortest path to a sharp first ICP, then the hunt.
// welcome → your product (site, or a written idea) → how you sell → first ICP.
// Ask for the AI account after product entry, before the first AI operation.

import { useRef, useState } from "react";
import type { BusinessModel, Icp, IcpCard, Stage as StageT, State } from "../../shared/types";
import { Doc, DUO, Glass, Marble, ProductCard } from "./glass";
import { SubscriptionConnection } from "./SubscriptionConnection";
import { api, IcpArt, Mark, ProductLogo, Spinner } from "./ui";

type Step = "welcome" | "product" | "about" | "icp";
const ORDER: Step[] = ["welcome", "product", "about", "icp"];
const TITLES: Record<Step, string> = {
  welcome: "Welcome",
  product: "Your product",
  about: "How you sell",
  icp: "Your first ICP",
};
const MODELS: BusinessModel[] = ["B2B", "B2C", "B2B2C", "Marketplace"];
const MODEL_SUB: Record<BusinessModel, string> = {
  B2B: "companies",
  B2C: "people",
  B2B2C: "via companies",
  Marketplace: "two sides",
};
const STAGES: StageT[] = ["Idea", "Pre-seed", "Seed", "Series A+"];
const CARD_KEYS = ["buyer", "company", "trigger", "skip"] as const;
const CARD_LABEL: Record<(typeof CARD_KEYS)[number], string> = {
  buyer: "Who signs",
  company: "Which company",
  trigger: "Why now",
  skip: "Skip if",
};

const clean = (e: unknown) =>
  e instanceof Error
    ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, "")
    : String(e);

/** Older ICPs have no card yet: show their gates in the same four lines. */
const cardOf = (icp: Icp): IcpCard =>
  icp.card ?? {
    buyer: { text: icp.name, why: icp.reasoning ?? "", source: "your product" },
    company: {
      text: [icp.industry, icp.size].filter(Boolean).join(", "),
      why: "",
      source: "your product",
    },
    trigger: {
      text: icp.criteria?.signals[0] ?? icp.signals[0] ?? "",
      why: "",
      source: "gtmskills: website-to-signals",
    },
    skip: {
      text: icp.criteria?.dealBreakers[0] ?? "",
      why: "",
      source: "gtmskills: icp-builder",
    },
  };

export const Wizard = ({ state, onState }: { state: State; onState: (s: State) => void }) => {
  const ws = state.workspaces.find((w) => w.id === state.activeId);
  // Someone who already has a product can always leave a new setup.
  const hasProducts = state.workspaces.some((w) => w.setupDone && !w.archived);
  const [step, setStep] = useState<Step>(ws?.icps.length ? "icp" : ws ? "about" : "welcome");
  const [mode, setMode] = useState<"site" | "idea">("site");
  const [url, setUrl] = useState(ws?.product.url ?? "");
  const [description, setDescription] = useState(
    ws?.product.url ? "" : (ws?.product.siteText ?? "")
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ key: (typeof CARD_KEYS)[number]; text: string } | null>(null);
  const [paste, setPaste] = useState<string | null>(null);

  const [connection, setConnection] = useState(false);
  const authorized = useRef(false);
  const pendingAction = useRef<(() => Promise<void>) | null>(null);
  const withConnection = async (action: () => Promise<void>) => {
    if (authorized.current) return action();
    pendingAction.current = action;
    setConnection(true);
  };

  const run = (label: string, fn: () => Promise<State>, next?: Step) =>
    withConnection(async () => {
      setBusy(label);
      setError(null);
      try {
        onState(await fn());
        if (next) setStep(next);
      } catch (e) {
        setError(clean(e));
        authorized.current = false;
      } finally {
        setBusy(null);
      }
    });

  const product = ws?.product;
  const icp = ws?.icps.find((i) => i.id === sel) ?? ws?.icps[0];
  const idx = ORDER.indexOf(step);

  const saveCard = (k: (typeof CARD_KEYS)[number], text: string) => {
    if (!icp) return;
    void api()
      .updateCard(icp.id, k, text)
      .then(onState)
      .then(() => setEdit(null));
  };

  const next = () => {
    if (step === "welcome") return setStep("product");
    if (step === "product" && mode === "site")
      return void run("Reading your site…", () => api().readProduct(url), "about");
    if (step === "product")
      return void run("Building your product brief…", () => api().ideaFinish(description), "about");
    if (step === "about") return void run("Finding your ICPs…", () => api().findIcps(), "icp");
    if (step === "icp" && icp)
      return void run("Starting the hunt…", () => api().finishSetup(icp.id));
  };

  const cta: Record<Step, string> = {
    welcome: "Start · about 1 minute",
    product: mode === "site" ? "Read my site" : "Continue",
    about: "Find my ICPs",
    icp: "Looks right, hunt ↑",
  };
  const canNext =
    !busy &&
    (step !== "product" ||
      (mode === "site" ? url.trim().includes(".") : Boolean(description.trim())));

  return (
    <>
      {connection && (
        <SubscriptionConnection
          state={state}
          onState={onState}
          product={mode === "site" ? url : "Your idea"}
          onBack={() => {
            pendingAction.current = null;
            setConnection(false);
          }}
          onContinue={async () => {
            authorized.current = true;
            setConnection(false);
            const action = pendingAction.current;
            pendingAction.current = null;
            await action?.();
          }}
        />
      )}
      <div style={{ display: connection ? "none" : "flex", height: "100%", background: "#fff" }}>
        <section
          style={{
            width: 500,
            padding: "22px 32px 24px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minHeight: 0,
          }}
        >
          <div className="ob-top drag">
            {hasProducts && (
              <button
                type="button"
                className="ghost btn nodrag"
                style={{ fontSize: 12, padding: "2px 8px", marginLeft: -8 }}
                onClick={() => void api().cancelSetup().then(onState)}
              >
                ← My products
              </button>
            )}
            <span>
              Setup · <b>{TITLES[step]}</b>
            </span>
            {idx > 0 && (
              <span>
                {idx} of {ORDER.length - 1}
              </span>
            )}
          </div>

          <div
            key={step}
            className="enter"
            style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}
          >
            {step === "welcome" && (
              <>
                <Mark size={52} radius={15} />
                <h1 className="ob-h1" style={{ fontSize: 30 }}>
                  Find who to sell to.
                  <br />
                  <em>Proven</em>, not guessed.
                </h1>
                <p className="ob-sub" style={{ fontSize: 15 }}>
                  IcpFinder finds your buyers on the web. It only shows a fact when 2 websites prove
                  it.
                </p>
              </>
            )}

            {step === "product" && (
              <>
                <h1 className="ob-h1">
                  What are you <em>building?</em>
                </h1>
                <div className="ob-seg" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "site"}
                    className={mode === "site" ? "on" : ""}
                    onClick={() => setMode("site")}
                  >
                    {DUO.site?.(16)} I have a website
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "idea"}
                    className={mode === "idea" ? "on" : ""}
                    onClick={() => setMode("idea")}
                  >
                    {DUO.chat?.(16)} Just an idea
                  </button>
                </div>
                {mode === "site" ? (
                  <>
                    <p className="ob-sub">
                      Paste the site. Your AI reads it and fills in the rest.
                    </p>
                    <input
                      className="field"
                      aria-label="Website"
                      placeholder="yourproduct.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && canNext && next()}
                    />
                  </>
                ) : (
                  <>
                    <p className="ob-sub" id="idea-description-hint">
                      What does it do, who is it for, and what problem does it solve? Write as much
                      or as little as you have.
                    </p>
                    <textarea
                      className="idea-writing"
                      aria-label="Describe your idea"
                      aria-describedby="idea-description-hint"
                      placeholder="e.g. An AI invoicing tool for indie SaaS founders"
                      value={description}
                      maxLength={12000}
                      disabled={Boolean(busy)}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </>
                )}
              </>
            )}

            {step === "about" && product && (
              <>
                <h1 className="ob-h1">
                  How do you <em>sell?</em>
                </h1>
                <p className="ob-sub">
                  {product.url
                    ? `Read from ${product.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}.`
                    : "From your idea."}{" "}
                  Tap to change.
                </p>
                <div className="ob-lab">Business model</div>
                <div className="ob-grid">
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`btn ob-opt ${product.model === m ? "on" : ""}`}
                      aria-pressed={product.model === m}
                      onClick={() => void api().updateProduct({ model: m }).then(onState)}
                    >
                      {DUO[m]?.(34)}
                      {m}
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--faint)",
                          fontWeight: 400,
                          marginTop: -4,
                        }}
                      >
                        {MODEL_SUB[m]}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="ob-lab">Stage</div>
                <div className="ob-grid">
                  {STAGES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`btn ob-opt ${product.stage === s ? "on" : ""}`}
                      aria-pressed={product.stage === s}
                      onClick={() => void api().updateProduct({ stage: s }).then(onState)}
                    >
                      {DUO[s]?.(34)}
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "icp" && ws && icp && (
              <>
                <h1 className="ob-h1">
                  I'd hunt <em>these</em> first.
                </h1>
                <p className="ob-sub">Made from your product. Tap a line to change it.</p>
                {ws.icps.length > 1 && (
                  <div className="ob-chips">
                    {ws.icps.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        className={`ob-chip ${i.id === icp.id ? "on" : ""}`}
                        title={`${i.name} · ${i.industry}`}
                        onClick={() => {
                          setSel(i.id);
                          setEdit(null);
                        }}
                      >
                        <IcpArt icp={i} size={16} radius={5} />
                        {ws.icps.filter((x) => x.name === i.name).length > 1
                          ? `${i.name} · ${i.industry.split(/[ ,]/).slice(0, 2).join(" ")}`
                          : i.name}
                      </button>
                    ))}
                  </div>
                )}
                <div
                  className="scroll"
                  style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}
                >
                  {CARD_KEYS.map((k) => {
                    const l = cardOf(icp)[k];
                    return (
                      <div key={`${icp.id}-${k}`} className="ob-pick rise">
                        <span className="ob-pi">{DUO[k]?.(22)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ob-pl">{CARD_LABEL[k]}</div>
                          {edit?.key === k ? (
                            <input
                              className="field"
                              style={{ height: 34, fontSize: 13.5, marginTop: 4 }}
                              // biome-ignore lint/a11y/noAutofocus: opened by the founder's click
                              autoFocus
                              aria-label={CARD_LABEL[k]}
                              value={edit.text}
                              onChange={(e) => setEdit({ key: k, text: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setEdit(null);
                                if (e.key === "Enter") saveCard(k, edit.text);
                              }}
                              onBlur={() => saveCard(k, edit.text)}
                            />
                          ) : (
                            <div className="ob-pv">{l.text || "—"}</div>
                          )}
                          {l.why && l.source !== "you" && <div className="ob-pw">{l.why}</div>}
                        </div>
                        {edit?.key !== k && (
                          <button
                            type="button"
                            className="ob-change"
                            onClick={() => setEdit({ key: k, text: l.text })}
                          >
                            Change
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {paste !== null && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <textarea
                      className="field area"
                      style={{ padding: 10, fontSize: 13.5, minHeight: 80 }}
                      aria-label="Your ICP"
                      placeholder="Paste the ICP you already use"
                      value={paste}
                      onChange={(e) => setPaste(e.target.value)}
                    />
                    <button
                      type="button"
                      className="ob-cta"
                      disabled={!paste.trim() || Boolean(busy)}
                      onClick={() =>
                        void run("Turning your ICP into checks…", () =>
                          api().findIcps(
                            `Use this ICP exactly as the first ICP, and keep its words: ${paste}`
                          )
                        ).then(() => setPaste(null))
                      }
                    >
                      Use my ICP
                    </button>
                  </div>
                )}
              </>
            )}

            {error && <p className="error">{error}</p>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step === "icp" && paste === null ? (
              <button type="button" className="ghost btn" onClick={() => setPaste("")}>
                Paste my own ICP
              </button>
            ) : (
              idx > 0 && (
                <button
                  type="button"
                  className="ghost btn"
                  disabled={Boolean(busy)}
                  onClick={() => setStep(ORDER[idx - 1] ?? "welcome")}
                >
                  Back
                </button>
              )
            )}
            {busy && busy !== "thinking" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                <Spinner />
                {busy}
              </div>
            )}
            <button
              type="button"
              className="ob-cta"
              style={{ marginLeft: "auto" }}
              disabled={!canNext}
              onClick={next}
            >
              {cta[step]}
            </button>
          </div>
        </section>

        <Marble>
          <StageContent step={step} state={state} mode={mode} url={url} busy={busy} icp={icp} />
        </Marble>
      </div>
    </>
  );
};

const HOW: Array<[string, string, string]> = [
  ["site", "Add your product", "Your site, or just tell me the idea."],
  ["buyer", "Get your first ICP", "Four clear calls, each with its why."],
  ["company", "Approve companies", "Only strong fits. Your AI checks the facts."],
];

const StageContent = ({
  step,
  state,
  mode,
  url,
  busy,
  icp,
}: {
  step: Step;
  state: State;
  mode: "site" | "idea";
  url: string;
  busy: string | null;
  icp?: Icp;
}) => {
  const ws = state.workspaces.find((w) => w.id === state.activeId);
  const p = ws?.product;

  if (step === "welcome")
    return (
      <Glass width={340} className="doc">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Mark size={44} radius={13} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>IcpFinder</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>How it works</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {HOW.map(([icon, t, d], i) => (
            <div
              key={t}
              className="rise"
              style={{ display: "flex", gap: 12, animationDelay: `${i * 90}ms` }}
            >
              <span className="ob-pi" style={{ background: "rgba(255,255,255,.7)" }}>
                {DUO[icon]?.(22)}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Glass>
    );

  if (step === "product" && mode === "idea") {
    return (
      <Glass width={380} className="doc">
        <Mark size={38} radius={12} />
        <h2 style={{ fontSize: 26, letterSpacing: -0.7, margin: "24px 0 12px" }}>
          Start with what you know.
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
          A rough idea is enough. Once you continue, your AI will turn your description into a
          product brief.
        </p>
      </Glass>
    );
  }

  if (step === "product")
    return (
      <div className={busy ? "breathing" : ""}>
        <ProductCard
          logo={<Mark size={34} radius={10} />}
          name={
            url
              .trim()
              .replace(/^https?:\/\//, "")
              .replace(/\/.*$/, "") || "yourproduct.com"
          }
          tag={busy ? "Reading…" : "Workspace"}
        />
      </div>
    );

  if (step === "about" && p)
    return (
      <>
        <ProductCard
          logo={<ProductLogo product={p} size={34} radius={10} />}
          name={p.name}
          tag={[p.model, p.stage].filter(Boolean).join(" · ") || "Your product"}
        />
        <Doc
          title="Profile"
          pill={p.url ? "Your site" : "Your idea"}
          icon={p.url ? "site" : "chat"}
          done
          sections={[
            ["What you sell", p.sell],
            ["The problem", p.problem],
            ["Pricing", p.price || "Not on the site"],
            ...(p.competitors ? [["Competitors", p.competitors] as [string, string]] : []),
          ]}
        />
      </>
    );

  if (step === "icp" && icp)
    return (
      <>
        <Glass width={220} className="pcard">
          <IcpArt icp={icp} size={56} radius={16} />
          <div className="namefield">{icp.name}</div>
          <span className="gtag">{icp.industry}</span>
        </Glass>
        <Doc
          title="Why this ICP"
          pill="Method"
          icon="trigger"
          width={460}
          sections={[
            ["One buyer, one trigger", "Fewer companies, more replies."],
            ["Only checks we can prove", "Every line is a yes/no a public page shows."],
            ["Then we sharpen", "Each hunt sharpens one check."],
          ]}
        />
      </>
    );

  return busy ? <Spinner /> : null;
};
