// SPDX-License-Identifier: MIT
"use client";

import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import { OPTIONS } from "../../lib/apply-options";
import { Logo } from "../brand/Logo";

/** Launch film v6 on YouTube (Unlisted). The no-cookie host sets no cookie until play. */
const FILM = "https://www.youtube-nocookie.com/embed/nutpbbN65Qk?rel=0&playsinline=1";

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
      <button className="nx-btn nx-btn-red" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Let’s talk"}
      </button>
      <p className="nx-fine">We only use your email for the beta. No newsletter.</p>
    </form>
  );
}

const tool = (name: string) =>
  `/next/tools/${name}.${["instantly", "linkedin", "apollo", "clay", "chatgpt", "grok", "hunter"].includes(name) ? "png" : "svg"}`;

const ToolLogo = ({ name, alt = "" }: { name: string; alt?: string }) => (
  <img className="nx-logo" src={tool(name)} alt={alt} width={20} height={20} />
);

const Face = ({ name, size = 40 }: { name: string; size?: number }) => (
  <img
    className="nx-face"
    src={`/next/faces/${name}.jpg`}
    alt=""
    width={size}
    height={size}
    style={{ width: size, height: size }}
  />
);

/** Phosphor duotone (MIT), teal + coral, in the film's glass tile. */
const Glyph = ({ name }: { name: string }) => (
  <span className="nx-glyph" aria-hidden="true">
    <img src={`/next/icons/${name}-duotone.svg`} alt="" width={26} height={26} />
  </span>
);

/** The film's tab groups (FilmV4.tsx GROUPS colours), every tab a different tool. */
const GROUPS = [
  { name: "Inbox", g: "#a8404f", tint: "#e8cdcf", tools: ["gmail", "instantly", "whatsapp"] },
  {
    name: "Buyers",
    g: "#8e3fd6",
    tint: "#ead9f8",
    tools: ["linkedin", "reddit", "x", "producthunt"],
  },
  { name: "Lists", g: "#1a73e8", tint: "#d6e4fb", tools: ["apollo", "clay", "hunter"] },
  { name: "Deals", g: "#0f7b5f", tint: "#cfeadf", tools: ["hubspot", "notion", "trello"] },
  { name: "Calls", g: "#94306f", tint: "#e9cddb", tools: ["calendly", "zoom", "googlecalendar"] },
] as const;

/** The film's lines, one tool pair per job (script v15, line 3-4). */
const JOBS: Array<[string[], string, string]> = [
  [["gmail", "instantly"], "You answer leads in ", "Gmail and Instantly."],
  [["linkedin", "reddit"], "You go looking for buyers on ", "LinkedIn and Reddit."],
  [["apollo", "clay"], "You build lists in ", "Apollo and Clay."],
  [["hubspot"], "Your deals live in ", "HubSpot."],
  [["calendly"], "Your calls are in ", "Calendly."],
];

const ROWS = [
  { name: "Inbox", icon: "envelope-simple", tools: ["gmail", "instantly", "whatsapp"] },
  { name: "Deals", icon: "credit-card", tools: ["hubspot", "notion"] },
  { name: "Lists", icon: "note-pencil", tools: ["apollo", "clay"] },
  { name: "Buyers", icon: "users-three", tools: ["linkedin", "reddit", "x"] },
  { name: "Calls", icon: "chats-circle", tools: ["calendly", "zoom"] },
];

/** Amir's card: one person, the same data from every tool (film 0:58). */
const FEED: Array<[string, string, string]> = [
  ["Buyers", "reddit", "Asked for help in r/SaaS"],
  ["Inbox", "gmail", "Replied to your email"],
  ["Deals", "hubspot", "Deal · Call booked"],
  ["Lists", "clay", "On your list: SaaS founders"],
  ["Calls", "calendly", "Call · Thu 14:00"],
];

/** Day one: what the Mac app does today (checked in packages/desktop, 4 Nov 2026). */
const DAY_ONE: Array<[string, string]> = [
  ["note-pencil", "Tell it what you built."],
  ["users-three", "It shows you who might need it, and where they said so."],
  ["envelope-simple", "It finds where to reach them: their post, their profiles, their email."],
  ["paper-plane-tilt", "It writes the first message. You send it."],
  ["user-plus", "You track every one in your pipeline."],
];

/** One thing moves at a time: each block fades in once, when it scrolls into view. */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".nx-in");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);
}

