// SPDX-License-Identifier: MIT
"use client";

import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { TOOLS, type ToolId } from "../../lib/apply-options";
import { capture, initPosthog } from "../../lib/posthog";
import { Logo } from "../brand/Logo";

/** Launch film v6 on YouTube (Unlisted). The no-cookie host sets no cookie until play. */
/** Launch film v6, self-hosted: 720p for phones, 1080p elsewhere, both faststart. */
const FILM = {
  hd: "/next/icpfinder-film-v6-1080.mp4",
  sd: "/next/icpfinder-film-v6-720.mp4",
  poster: "/next/film-v6-poster.jpg",
};

/** Daniel's own cal.com booking page (5 Nov): a call instead of, or next to, the form. */
const BOOK = "https://cal.com/daniel-frey-apyowv/quickchat";

const Book = ({ where, children }: { where: string; children: ReactNode }) => (
  <a
    className="nx-book"
    href={BOOK}
    target="_blank"
    rel="noopener"
    onClick={() => capture("book_click", { where })}
  >
    {children}
  </a>
);

const SPEAKER = "M4 9v6h4l5 4V5L8 9z";

/**
 * The film with only two controls (Daniel, 4 Nov 21:04): sound on/off and a time bar.
 * It starts muted, since every line is on screen; the first "sound on" starts it from the top.
 * Click the film to pause or play.
 */
