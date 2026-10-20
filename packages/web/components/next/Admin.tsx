// SPDX-License-Identifier: MIT
"use client";

import { type FormEvent, useState } from "react";
import type { ApplicationRow, Tier } from "../../lib/applications";
import { OPTIONS } from "../../lib/apply-options";

async function post(
  url: string,
  body: unknown
): Promise<{ ok: boolean; json: Record<string, string> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

export function AdminLogin() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [msg, setMsg] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get("v") ?? "");
    if (step === "email") {
      const r = await post("/api/next-admin/code", { email: v });
      if (!r.ok) return setMsg(r.json.error ?? "Could not send.");
      setMsg("If this email is an admin, a code is on its way.");
      return setStep("code");
    }
    const r = await post("/api/next-admin/verify", { code: v });
    if (!r.ok) return setMsg(r.json.error ?? "Wrong code.");
    location.reload();
  }

  return (
    <form className="nx-glass nx-apply nx-form nx-login" onSubmit={submit}>
      <h2>Sign in</h2>
      <label>
        <span>{step === "email" ? "Your email" : "The 8-digit code from your email"}</span>
        <input
          key={step}
          name="v"
          type={step === "email" ? "email" : "text"}
          inputMode={step === "code" ? "numeric" : "email"}
          autoComplete={step === "code" ? "one-time-code" : "email"}
          required
        />
      </label>
      {msg && <p className="nx-fine">{msg}</p>}
      <button className="nx-btn nx-btn-dark" type="submit">
        {step === "email" ? "Email me a code" : "Sign in"}
      </button>
    </form>
  );
}

const TIERS: Array<[Tier | "all", string]> = [
  ["priority", "Priority"],
  ["review", "Review"],
  ["later", "Later"],
  ["all", "All"],
];
const label = <K extends keyof typeof OPTIONS>(k: K, v: string) =>
  (OPTIONS[k] as Record<string, string>)[v] ?? v;
const href = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

function Row({ r }: { r: ApplicationRow }) {
  const [invitedAt, setInvitedAt] = useState(r.invitedAt);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function invite() {
    if (!confirm(`Send the "You're in" email to ${r.name} <${r.email}>?`)) return;
    setBusy(true);
    const res = await post("/api/next-admin/invite", { id: r.id });
    setBusy(false);
    if (!res.ok) return setErr(res.json.error ?? "Failed.");
    setInvitedAt(res.json.invitedAt ?? new Date().toISOString());
  }

  return (
    <article className="nx-glass nx-app">
      <div className="nx-app-head">
        <div>
          <h3>
            {r.name}{" "}
            <span className={`nx-tier nx-tier-${r.tier}`}>
              {r.tier} · {r.score}
            </span>
          </h3>
          <p className="nx-fine">
            <a href={`mailto:${r.email}`}>{r.email}</a> ·{" "}
            <a href={href(r.productUrl)} target="_blank" rel="noreferrer">
              {r.productUrl}
            </a>{" "}
            ·{" "}
            <a href={href(r.profileUrl)} target="_blank" rel="noreferrer">
              profile
            </a>{" "}
            · {new Date(r.createdAt).toLocaleDateString()}
          </p>
        </div>
        {invitedAt ? (
          <span className="nx-pill-ok">Invited {new Date(invitedAt).toLocaleDateString()}</span>
        ) : (
          <button
            type="button"
            className="nx-btn nx-btn-dark nx-btn-sm"
            onClick={invite}
            disabled={busy}
          >
            {busy ? "Sending…" : "Invite"}
          </button>
        )}
      </div>
      <div className="nx-answers">
        <span>{label("role", r.role)}</span>
        <span>{label("salesTeam", r.salesTeam)}</span>
        <span>{label("stage", r.stage)}</span>
        <span>{label("years", r.years)} shipping</span>
        <span>Claude/Codex: {label("agent", r.agent)}</span>
      </div>
      <p className="nx-first-week">“{r.firstWeek}”</p>
      {err && <p className="nx-error">{err}</p>}
    </article>
  );
}

export function AdminList({ rows }: { rows: ApplicationRow[] }) {
  const [tier, setTier] = useState<Tier | "all">("priority");
  const shown = tier === "all" ? rows : rows.filter((r) => r.tier === tier);
  const count = (t: Tier | "all") =>
    t === "all" ? rows.length : rows.filter((r) => r.tier === t).length;
  return (
    <section className="nx-section">
      <div className="nx-admin-top">
        <h2>Beta applications</h2>
        <button
          type="button"
          className="nx-btn nx-btn-glass nx-btn-sm"
          onClick={() => post("/api/next-admin/logout", {}).then(() => location.reload())}
        >
          Sign out
        </button>
      </div>
      <div className="nx-tabs" role="tablist">
        {TIERS.map(([t, name]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tier === t}
            className="nx-tab"
            onClick={() => setTier(t)}
          >
            {name} <span>{count(t)}</span>
          </button>
        ))}
      </div>
      <div className="nx-apps">
        {shown.length ? (
          shown.map((r) => <Row key={r.id} r={r} />)
        ) : (
          <p className="nx-fine">No applications here yet.</p>
        )}
      </div>
    </section>
  );
}
