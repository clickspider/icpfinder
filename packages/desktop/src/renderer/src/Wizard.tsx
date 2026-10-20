// SPDX-License-Identifier: MIT
//
// Blocking setup: the shortest path to a sharp first ICP, then the hunt.
// welcome → your product (site, or a written idea) → how you sell → first ICP.
// Ask for the AI account after product entry, before the first AI operation.

import { useRef, useState } from "react";
import { icpPresentation } from "../../shared/onboarding";
import type { BusinessModel, Stage as StageT, State } from "../../shared/types";
import { DUO } from "./glass";
import { IcpReveal } from "./IcpReveal";
import { AppBrand, OnboardingAside } from "./OnboardingFrame";
import { SubscriptionConnection } from "./SubscriptionConnection";
import { api, Spinner } from "./ui";

type Step = "welcome" | "product" | "about" | "icp";
const ORDER: Step[] = ["welcome", "product", "about", "icp"];
const MODELS: BusinessModel[] = ["B2B", "B2C", "B2B2C", "Marketplace"];
const MODEL_SUB: Record<BusinessModel, string> = {
  B2B: "companies",
  B2C: "people",
  B2B2C: "via companies",
  Marketplace: "two sides",
};
const STAGES: StageT[] = ["Idea", "Pre-seed", "Seed", "Series A+"];
const clean = (e: unknown) =>
  e instanceof Error
    ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, "")
    : String(e);

