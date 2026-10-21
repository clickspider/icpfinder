import { useEffect, useRef, useState } from "react";
import type { IcpDraft } from "../../shared/types";
import { DUO } from "./glass";
import { Mark } from "./ui";
import "./icp-reveal.css";

const PHRASES = [
  "Considering who could benefit most",
  "Exploring what could make them a good fit",
  "Shaping your suggested customer profiles",
];

type Profile = IcpDraft & { icon: string; id: string; why?: string };
type LiveReveal = {
  finding: boolean;
  profiles: Profile[];
  busy: string | null;
  error: string | null;
  onAdd: (draft: IcpDraft) => Promise<void>;
  onStart: () => void;
};

export function IcpReveal({ onExit, live }: { onExit: () => void; live: LiveReveal }) {
  const tab = live.finding ? "finding" : "portraits";
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
  const profiles = live.profiles;
  const [editing, setEditing] = useState(false);
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
    <div className="ir-reveal">
      <header className="ir-toolbar drag">
        <button
          className="ir-exit nodrag"
          type="button"
          disabled={Boolean(live.busy)}
          onClick={onExit}
        >
          ← Back
        </button>
      </header>
      <main className={`ir-stage ir-${tab}`} id="ir-state">
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
              Here’s where <em>we’d start.</em>
            </h1>
            <p className="ir-intro">
              A few customer groups that could benefit from what you offer.
            </p>
            <section
              className={`ir-cards ir-cards-${tab}`}
              aria-label="Your ideal customer profiles"
            >
              {profiles.map((profile) => (
                <article key={profile.id} className="ir-card">
                  <div className="ir-card-top">
                    <span className="ir-profile-icon">{DUO[profile.icon]?.(31)}</span>
                  </div>
                  <h2>{profile.title}</h2>
                  <span className="ir-card-tag">{profile.tag}</span>
                  {/* Always rendered so rows stay aligned when a card has no reason. */}
                  <div className="ir-why">
                    {profile.why && (
                      <>
                        <i aria-hidden="true">{DUO.Idea?.(16)}</i>
                        <p>
                          <b>Why we picked it</b>
                          {profile.why}
                        </p>
                      </>
                    )}
                  </div>
                  <p className="ir-card-fit">{profile.fit}</p>
                  <div className="ir-card-detail ir-buyer">
                    <span>Who to talk to</span>
                    <p>{profile.buyer}</p>
                  </div>
                  <div className="ir-card-detail ir-signal">
                    <span>A reason to reach out</span>
                    <p>{profile.signal}</p>
                  </div>
                  <div className="ir-card-detail ir-skip">
                    <span>May not be a fit if</span>
                    <p>{profile.skip}</p>
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
                    await live.onAdd(draft);
                    setDraft({ title: "", tag: "", buyer: "", fit: "", signal: "", skip: "" });
                    setEditing(false);
                  } catch (error) {
                    setSaveError(error instanceof Error ? error.message : String(error));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <h2>Add a profile</h2>
                <p>Rough details are enough. You can edit this profile in your dashboard.</p>
                <div className="ir-editor-fields">
                  {(
                    [
                      ["title", "Profile name", "e.g. Freelance product designers"],
                      ["tag", "Profile characteristics", "What makes this group distinct?"],
                      ["fit", "How this group could benefit", "What gets easier for them?"],
                      ["buyer", "Who to talk to", "Who would decide to buy?"],
                      ["signal", "A reason to reach out", "What might make now a good time?"],
                      ["skip", "May not be a fit if", "What would make them a poor fit?"],
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
                    {saving ? "Adding…" : "Add profile"}
                  </button>
                </div>
              </form>
            )}
            {live.error && (
              <p className="error" role="alert">
                {live.error}
              </p>
            )}
            <p className="ir-hunt-note">
              All these profiles will be in your dashboard. You can edit them there anytime.
            </p>
            <div className="ir-actions">
              <button
                type="button"
                className="ir-refine"
                disabled={Boolean(live.busy) || saving}
                onClick={() => setEditing(!editing)}
              >
                {editing ? "Close form" : "Add a profile"}
              </button>
              <button
                type="button"
                className="ir-hunt"
                disabled={Boolean(live.busy) || saving || editing || profiles.length === 0}
                onClick={live.onStart}
              >
                {live.busy || "Go to my dashboard"} <span aria-hidden="true">↗</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
