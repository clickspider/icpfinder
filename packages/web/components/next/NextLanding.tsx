// SPDX-License-Identifier: MIT
"use client";

import { type FormEvent, useState } from "react";
import { OPTIONS } from "../../lib/apply-options";
import { Logo } from "../brand/Logo";

/** Launch film (new onboarding), re-encoded for the web (864x1080, faststart). */
const FILM = "/next/icpfinder-film-e.mp4";

const Icon = ({ d }: { d: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const STEPS = [
  {
    img: "read",
    icon: "M4 5h16v14H4z M8 9h8 M8 13h5",
    title: "Reads your product",
    body: "Paste your site or just tell it the idea. Claude reads it and writes the brief: what you sell, the problem, the price, how you sell.",
  },
  {
    img: "icps",
    icon: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 8a4 4 0 100 8 4 4 0 000-8z",
    title: "Picks who to sell to",
    body: "Who to hunt first: who signs, which company, why now and when to skip. Each line has its why, and you can change it.",
  },
  {
    img: "hunt",
    icon: "M11 4a7 7 0 100 14 7 7 0 000-14z M21 21l-5-5",
    title: "Hunts real companies",
    body: "Claude searches the web for companies that match. Every fact is backed by live sources you can click. You approve every fit.",
  },
  {
    img: "opener",
    icon: "M4 6h16v12H4z M4 7l8 6 8-6",
    title: "Writes and does the next steps",
    body: "Why now, the right person, your opener. Then Claude finds the email and opens LinkedIn. Nothing is sent without your OK.",
  },
] as const;

type Field = keyof typeof OPTIONS;
const QUESTIONS: Array<[Field, string]> = [
  ["role", "What are you?"],
  ["salesTeam", "Who sells your product today?"],
  ["stage", "Where is your product?"],
  ["years", "How long have you shipped software?"],
  ["agent", "Do you use Claude Code or Codex?"],
];

/** Thin line icons, the same style as the Mac app. */
const OPTION_ICONS: Record<string, string> = {
  founder:
    "M12 3c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10z M12 9a1.5 1.5 0 100 3 1.5 1.5 0 000-3z M9 16l-2 4 M15 16l2 4",
  solo: "M8 8l-4 4 4 4 M16 8l4 4-4 4 M13.5 5l-3 14",
  employee: "M4 21V7l8-4 8 4v14 M9 21v-5h6v5 M8 10h1 M15 10h1 M8 13h1 M15 13h1",
  agency:
    "M9 11a3 3 0 100-6 3 3 0 000 6z M3 20a6 6 0 0112 0 M17 11a3 3 0 100-6 M21 20a6 6 0 00-4-5.7",
  other: "M12 3a9 9 0 100 18 9 9 0 000-18z M8 12h.01 M12 12h.01 M16 12h.01",
  none: "M12 11a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0",
  small:
    "M9 11a3 3 0 100-6 3 3 0 000 6z M3 20a6 6 0 0112 0 M17 11a3 3 0 100-6 M21 20a6 6 0 00-4-5.7",
  team: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  idea: "M9 18h6 M10 21h4 M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z",
  live: "M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3a14 14 0 010 18 M12 3a14 14 0 000 18",
  paying: "M3 7h18v10H3z M3 10h18 M7 14h3",
  scaling: "M3 20h18 M6 16v-4 M11 16V9 M16 16V5",
  lt1: "M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2",
  y1to3: "M4 5h16v15H4z M4 9h16 M8 3v4 M16 3v4",
  gt3: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z",
  daily: "M5 12l5 5L20 7",
  sometimes: "M4 12a8 8 0 0114-5.3 M20 12a8 8 0 01-14 5.3 M18 3v4h-4 M6 21v-4h4",
  no: "M12 21a9 9 0 100-18 9 9 0 000 18z M8 12h8",
};

function ApplyForm() {
  const [state, setState] = useState<
    "idle" | "sending" | "error" | "priority" | "review" | "later"
  >("idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setError(json.error ?? "Could not send. Check your connection.");
      setState("error");
      return;
    }
    setState(json.tier);
  }

  if (state === "priority" || state === "review" || state === "later")
    return (
      <div className="nx-done" role="status">
        <Logo size={44} />
        <h3>
          {state === "later" ? "Thanks, you are on the list." : "Thanks. Your application is in."}
        </h3>
        <p>
          {state === "later"
            ? "The first group is founders who sell their live product themselves. We will email you when the beta opens wider."
            : "We read every application by hand and let people in in small groups. Watch your inbox."}
        </p>
      </div>
    );

  return (
    <form className="nx-form" onSubmit={submit} noValidate>
      <div className="nx-row">
        <label>
          <span>Name</span>
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
      </div>
      <div className="nx-row">
        <label>
          <span>What did you build? (link)</span>
          <input name="productUrl" placeholder="yourproduct.com" inputMode="url" required />
        </label>
        <label>
          <span>LinkedIn, GitHub or X</span>
          <input name="profileUrl" placeholder="linkedin.com/in/you" inputMode="url" required />
        </label>
      </div>
      {QUESTIONS.map(([field, q]) => (
        <fieldset key={field}>
          <legend>{q}</legend>
          <div className="nx-chips">
            {Object.entries(OPTIONS[field]).map(([value, label]) => (
              <label key={value} className="nx-chip">
                <input type="radio" name={field} value={value} required />
                <span>
                  <Icon d={OPTION_ICONS[value] ?? ""} />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label>
        <span>What will you use IcpFinder for in your first week?</span>
        <textarea
          name="firstWeek"
          rows={3}
          placeholder="Find my first 20 B2B buyers for … and write to them."
          required
        />
      </label>
      <input name="company" tabIndex={-1} autoComplete="off" className="nx-hp" aria-hidden="true" />
      {state === "error" && (
        <p className="nx-error" role="alert">
          {error}
        </p>
      )}
      <button className="nx-btn nx-btn-dark" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Apply for the beta"}
      </button>
      <p className="nx-fine">We only use your email for the beta. No newsletter.</p>
    </form>
  );
}

export function NextLanding() {
  return (
    <div className="nx">
      <div className="nx-stage" aria-hidden="true">
        <i className="b1" />
        <i className="b2" />
        <i className="b3" />
        <i className="b4" />
      </div>

      <header className="nx-nav">
        <a href="/" className="nx-brand">
          <span className="nx-mark">
            <Logo size={22} />
          </span>
          IcpFinder
        </a>
        <a className="nx-btn nx-btn-dark nx-btn-sm" href="#apply">
          Apply
        </a>
      </header>

      <main id="main">
        <section className="nx-hero">
          <div className="nx-hero-text">
            <p className="nx-kicker">Private beta · macOS</p>
            <h1>Your whole go-to-market. Open source. On your Mac.</h1>
            <p className="nx-lede">
              IcpFinder finds who to sell to, hunts real companies with proof, and writes the first
              message. Free. It runs on the Claude or Codex you already pay for.
            </p>
            <div className="nx-ctas">
              <a className="nx-btn nx-btn-dark" href="#apply">
                Apply for the beta
              </a>
              <a className="nx-btn nx-btn-glass" href="https://github.com/clickspider/icpfinder">
                Star on GitHub
              </a>
            </div>
            <p className="nx-fine">
              For founders who sell it themselves. We let people in in small groups.
            </p>
          </div>
          <div className="nx-film nx-glass">
            {/* biome-ignore lint/a11y/useMediaCaption: every spoken line is on screen as text. */}
            <video src={FILM} poster="/next/poster.jpg" controls playsInline preload="metadata" />
          </div>
        </section>

        <section className="nx-section">
          <h2>From “who buys this?” to the first message.</h2>
          <div className="nx-steps">
            {STEPS.map((s, i) => (
              <article key={s.title} className="nx-step nx-glass">
                <div className="nx-step-head">
                  <span className="nx-ico">
                    <Icon d={s.icon} />
                  </span>
                  <span className="nx-num">{i + 1}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <div className="nx-shot">
                  <img
                    src={`/next/${s.img}.jpg`}
                    alt={`IcpFinder app: ${s.title.toLowerCase()}`}
                    loading="lazy"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="nx-section nx-runs">
          <div className="nx-glass nx-runs-card">
            <div className="nx-logos">
              <img src="/next/claude.png" alt="Claude" width={64} height={64} />
              <img src="/next/codex.png" alt="Codex" width={64} height={64} />
            </div>
            <div>
              <h2>No extra costs.</h2>
              <p>
                IcpFinder uses the Claude Code or Codex on your Mac. No API keys, no new
                subscription. MIT licensed, and your data stays on your Mac.
              </p>
            </div>
          </div>
        </section>

        <section className="nx-section">
          <h2>The beta is for builders.</h2>
          <div className="nx-fit">
            <div className="nx-glass nx-fit-card">
              <h3>Apply if</h3>
              <ul>
                <li>You built and shipped a real product.</li>
                <li>You have no sales team. You sell it yourself.</li>
                <li>You will use IcpFinder this week, and tell us what breaks.</li>
              </ul>
            </div>
            <div className="nx-glass nx-fit-card nx-fit-no">
              <h3>Wait if</h3>
              <ul>
                <li>It is still only an idea.</li>
                <li>A sales team already does this for you.</li>
                <li>You want to look around, not use it.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="nx-section" id="apply">
          <div className="nx-glass nx-apply">
            <h2>Apply for the beta</h2>
            <p className="nx-lede">Two minutes. We read every answer.</p>
            <ApplyForm />
          </div>
        </section>
      </main>

      <footer className="nx-foot">
        <span>IcpFinder · MIT · made by Daniel Frey</span>
        <a href="https://github.com/clickspider/icpfinder">GitHub</a>
      </footer>
    </div>
  );
}