export const Wizard = ({
  state,
  onState,
  preview,
}: {
  state: State;
  onState: (s: State) => void;
  preview?: { step: Step; mode?: "site" | "idea"; busy?: string };
}) => {
  const ws = state.workspaces.find((w) => w.id === state.activeId);
  // Someone who already has a product can always leave a new setup.
  const hasProducts = state.workspaces.some((w) => w.setupDone && !w.archived);
  const [step, setStep] = useState<Step>(
    preview?.step ?? (ws?.icps.length ? "icp" : ws ? "about" : "welcome")
  );
  const [mode, setMode] = useState<"site" | "idea">(preview?.mode ?? "site");
  const [url, setUrl] = useState(preview?.step === "product" ? "" : (ws?.product.url ?? ""));
  const [description, setDescription] = useState(
    ws?.product.url ? "" : (ws?.product.siteText ?? "")
  );
  const [busy, setBusy] = useState<string | null>(preview?.busy ?? null);
  const [briefReady, setBriefReady] = useState(Boolean(ws) && !preview?.busy);
  const [error, setError] = useState<string | null>(null);

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
      if (preview) return;
      if (next === "about") {
        setStep("about");
        setBriefReady(false);
      }
      setBusy(label);
      setError(null);
      try {
        onState(await fn());
        if (next) setStep(next);
        if (next === "about") setBriefReady(true);
      } catch (e) {
        setError(clean(e));
        authorized.current = false;
      } finally {
        setBusy(null);
      }
    });

  const product = ws?.product;
  const icp = ws?.icps[0];
  const idx = ORDER.indexOf(step);

  const readBrief = () =>
    mode === "site"
      ? run("Reading your site…", () => api().readProduct(url), "about")
      : run("Building your product brief…", () => api().ideaFinish(description), "about");
  const updateProduct = (patch: Partial<NonNullable<typeof product>>) => {
    if (preview)
      return onState({
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === state.activeId ? { ...w, product: { ...w.product, ...patch } } : w
        ),
      });
    void api().updateProduct(patch).then(onState);
  };
  const next = () => {
    if (preview) return;
    if (step === "welcome") return setStep("product");
    if (step === "product" || (step === "about" && !briefReady)) return void readBrief();
    if (step === "about") return void run("Finding your ICPs…", () => api().findIcps(), "icp");
    if (step === "icp" && icp)
      return void run(
        ws?.icps.some((i) => i.card?.edited) ? "Refining your ICP…" : "Starting the hunt…",
        () => api().finishSetup()
      );
  };

  const cta: Record<Step, string> = {
    welcome: "Let’s get started",
    product: "Continue",
    about: !briefReady ? (busy ? "Preparing your brief…" : "Try again") : "Find my ICPs",
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
      {!connection && (busy === "Finding your ICPs…" || step === "icp") ? (
        <IcpReveal
          onExit={() => setStep("about")}
          live={{
            finding: busy === "Finding your ICPs…",
            busy,
            error,
            profiles: (ws?.icps ?? []).map((profile, index) => ({
              ...icpPresentation(profile),
              icon: ["buyer", "company", "site"][index % 3] ?? "buyer",
            })),
            onAdd: async (draft) => {
              if (!preview) onState(await api().addIcp(draft));
            },
            onStart: next,
          }}
        />
      ) : (
        <div className="ob-shell" style={{ display: connection ? "none" : "flex" }}>
          <section className="ob-sidebar">
            <AppBrand />
            <div key={step} className="ob-body enter">
              {step === "welcome" && (
                <>
                  <h1 className="ob-h1">
                    Who could be your <em>next customer?</em>
                  </h1>
                  <p className="ob-sub" style={{ fontSize: 15 }}>
                    You know what you offer. Let’s find the companies that need it.
                  </p>
                </>
              )}

              {step === "product" && (
                <>
                  <h1 className="ob-h1">
                    Tell us about your <em>business.</em>
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
                      {DUO.chat?.(16)} I’ll describe it
                    </button>
                  </div>
                  {mode === "site" ? (
                    <>
                      <p className="ob-sub">
                        Start with your website. We’ll take a look so you don’t have to explain
                        everything from scratch.
                      </p>
                      <div className="ob-website-entry">
                        <label htmlFor="business-website">Your website</label>
                        <input
                          id="business-website"
                          className="field"
                          placeholder="https://yourbusiness.com"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && canNext && next()}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="ob-sub" id="idea-description-hint">
                        Describe what you offer and the problem it helps solve. A few sentences is
                        enough to get started.
                      </p>
                      <textarea
                        className="idea-writing"
                        aria-label="Describe your business"
                        aria-describedby="idea-description-hint"
                        placeholder="e.g. We make invoicing software that helps small teams spend less time chasing payments."
                        value={description}
                        maxLength={12000}
                        disabled={Boolean(busy)}
                        onChange={(event) => setDescription(event.target.value)}
                      />
                    </>
                  )}
                </>
              )}

              {step === "about" && (
                <>
                  <h1 className="ob-h1">
                    How do you <em>sell?</em>
                  </h1>
                  {!briefReady && busy && (
                    <div className="ob-loading" role="status">
                      <Spinner />
                      {busy}
                    </div>
                  )}
                  <div className="ob-lab">Business model</div>
                  <div className="ob-grid">
                    {MODELS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`btn ob-opt ${product?.model === m ? "on" : ""}`}
                        disabled={!briefReady || Boolean(busy)}
                        aria-pressed={product?.model === m}
                        onClick={() => updateProduct({ model: m })}
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
                        className={`btn ob-opt ${product?.stage === s ? "on" : ""}`}
                        disabled={!briefReady || Boolean(busy)}
                        aria-pressed={product?.stage === s}
                        onClick={() => updateProduct({ stage: s })}
                      >
                        {DUO[s]?.(34)}
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {error && <p className="error">{error}</p>}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {hasProducts && idx === 0 && !preview && (
                <button
                  className="ghost btn"
                  type="button"
                  onClick={() => void api().cancelSetup().then(onState)}
                >
                  ← My products
                </button>
              )}
              {idx > 0 && (
                <button
                  type="button"
                  className="ghost btn"
                  disabled={Boolean(busy)}
                  onClick={() => setStep(ORDER[idx - 1] ?? "welcome")}
                >
                  Back
                </button>
              )}
              {busy && step !== "about" && (
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
              <div
                className={step === "welcome" ? "ob-welcome-action" : undefined}
                style={{ marginLeft: "auto" }}
              >
                <button type="button" className="ob-cta" disabled={!canNext} onClick={next}>
                  {cta[step]}
                </button>
                {step === "welcome" && <span className="ob-time-estimate">About 1 minute</span>}
              </div>
            </div>
          </section>

          <OnboardingAside
            kind={
              step === "welcome"
                ? "welcome"
                : step === "about"
                  ? "about"
                  : mode === "idea"
                    ? "idea"
                    : "product"
            }
            product={briefReady ? product : undefined}
            name={mode === "site" ? url : "Your idea"}
            loading={step === "about" && !briefReady}
          />
        </div>
      )}
    </>
  );
};