export function NextLanding() {
  useReveal();
  return (
    <div className="nx">
      <header className="nx-nav">
        <a href="/" className="nx-brand">
          <span className="nx-mark">
            <Logo size={22} />
          </span>
          IcpFinder
        </a>
        <a className="nx-btn nx-btn-red nx-btn-sm" href="#talk">
          Let&rsquo;s talk
        </a>
      </header>

      <main id="main">
        {/* 1. The hook, then the film */}
        <section className="nx-beat nx-hero">
          <p className="nx-kicker">
            <Logo size={18} />
            IcpFinder for Mac · open source
          </p>
          <h1>
            Be honest, where&rsquo;s your <em>focus</em> right now?
          </h1>
          <p className="nx-lede">Probably everywhere except the customer.</p>
          <div className="nx-film nx-glass">
            <iframe
              src={FILM}
              title="IcpFinder launch film"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </section>

        {/* 2. One problem: dozens of tools */}
        <section className="nx-beat">
          <div className="nx-team nx-in" aria-hidden="true">
            <Face name="daniel" size={56} />
            <Face name="mika" size={56} />
            <Face name="jonas" size={56} />
          </div>
          <h2 className="nx-in">
            You&rsquo;re doing all of it, across <em>dozens</em> of tools.
          </h2>
          <p className="nx-lede nx-in">
            You&rsquo;re a founder, or you do go-to-market. Maybe solo, maybe with a tiny team.
          </p>
          <div className="nx-tabs-bar nx-in" aria-hidden="true">
            {GROUPS.map((g) => (
              <div
                key={g.name}
                className="nx-group"
                style={{ "--g": g.g, "--g-tint": g.tint } as CSSProperties}
              >
                <b>{g.name}</b>
                {g.tools.map((t) => (
                  <span key={t}>
                    <ToolLogo name={t} />
                  </span>
                ))}
              </div>
            ))}
          </div>
          <ul className="nx-jobs nx-in">
            {JOBS.map(([logos, lead, tools]) => (
              <li key={tools}>
                <span aria-hidden="true">
                  {logos.map((l) => (
                    <ToolLogo key={l} name={l} />
                  ))}
                </span>
                <span>
                  {lead}
                  <b>{tools}</b>
                </span>
              </li>
            ))}
          </ul>
          <p className="nx-lede nx-in">And all you really want is to do the job.</p>
        </section>

        {/* 3. What if it all lived in one place */}
        <section className="nx-beat">
          <h2 className="nx-in">
            What if all of this lived in <em>one place</em>?
          </h2>
          <p className="nx-lede nx-in">
            All your inboxes in one inbox. Your pipeline from HubSpot. Your lists from Apollo. One
            view, with the same data.
          </p>
          <div className="nx-win nx-in">
            <div className="nx-win-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <nav className="nx-side" aria-hidden="true">
              {ROWS.map((r, i) => (
                <div key={r.name} className={`nx-row-app${i === 3 ? " is-sel" : ""}`}>
                  <img className="nx-ico" src={`/next/icons/${r.icon}-duotone.svg`} alt="" />
                  {r.name}
                  <span className="nx-stack">
                    {r.tools.map((t) => (
                      <span key={t}>
                        <img src={tool(t)} alt="" />
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </nav>
            <div className="nx-main">
              <div className="nx-person">
                <Face name="amir" size={48} />
                <div>
                  <strong>Amir</strong>
                  <small>Founder · Magpie</small>
                </div>
                <span className="nx-chip-red">same data, every tool</span>
              </div>
              <ul className="nx-feed">
                {FEED.map(([row, t, what]) => (
                  <li key={row}>
                    <span>{row}</span>
                    <ToolLogo name={t} />
                    <span>{what}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="nx-note nx-in">
            <span className="nx-soon">Coming</span>
            One inbox for every account, and HubSpot, Apollo and Clay in the same view. You still
            use your tools. You just stop jumping between them.
          </p>
        </section>

        {/* 4. An agent on top */}
        <section className="nx-beat">
          <h2 className="nx-in">
            And an <em>agent</em> that does the work with you.
          </h2>
          <p className="nx-lede nx-in">
            An email comes in from someone who&rsquo;s not in HubSpot yet. It notices, and asks if
            you want them in your pipeline.
          </p>
          <div className="nx-agent">
            <div className="nx-mail nx-in">
              <Face name="maya" size={44} />
              <div>
                <strong>Maya · Loop</strong>
                <p>Loved your post. Can we talk this week?</p>
              </div>
              <ToolLogo name="gmail" />
            </div>
            <div className="nx-agent-bar nx-glass nx-in">
              <Glyph name="sparkle" />
              <div>
                <small>AGENT</small>
                <div>Maya isn&rsquo;t in HubSpot yet. Add her?</div>
              </div>
              <span className="nx-btn nx-btn-red nx-btn-sm" aria-hidden="true">
                Add
              </span>
            </div>
          </div>
          <p className="nx-note nx-in">
            <span className="nx-soon">Coming</span>
            The agent that watches your inbox. Today it already finds people, checks who fits, and
            writes the first message.
          </p>
        </section>

        {/* 5. The reveal */}
        <section className="nx-beat nx-intro">
          <p className="nx-eyebrow nx-in">Introducing</p>
          <p className="nx-brand-big nx-in">
            <span className="nx-mark">
              <Logo size={44} />
            </span>
            IcpFinder
          </p>
          <h2 className="nx-in" style={{ marginTop: 28 }}>
            A <em>harness</em> for go-to-market, the way coding agents are a harness for code.
          </h2>
        </section>

        {/* 6. Day one / year ten */}
        <section className="nx-beat">
          <div className="nx-two">
            <article className="nx-card nx-glass nx-in">
              <div className="nx-card-head">
                <h3>Day one</h3>
                <span className="nx-live">Works today</span>
              </div>
              <p>You just shipped something, and you don&rsquo;t even know what an ICP is.</p>
              <ol className="nx-steps">
                {DAY_ONE.map(([icon, line]) => (
                  <li key={line}>
                    <Glyph name={icon} />
                    {line}
                  </li>
                ))}
              </ol>
            </article>
            <article className="nx-card nx-glass nx-in">
              <div className="nx-card-head">
                <h3>Year ten</h3>
                <span className="nx-soon">Coming</span>
              </div>
              <p>
                You&rsquo;ve been doing sales for years. You just plug in the tools you already
                have.
              </p>
              <div className="nx-tools">
                {(
                  [
                    ["hubspot", "HubSpot"],
                    ["apollo", "Apollo"],
                    ["clay", "Clay"],
                    ["gmail", "Gmail"],
                    ["calendly", "Calendly"],
                  ] as const
                ).map(([t, n]) => (
                  <span key={t}>
                    <ToolLogo name={t} />
                    {n}
                  </span>
                ))}
              </div>
            </article>
          </div>
          <h2 className="nx-drop nx-in">
            Day one, or year ten. <em>Same harness.</em>
          </h2>
        </section>

        {/* 7. Bring your own AI */}
        <section className="nx-beat">
          <h2 className="nx-in">
            Not another subscription. Bring <em>your own AI</em>.
          </h2>
          <div className="nx-ais nx-in">
            {(
              [
                ["claude", "Claude"],
                ["chatgpt", "ChatGPT"],
                ["grok", "Grok"],
              ] as const
            ).map(([t, n]) => (
              <figure key={t}>
                <span>
                  <img src={tool(t)} alt="" width={40} height={40} />
                </span>
                <figcaption>{n}</figcaption>
              </figure>
            ))}
          </div>
          <ul className="nx-facts nx-in">
            <li>
              <Glyph name="git-branch" />
              <span>
                Open source, MIT.{" "}
                <a href="https://github.com/clickspider/icpfinder">Read the code on GitHub</a>.
              </span>
            </li>
            <li>
              <Glyph name="plug" />
              It runs on the Claude, ChatGPT or Grok plan you already pay for.
            </li>
            <li>
              <Glyph name="lock-key" />
              It&rsquo;s on your Mac, and your workspace stays there.
            </li>
            <li>
              <Glyph name="cloud" />
              <span>
                A cloud version is coming. <span className="nx-soon">Coming</span>
              </span>
            </li>
          </ul>
          <p className="nx-fine nx-in">Your provider&rsquo;s plan limits apply.</p>
        </section>

        {/* 8. Close: one person, one place. Let's talk. */}
        <section className="nx-beat nx-close" id="talk">
          <h2 className="nx-in">
            One person, <em>one place</em>.
          </h2>
          <p className="nx-lede nx-in">
            If you want help setting it up, we&rsquo;re running a small beta, one on one.
          </p>
          <div className="nx-glass nx-apply nx-in" id="apply">
            <div className="nx-me">
              <Face name="daniel" size={52} />
              <p>
                <b>Let&rsquo;s talk.</b> I&rsquo;m Daniel, I build IcpFinder. I read every answer
                and set it up with you, one on one.
              </p>
            </div>
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
