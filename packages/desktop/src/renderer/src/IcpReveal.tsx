import { useEffect, useRef, useState } from "react";
import type { IcpDraft } from "../../shared/types";
import { DUO } from "./glass";
import { Mark } from "./ui";
import "./icp-reveal-preview.css";

const SAMPLES = [
  {
    title: "Indie SaaS founders",
    tag: "Founder-led · 1–5 people",
    buyer: "The founder who still handles billing",
    fit: "Less time chasing invoices. More time building.",
    signal: "Launching paid plans or adding their first customers",
    skip: "Already happy with fully automated billing",
    icon: "buyer",
  },
  {
    title: "Small SaaS teams",
    tag: "Growing teams · 6–20 people",
    buyer: "The founder or first operations hire",
    fit: "Keep invoicing consistent as the business grows.",
    signal: "Hiring for operations or selling larger contracts",
    skip: "Needs a full enterprise finance platform",
    icon: "company",
  },
  {
    title: "Independent software studios",
    tag: "Small studios · 2–10 people",
    buyer: "The owner managing projects and payments",
    fit: "One less administrative task between client projects.",
    signal: "Taking on more clients or recurring retainers",
    skip: "Only sells through a marketplace that handles payments",
    icon: "site",
  },
].map((profile, index) => ({ ...profile, id: `sample-${index}` }));
const PHRASES = [
  "Considering who could benefit most",
  "Exploring what could make them a good fit",
  "Shaping your suggested customer profiles",
];

type Profile = IcpDraft & { icon: string; id: string };
type LiveReveal = {
  finding: boolean;
  profiles: Profile[];
  busy: string | null;
  error: string | null;
  onAdd: (draft: IcpDraft) => Promise<void>;
  onStart: () => void;
};

export function IcpRevealPreview({ onExit }: { onExit: () => void }) {
  return <IcpReveal onExit={onExit} />;
}

