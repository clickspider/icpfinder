// SPDX-License-Identifier: MIT
"use client";

import { type FormEvent, useState } from "react";
import { OPTIONS } from "../../lib/apply-options";
import { Logo } from "../brand/Logo";

/** Launch film A, re-encoded for the web (864x1080, faststart). */
const FILM = "/next/icpfinder-film-a.mp4";

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
    body: "Paste your site or just talk about your idea. IcpFinder writes the brief: what you sell, the problem, the price.",
  },
  {
    img: "icps",
    icon: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 8a4 4 0 100 8 4 4 0 000-8z",
    title: "Picks who to sell to",
    body: "Three buyer types, each with the reason and clear yes/no checks for every company.",
  },
  {
    img: "hunt",
    icon: "M11 4a7 7 0 100 14 7 7 0 000-14z M21 21l-5-5",
    title: "Hunts real companies",
    body: "70+ facts checked on each one. A fact only counts when two websites prove it. You approve the fit.",
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
                <span>{label}</span>
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