function Film() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [heard, setHeard] = useState(false);
  const [paused, setPaused] = useState(true);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);

  // Autoplay and metadata can land before React hydrates and attaches the handlers.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    setPaused(v.paused);
    if (v.duration) setD(v.duration);
  }, []);

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    if (muted && !heard) {
      v.currentTime = 0;
      setHeard(true);
      capture("film_sound_on");
    }
    v.muted = !muted;
    setMuted(!muted);
    v.play().catch(() => {});
  };
  const togglePlay = () => {
    const v = ref.current;
    if (v) v.paused ? v.play().catch(() => {}) : v.pause();
  };

  return (
    <div className="nx-film nx-glass">
      {/* biome-ignore lint/a11y/useMediaCaption: every spoken line is on screen as text. */}
      <video
        ref={ref}
        poster={FILM.poster}
        autoPlay
        muted
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onEnded={() => capture("film_end", { sound: !muted })}
        onTimeUpdate={(e) => {
          const { currentTime, duration } = e.currentTarget;
          if (duration && t < duration / 2 && currentTime >= duration / 2)
            capture("film_half", { sound: !muted });
          setT(currentTime);
        }}
        onDurationChange={(e) => setD(e.currentTarget.duration)}
      >
        <source src={FILM.sd} type="video/mp4" media="(max-width: 820px)" />
        <source src={FILM.hd} type="video/mp4" />
      </video>
      {paused && (
        <button type="button" className="nx-film-play" onClick={togglePlay} aria-label="Play">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </button>
      )}
      <div className="nx-film-bar">
        <button
          type="button"
          className="nx-film-sound"
          onClick={toggleSound}
          aria-label={muted ? "Sound on" : "Sound off"}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d={SPEAKER} fill="currentColor" />
            {muted ? (
              <path
                d="M16 9l5 6M21 9l-5 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </svg>
          {muted && <span>Sound on</span>}
        </button>
        <input
          type="range"
          className="nx-film-time"
          min={0}
          max={d || 1}
          step={0.1}
          value={t}
          aria-label="Time"
          style={{ "--p": `${d ? (t / d) * 100 : 0}%` } as CSSProperties}
          onChange={(e) => {
            const v = ref.current;
            if (v) v.currentTime = Number(e.currentTarget.value);
          }}
        />
      </div>
    </div>
  );
}

/** The beta form, three things (Daniel, 2 Nov): tools with logos, biggest challenge, name + work email. */
function ApplyForm() {
  const [state, setState] = useState<"idle" | "sending" | "error" | "done">("idle");
  const [error, setError] = useState("");
  const started = useRef(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const f = new FormData(e.currentTarget);
    const body = { ...Object.fromEntries(f), tools: f.getAll("tools") };
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setError(json.error ?? "Could not send. Check your connection.");
      setState("error");
      capture("form_error", { status: res?.status ?? 0 });
      return;
    }
    setState("done");
    capture("form_submit", { tools: body.tools.length });
  }

  if (state === "done")
    return (
      <div className="nx-done" role="status">
        <Logo size={44} />
        <h3>Thanks, it&rsquo;s in.</h3>
        <p>I read every answer myself, and I&rsquo;ll email you to set up a short call.</p>
        <p>
          Rather pick a time now? <Book where="thanks">Book a call with me</Book>.
        </p>
      </div>
    );

  return (
    <form
      className="nx-form"
      onSubmit={submit}
      noValidate
      onFocus={() => {
        if (started.current) return;
        started.current = true;
        capture("form_start");
      }}
    >
      <fieldset>
        <legend>
          <span className="nx-n">1</span>Which tools do you use now?
        </legend>
        <div className="nx-tool-grid">
          {(Object.entries(TOOLS) as Array<[ToolId, string]>).map(([id, label]) => (
            <label key={id} className="nx-tool">
              <input type="checkbox" name="tools" value={id} />
              <span>
                {id === "other" ? (
                  <i className="nx-tool-other" aria-hidden="true">
                    +
                  </i>
                ) : (
                  <img src={tool(id)} alt="" width={20} height={20} />
                )}
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        <span>
          <span className="nx-n">2</span>Your biggest challenge, in a few words
        </span>
        <input
          name="challenge"
          maxLength={300}
          placeholder="e.g. finding my first buyers"
          required
        />
      </label>
      <fieldset>
        <legend>
          <span className="nx-n">3</span>Who are you?
        </legend>
        <div className="nx-row">
          <input
            name="name"
            autoComplete="name"
            placeholder="Your name"
            aria-label="Name"
            required
          />
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourcompany.com"
            aria-label="Work email"
            required
          />
        </div>
      </fieldset>
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
      <p className="nx-fine">
        Rather skip the form? <Book where="form">Book a 30 min call with me</Book>.
      </p>
    </form>
  );
}

const tool = (name: string) =>
  `/next/tools/${name}.${["instantly", "linkedin", "apollo", "clay", "chatgpt", "grok", "hunter", "pipedrive"].includes(name) ? "png" : "svg"}`;

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

/** New to sales: what the Mac app does today (checked in packages/desktop, 4 Nov 2026). */
const DAY_ONE: Array<[string, string]> = [
  ["note-pencil", "Tell it what you built."],
  ["users-three", "See who might need it, and where they said so."],
  ["envelope-simple", "Find where to reach them."],
  ["paper-plane-tilt", "Get the first message written."],
  ["user-plus", "Track them in your pipeline."],
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
  // ?cta=pain shows the pain-first close (5 Nov test); the default keeps the film's words.
  const [pain, setPain] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search).get("cta") === "pain";
    setPain(p);
    initPosthog();
    capture("next_view", { cta: p ? "pain" : "film" });
  }, []);
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
            You like to <em>sell</em>. Not to sit and research.
          </h1>
          <p className="nx-lede">
            People ask for tools in public every day. IcpFinder finds the ones asking for what you
            built, and writes the first message.
          </p>
          <Film />
          <div className="nx-ctas">
            <a className="nx-btn nx-btn-red" href="#talk">
              Join the small beta
            </a>
            <a
              className="nx-btn nx-btn-glass"
              href={BOOK}
              target="_blank"
              rel="noopener"
              onClick={() => capture("book_click", { where: "hero" })}
            >
              Book a call with me
            </a>
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
          <p className="nx-lede nx-in">Maybe solo, maybe with a tiny team.</p>
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
          <p className="nx-lede nx-in nx-after">All you really want is to do the job.</p>
        </section>

        {/* 3. What if it all lived in one place */}
        <section className="nx-beat">
          <h2 className="nx-in">
            What if all of this lived in <em>one place</em>?
          </h2>
          <p className="nx-lede nx-in">One view, with the same data.</p>
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
          <p className="nx-note nx-in">You keep your tools. You stop jumping between them.</p>
        </section>

        {/* 4. An agent on top */}
        <section className="nx-beat">
          <h2 className="nx-in">
            And an <em>agent</em> that does the work with you.
          </h2>
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

        {/* 6. New to sales, or years in: the founder's stage, not a product timeline */}
        <section className="nx-beat">
          <h2 className="nx-in">
            New to sales, or ten years in. <em>Same harness.</em>
          </h2>
          <div className="nx-two">
            <article className="nx-card nx-glass nx-in">
              <h3>New to sales</h3>
              <p>You just shipped. You&rsquo;ve never sold.</p>
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
              <h3>Selling for years</h3>
              <p>You have your tools. Plug them in.</p>
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
                <a href="https://github.com/clickspider/icpfinder">Open source</a>, MIT.
              </span>
            </li>
            <li>
              <Glyph name="plug" />
              Runs on the plan you already pay for.
            </li>
            <li>
              <Glyph name="lock-key" />
              Your workspace stays on your Mac.
            </li>
            <li>
              <Glyph name="cloud" />A cloud version is coming.
            </li>
          </ul>
          <p className="nx-fine nx-in">Your provider&rsquo;s plan limits apply.</p>
        </section>

        {/* 8. Close: one person, one place. Let's talk. */}
        <section className="nx-beat nx-close" id="talk">
          {pain ? (
            <>
              <h2 className="nx-in">
                Stuck finding your first <em>customers</em>?
              </h2>
              <p className="nx-lede nx-in">
                30 minutes, one on one. We find who needs what you built.
              </p>
            </>
          ) : (
            <>
              <h2 className="nx-in">
                One person, <em>one place</em>.
              </h2>
              <p className="nx-lede nx-in">We&rsquo;re running a small beta, one on one.</p>
            </>
          )}
          <div className="nx-glass nx-apply nx-in" id="apply">
            <div className="nx-me">
              <Face name="daniel" size={52} />
              <p>
                <b>Let&rsquo;s talk.</b> I&rsquo;m Daniel. I read every answer and set it up with
                you.
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
