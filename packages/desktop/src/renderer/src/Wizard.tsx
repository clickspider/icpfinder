import { AUDIENCES, PROGRESS } from "../../shared/business-overview";
// SPDX-License-Identifier: MIT
//
// Blocking setup: the shortest path to a sharp first ICP, then the hunt.
// welcome → your product (site, or a written idea) → how you sell → first ICP.
// Ask for the AI account after product entry, before the first AI operation.

import { useRef, useState } from "react";
import { icpPresentation } from "../../shared/onboarding";
import type { State } from "../../shared/types";
import { DUO } from "./glass";
import { IcpReveal } from "./IcpReveal";
import { AppBrand, OnboardingAside } from "./OnboardingFrame";
import { SubscriptionConnection } from "./SubscriptionConnection";
import { api, Spinner } from "./ui";

type Step = "welcome" | "product" | "about" | "icp";
const ORDER: Step[] = ["welcome", "product", "about", "icp"];
const clean = (e: unknown) =>
  e instanceof Error
    ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, "")
    : String(e);

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
  const [briefReady, setBriefReady] = useState(Boolean(ws));
  const [error, setError] = useState<string | null>(null);

  const [editingOverview, setEditingOverview] = useState(false);
  const [savingOverview, setSavingOverview] = useState(false);
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
  const updateProduct = async (patch: Partial<NonNullable<typeof product>>) => {
    const confirmedFields = [
      ...new Set([
        ...(product?.confirmedFields ?? []),
        ...Object.keys(patch).filter((k) => k !== "confirmedFields"),
        ...(patch.confirmedFields ?? []),
      ]),
    ];
    const update = { ...patch, confirmedFields };
    setSavingOverview(true);
    setError(null);
    try {
      onState(await api().updateProduct(update));
    } catch (e) {
      setError(clean(e));
      throw e;
    } finally {
      setSavingOverview(false);
    }
  };
  const next = () => {
    if (step === "welcome") return setStep("product");
    if (step === "product" || (step === "about" && !briefReady)) return void readBrief();
    if (step === "about") return void run("Finding your ICPs…", () => api().findIcps(), "icp");
    if (step === "icp" && icp) {
      setBusy("Opening your dashboard…");
      setError(null);
      void api()
        .finishSetup()
        .then(onState)
        .catch((e) => setError(clean(e)))
        .finally(() => setBusy(null));
    }
  };

  const cta: Record<Step, string> = {
    welcome: "Let’s get started",
    product: "Continue",
    about: !briefReady ? (busy ? "Preparing your overview…" : "Try again") : "Let’s find out",
    icp: "Looks right, hunt ↑",
  };
  const canNext =
    !busy &&
    !savingOverview &&
    !editingOverview &&
    (step !== "about" || !briefReady || Boolean(product?.audience && product?.progress)) &&
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
            profiles: (ws?.icps ?? []).map((profile) => ({
              ...icpPresentation(profile),
              // The AI's pick for this group; the card falls back to words in the name.
              icon: profile.icon ?? "",
            })),
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
                    You know what you offer. Let’s find who could need it.
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
                    <div className="ob-website-entry" style={{ gridRow: "3 / 5" }}>
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
                  ) : (
                    <>
                      <p className="ob-sub" id="idea-description-hint">
                        Describe what you offer and the problem it helps solve. A few sentences are
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
                  <h1 className="ob-h1">Let’s find your focus</h1>
                  {!briefReady && busy ? (
                    <div className="ob-loading" role="status">
                      <Spinner />
                      Getting to know your business…
                    </div>
                  ) : briefReady ? (
                    <p className="ob-sub">
                      Check the overview, then tell us a bit about how your business works.
                    </p>
                  ) : null}
                  <fieldset
                    className="ob-question"
                    disabled={!briefReady || Boolean(busy) || savingOverview || editingOverview}
                  >
                    <legend>Who do you sell to?</legend>
                    {briefReady &&
                      !busy &&
                      !savingOverview &&
                      !editingOverview &&
                      product?.audience &&
                      !product.confirmedFields?.includes("audience") && (
                        <p className="ob-suggested-answer">
                          Suggested from what you shared — change it if needed.
                        </p>
                      )}
                    <div className="ob-grid ob-audiences">
                      {AUDIENCES.map((audience) => (
                        <button
                          key={audience}
                          type="button"
                          className={`btn ob-opt ${product?.audience === audience ? "on" : ""}`}
                          aria-pressed={product?.audience === audience}
                          onClick={() => void updateProduct({ audience }).catch(() => {})}
                        >
                          {DUO[{ Businesses: "B2B", Consumers: "B2C", Both: "B2B2C" }[audience]]?.(
                            34
                          )}
                          {audience}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset
                    className="ob-question"
                    disabled={!briefReady || Boolean(busy) || savingOverview || editingOverview}
                  >
                    <legend>Where is your business today?</legend>
                    {briefReady &&
                      !busy &&
                      !savingOverview &&
                      !editingOverview &&
                      product?.progress &&
                      !product.confirmedFields?.includes("progress") && (
                        <p className="ob-suggested-answer">
                          Suggested from what you shared — change it if needed.
                        </p>
                      )}
                    <div className="ob-grid">
                      {PROGRESS.map((progress) => (
                        <button
                          key={progress}
                          type="button"
                          className={`btn ob-opt ${product?.progress === progress ? "on" : ""}`}
                          aria-pressed={product?.progress === progress}
                          onClick={() => void updateProduct({ progress }).catch(() => {})}
                        >
                          {DUO[
                            {
                              "Exploring an idea": "Idea",
                              "Preparing to launch": "Pre-seed",
                              "Looking for first customers": "buyer",
                              "Already serving customers": "company",
                            }[progress]
                          ]?.(34)}
                          {progress}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              {error && <p className="error">{error}</p>}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {hasProducts && idx === 0 && (
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
                  disabled={Boolean(busy) || savingOverview || editingOverview}
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
            onSave={step === "about" ? updateProduct : undefined}
            onEditing={setEditingOverview}
          />
        </div>
      )}
    </>
  );
};