export function IcpReveal({ onExit, live }: { onExit: () => void; live?: LiveReveal }) {
  const [previewTab, setTab] = useState<"finding" | "portraits">("portraits");
  const tab = live ? (live.finding ? "finding" : "portraits") : previewTab;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    tag: "",
    buyer: "",
    fit: "",
    signal: "",
    skip: "",
  });
  const [phase, setPhase] = useState(0);
  const [samples, setSamples] = useState(SAMPLES);
  const profiles = live?.profiles ?? samples;
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const editorRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (editing) {
      editorRef.current?.scrollIntoView({ block: "center" });
      editorRef.current?.querySelector("input")?.focus({ preventScroll: true });
    }
  }, [editing]);
  useEffect(() => {
    if (tab !== "finding") return;
    const timer = setInterval(() => setPhase((value) => (value + 1) % PHRASES.length), 4200);
    return () => clearInterval(timer);
  }, [tab]);
  return (
    <div className={`ir-preview ${live ? "ir-live" : ""}`}>
      {!live && (
        <header className="ir-toolbar drag">
          <span className="ir-preview-label">Onboarding preview</span>
          <div className="ir-tabs" role="tablist" aria-label="ICP reveal states">
            {(
              [
                ["finding", "Loader · locked"],
                ["portraits", "Your ICPs · A"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`ir-${value}-tab`}
                aria-controls="ir-state"
                aria-selected={tab === value}
                onClick={() => {
                  setTab(value);
                  setNotice("");
                  setEditing(false);
                }}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="ir-exit" onClick={onExit}>
            Back to app
          </button>
        </header>
      )}
      {live && (
        <header className="ir-live-toolbar drag">
          <button
            className="ir-exit nodrag"
            type="button"
            disabled={Boolean(live.busy)}
            onClick={onExit}
          >
            ← Back
          </button>
        </header>
      )}
      <main
        className={`ir-stage ir-${tab}`}
        id="ir-state"
        role={live ? undefined : "tabpanel"}
        aria-labelledby={live ? undefined : `ir-${tab}-tab`}
      >
        {tab === "finding" ? (
          <section className="ir-discovery" aria-label="Finding your ICPs">
            <div className="ir-orbit" aria-hidden="true">
              <div className="ir-orbit-track ir-outer" />
              <div className="ir-orbit-track ir-inner" />
              <div className="ir-orbit-sweep" />
              <span className="ir-orbit-node ir-node-one">{DUO.company?.(27)}</span>
              <span className="ir-orbit-node ir-node-two">{DUO.buyer?.(27)}</span>
              <span className="ir-orbit-node ir-node-three">{DUO.site?.(27)}</span>
              <div className="ir-core">
                <Mark size={60} radius={19} />
              </div>
            </div>
            <h1>
              Discovering who <em>you could help.</em>
            </h1>
            <p className="ir-intro">A few promising directions, built around what you do.</p>
            <div className="ir-working" role="status">
              <span className="ir-working-dot" />
              <span key={phase} className="ir-phase">
                {PHRASES[phase]}
              </span>
            </div>
          </section>
        ) : (
          <section className="ir-results">
            <h1>
              We’d start with <em>these people.</em>
            </h1>
            <p className="ir-intro">All these ICPs will be in your dashboard, ready to refine.</p>
            <section
              className={`ir-cards ir-cards-${tab}`}
              aria-label="Your ideal customer profiles"
            >
              {profiles.map((sample) => (
                <article key={sample.id} className="ir-card">
                  <div className="ir-card-top">
                    <span className="ir-profile-icon">{DUO[sample.icon]?.(31)}</span>
                  </div>
                  <span className="ir-card-tag">{sample.tag}</span>
                  <h2>{sample.title}</h2>
                  <p className="ir-card-fit">{sample.fit}</p>
                  <div className="ir-card-detail ir-buyer">
                    <span>
                      <i aria-hidden="true">{DUO.buyer?.(16)}</i>WHO YOU’RE LOOKING FOR
                    </span>
                    <p>{sample.buyer}</p>
                  </div>
                  <div className="ir-card-detail ir-signal">
                    <span>
                      <i aria-hidden="true">{DUO.trigger?.(16)}</i>A REASON TO REACH OUT
                    </span>
                    <p>{sample.signal}</p>
                  </div>
                  <div className="ir-card-detail ir-skip">
                    <span>
                      <i aria-hidden="true">{DUO.skip?.(16)}</i>SKIP IF
                    </span>
                    <p>{sample.skip}</p>
                  </div>
                </article>
              ))}
            </section>
            {editing && (
              <form
                ref={editorRef}
                className="ir-editor"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (Object.values(draft).some((value) => !value.trim())) return;
                  setSaveError(null);
                  setSaving(true);
                  try {
                    if (live) await live.onAdd(draft);
                    else
                      setSamples((items) => [
                        ...items,
                        { ...draft, icon: "buyer", id: crypto.randomUUID() },
                      ]);
                    setDraft({ title: "", tag: "", buyer: "", fit: "", signal: "", skip: "" });
                    setEditing(false);
                    if (!live)
                      setNotice(
                        "Your ICP is added to this preview. AI refinement will happen in the real flow."
                      );
                  } catch (error) {
                    setSaveError(error instanceof Error ? error.message : String(error));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <h2>Add your own ICP</h2>
                <p>Rough details are enough. We’ll help refine your ICP before hunting.</p>
                <div className="ir-editor-fields">
                  {(
                    [
                      ["title", "ICP name", "e.g. Freelance product designers"],
                      ["tag", "Team type & size", "e.g. Independent · 1–3 people"],
                      ["fit", "Why your product helps", "What gets easier for them?"],
                      ["buyer", "Who you’re looking for", "Who would decide to buy?"],
                      ["signal", "A reason to reach out", "What might make now a good time?"],
                      ["skip", "Skip if", "What would make them a poor fit?"],
                    ] as const
                  ).map(([key, label, placeholder]) => (
                    <label key={key} htmlFor={`ir-${key}`}>
                      {label}
                      <input
                        id={`ir-${key}`}
                        disabled={saving}
                        required
                        maxLength={240}
                        placeholder={placeholder}
                        value={draft[key]}
                        onChange={(event) =>
                          setDraft((value) => ({ ...value, [key]: event.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
                {saveError && (
                  <p className="error" role="alert">
                    {saveError}
                  </p>
                )}
                <div className="ir-editor-actions">
                  <button
                    type="button"
                    className="ir-refine"
                    disabled={saving}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="ir-hunt" disabled={saving}>
                    {saving ? "Adding…" : "Add ICP"}
                  </button>
                </div>
              </form>
            )}
            {live?.error && (
              <p className="error" role="alert">
                {live.error}
              </p>
            )}
            <p className="ir-hunt-note">Next: we’ll find real companies and check why they fit.</p>
            <div className="ir-actions">
              <button
                type="button"
                className="ir-refine"
                disabled={Boolean(live?.busy) || saving}
                onClick={() => setEditing(!editing)}
              >
                {editing ? "Close form" : "Add your own"}
              </button>
              <button
                type="button"
                className="ir-hunt"
                disabled={Boolean(live?.busy) || saving || editing || profiles.length === 0}
                onClick={() =>
                  live
                    ? live.onStart()
                    : setNotice(
                        `Preview only: the hunt would start for all ${samples.length} ICPs${samples.length > SAMPLES.length ? ", after refining your added profiles" : ""}.`
                      )
                }
              >
                {live?.busy || "Start hunting"} <span aria-hidden="true">↗</span>
              </button>
            </div>
          </section>
        )}
      </main>
      {!live && (
        <footer className="ir-footer">
          <span>Design preview · sample product and ICPs</span>
          <span role="status">{notice || "No research or hunts run from this preview"}</span>
        </footer>
      )}
    </div>
  );
}
