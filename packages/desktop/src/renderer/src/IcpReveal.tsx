import type React from "react";
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

type Profile = IcpDraft & { icon: string; id: string; why?: string; where?: string[] };

/** Ink-only icons, one per kind of group, chosen from the group's own words. */
const GROUP_ICONS = {
  shop: "M4 9h16l-1.5-5h-13zM5 9v11h14V9M9 20v-6h6v6",
  cart: "M3 4h2l2.4 11h10.2L20 8H6.2M10 20h.01M17 20h.01",
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",
  chat: "M4 5h16v11H9l-5 4zM8 10h.01M12 10h.01M16 10h.01",
  code: "M9 8l-4 4 4 4M15 8l4 4-4 4",
  people:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.6-3.5 3-5 6-5s5.4 1.5 6 5M16 11a3 3 0 1 0-1-5.8M17 15c2.2.4 3.6 2 4 5",
  briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  building: "M5 21V4h10v17M15 9h4v12M8 8h4M8 12h4M8 16h4M3 21h18",
  home: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  school: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  megaphone: "M3 10v4h3l7 4V6L6 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11",
  wrench: "M14.5 5.5a4 4 0 0 0 4.9 4.9L10 20l-3-3 9.6-9.4a4 4 0 0 0-1.1-2.1z",
  money: "M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v4M18 10v4",
} as const;
// The AI picks the icon from this set for each group; words in the name are the fallback.
const groupIcon = (title: string, index: number, picked?: string): keyof typeof GROUP_ICONS => {
  if (picked && picked in GROUP_ICONS) return picked as keyof typeof GROUP_ICONS;
  const t = title.toLowerCase();
  if (/shop|store|e-?commerce|retail|salon|restaurant|clinic|service business|agenc/.test(t))
    return "shop";
  if (/non-technical|consumer|parent|household|everyday|personal|famil|people who/.test(t))
    return "phone";
  if (/whatsapp|chat|messag|community|group/.test(t)) return "chat";
  if (/develop|coder|engineer|dev |dev$|programm|technical/.test(t)) return "code";
  return (["people", "chat", "shop"] as const)[index % 3] ?? "people";
};
const GroupIcon = ({ title, index, picked }: { title: string; index: number; picked?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d={GROUP_ICONS[groupIcon(title, index, picked)]}
      stroke="#1d1a1c"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
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
              Here’s who <em>we’d talk to first.</em>
            </h1>
            <p className="ir-intro">
              A few kinds of people who could need what you offer, and where you’ll find them.
            </p>
            <section
              className={`ir-cards ir-cards-${tab}`}
              aria-label="Your ideal customer profiles"
            >
              {profiles.map((profile, index) => (
                <article
                  key={profile.id}
                  className="ir-card"
                  style={{ "--i": index } as React.CSSProperties}
                >
                  {/* Icon and name belong together: one header row. */}
                  <header className="ir-card-head">
                    <span className="ir-profile-icon">
                      <GroupIcon title={profile.title} index={index} picked={profile.icon} />
                    </span>
                    <h2>{profile.title}</h2>
                  </header>
                  {/* People first: the person is the headline, the group sits above it. */}
                  <p className="ir-card-person">{profile.buyer}</p>
                  <div className="ir-summary">
                    <p className="ir-card-fit">{profile.fit}</p>
                    {profile.why && (
                      <div className="ir-card-why">
                        <span className="ir-why-label">
                          <i aria-hidden="true" />
                          Why we picked it
                        </span>
                        <p>{profile.why}</p>
                      </div>
                    )}
                  </div>
                  <div className="ir-card-detail ir-signal">
                    <span>When to reach them</span>
                    <p>{profile.signal}</p>
                  </div>
                  {/* Always rendered, so the rows of cards side by side stay aligned. */}
                  <div className="ir-card-detail ir-where">
                    {profile.where?.length ? (
                      <>
                        <span>Where they talk</span>
                        <p className="ir-where-chips">
                          {profile.where.map((w) => (
                            <span key={w}>{w}</span>
                          ))}
                        </p>
                      </>
                    ) : null}
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
              In your dashboard you can listen for these people and edit everything.
            </p>
            <div className="ir-actions">
              <button
                type="button"
                className="ir-hunt"
                disabled={Boolean(live.busy) || profiles.length === 0}
                onClick={live.onStart}
              >
                {live.busy || "Go to my dashboard"} <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
