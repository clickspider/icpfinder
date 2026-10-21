import { useEffect, useState } from "react";
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
  onStart: () => void;
};

export function IcpReveal({ onExit, live }: { onExit: () => void; live: LiveReveal }) {
  const tab = live.finding ? "finding" : "portraits";
  const [phase, setPhase] = useState(0);
  const profiles = live.profiles;
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
                  {/* Icon and name belong together: one header row. */}
                  <header className="ir-card-head">
                    <span className="ir-profile-icon">{DUO[profile.icon]?.(26)}</span>
                    <h2>{profile.title}</h2>
                  </header>
                  {/* One clear text: what gets easier for them, then why we picked them. */}
                  <p className="ir-card-fit">
                    {profile.fit}
                    {profile.why && <span className="ir-card-why"> {profile.why}</span>}
                  </p>
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
            {live.error && (
              <p className="error" role="alert">
                {live.error}
              </p>
            )}
            <p className="ir-hunt-note">
              All these profiles will be in your dashboard. You can edit them or add more there
              anytime.
            </p>
            <div className="ir-actions">
              <button
                type="button"
                className="ir-hunt"
                disabled={Boolean(live.busy) || profiles.length === 0}
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
