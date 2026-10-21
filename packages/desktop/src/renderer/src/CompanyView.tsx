// SPDX-License-Identifier: MIT
//
// One company in the context of one ICP. Visual first: icons per section,
// one line per fact with a proof dot, sources on click. On the right: the fit,
// and next steps that Claude (or Hunter) does for you.

import type { Finding, FindingKind } from "@icpfinder/core";
import { useEffect, useState } from "react";
import { LINKEDIN, linkedinFor } from "../../shared/people";
import type { ActionId, State, Workspace } from "../../shared/types";
import type { View } from "./App";
import { api, friendly, host, initial, Snap, Spinner, ToolLogo } from "./ui";

const KIND: Record<FindingKind, { title: string; path: string }> = {
  why_now: { title: "Why now", path: "M13 2L4 14h7l-1 8 9-12h-7z" },
  person: { title: "Who", path: "M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0" },
  what_they_sell: {
    title: "What they sell",
    path: "M3 11.5V4a1 1 0 011-1h7.5L21 12.5 12.5 21z M7.5 7.5h.01",
  },
  their_need: {
    title: "Their pain",
    path: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7a5 5 0 100 10 5 5 0 000-10z M12 11a1 1 0 100 2 1 1 0 000-2z",
  },
  linkedin_post: { title: "Their posts", path: "M4 5h16v11H8l-4 4z" },
  tech_stack: {
    title: "Tools they use",
    path: "M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  },
  disqualifier: { title: "Watch out", path: "M12 3a9 9 0 100 18 9 9 0 000-18z M5.6 5.6l12.8 12.8" },
};
const ORDER: FindingKind[] = [
  "why_now",
  "person",
  "their_need",
  "what_they_sell",
  "linkedin_post",
  "tech_stack",
  "disqualifier",
];
const PERSON_PATH = KIND.person.path;

const Icon = ({
  path,
  size = 16,
  color = "#3c3c43",
}: {
  path: string;
  size?: number;
  color?: string;
}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={path} />
  </svg>
);

const dot = (f: Finding) =>
  f.status === "proven" ? "#1f8a43" : f.status === "weak" ? "#d97706" : "#c7c7cc";
const rank = (f: Finding) => (f.status === "proven" ? 0 : f.status === "weak" ? 1 : 2);

const Fact = ({ f }: { f: Finding }) => (
  <details className="fact" style={{ borderRadius: 10 }}>
    <summary
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "6px 8px",
        borderRadius: 10,
      }}
    >
      <span
        title={f.status}
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: dot(f),
          marginTop: 7,
          flexShrink: 0,
        }}
      />
      <span
        className="clamp2"
        style={{
          flex: 1,
          lineHeight: 1.5,
          color: f.status === "rejected" ? "var(--faint)" : "var(--ink)",
          textDecoration: f.status === "rejected" ? "line-through" : undefined,
        }}
      >
        {f.claim}
      </span>
      {f.date && (
        <span style={{ fontSize: 12, color: "var(--faint)", whiteSpace: "nowrap" }}>{f.date}</span>
      )}
      <span className="fact-chev" aria-hidden="true">
        ⌄
      </span>
    </summary>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 8px 10px 26px" }}>
      {f.evidence.map((e) => (
        <div
          key={`${e.url}|${e.quote}`}
          style={{ fontSize: 13, padding: "8px 10px", borderRadius: 10, background: "#f7f7f8" }}
        >
          <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
            <a
              href={e.url}
              onClick={(ev) => {
                ev.preventDefault();
                void api().openExternal(e.url);
              }}
            >
              {host(e.url)}
            </a>
            <span
              style={{
                marginLeft: "auto",
                color: e.check === "verified" ? "var(--green)" : "var(--amber)",
              }}
            >
              {e.check === "verified" ? "✓ quote on page" : e.check.replace(/_/g, " ")}
            </span>
          </div>
          <div
            style={{ marginTop: 3, lineHeight: 1.45, userSelect: "text", color: "var(--ink-2)" }}
          >
            “{e.quote}”
          </div>
        </div>
      ))}
    </div>
  </details>
);

const FitRing = ({ score }: { score: number | null }) => {
  const s = score ?? 0;
  const color = s >= 67 ? "#1f8a43" : s >= 34 ? "#2f6fd6" : "#d97706";
  const c = 2 * Math.PI * 26;
  return (
    <div
      style={{ position: "relative", width: 64, height: 64 }}
      role="img"
      aria-label={`Match ${score ?? "unknown"} of 100`}
    >
      <svg aria-hidden="true" width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="#ececef" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(c * s) / 100} ${c}`}
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.23,1,0.32,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800 }}>{score ?? "–"}</div>
        <div
          style={{ fontSize: 9, fontWeight: 600, color: "var(--faint)", letterSpacing: "0.05em" }}
        >
          FIT
        </div>
      </div>
    </div>
  );
};

type Action = {
  id: ActionId | "openLinkedIn" | "live";
  title: string;
  sub: string;
  path: string;
  tint: string;
  ink: string;
  /** Their own logo instead of a drawn icon, for tools and sites we act through. */
  brand?: string;
};
const ACTIONS: Action[] = [
  {
    id: "email",
    title: "Write the email",
    sub: "From proven facts only",
    path: "M3 6h18v12H3z M3 7l9 6 9-6",
    tint: "#fff0f3",
    ink: "#e0244a",
  },
  {
    id: "linkedin",
    title: "LinkedIn note",
    brand: "linkedin",
    sub: "280 characters, human",
    path: "M4 4h16v16H4z M8 10v6 M8 7v.01 M12 16v-4a2 2 0 014 0v4 M12 10v6",
    tint: "#e8f1fe",
    ink: "#0a66c2",
  },
  {
    id: "intros",
    title: "Find warm intros",
    brand: "claude",
    sub: "Your AI searches the web",
    path: "M8 12a3 3 0 100-6 3 3 0 000 6z M16 12a3 3 0 100-6 3 3 0 000 6z M2 20a6 6 0 0112 0 M10 20a6 6 0 0112 0",
    tint: "#f1e6ff",
    ink: "#8e2fc0",
  },
  {
    id: "brief",
    title: "Call prep brief",
    sub: "6 lines before you talk",
    path: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h6 M9 16h6",
    tint: "#fff3e0",
    ink: "#c25400",
  },
  {
    id: "findEmail",
    title: "Find their email",
    brand: "hunter",
    sub: "Their site, then Hunter",
    path: "M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0 M17 3l4 4",
    tint: "#ffece4",
    ink: "#d84315",
  },
  {
    id: "gmailDraft",
    title: "Draft in Gmail",
    brand: "gmail",
    sub: "Via your Claude connector",
    path: "M3 6h18v12H3z M3 7l9 6 9-6 M16 15l2 2 3-4",
    tint: "#fdecea",
    ink: "#c5221f",
  },
  {
    id: "live",
    title: "Connect on LinkedIn, live",
    brand: "linkedin",
    sub: "Watch your AI do it · asks before sending",
    path: "M3 5h18v12H3z M8 21h8 M12 17v4 M10 9l4 2-4 2z",
    tint: "#fff0f3",
    ink: "#e0244a",
  },
  {
    id: "openLinkedIn",
    title: "Open on LinkedIn",
    brand: "linkedin",
    sub: "In your browser",
    path: "M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6",
    tint: "#f2f2f4",
    ink: "#3c3c43",
  },
];

const VERDICT = {
  yes: { mark: "✓", cls: "p-green" },
  no: { mark: "✕", cls: "p-red" },
  unknown: { mark: "?", cls: "p-gray" },
} as const;

/** Before any deep research: show why it matches, and let the founder decide. */
const Approval = ({
  c,
  onAnswer,
}: {
  c: import("../../shared/types").Company;
  onAnswer: (ok: boolean) => void;
}) => (
  <div
    className="panel pop"
    style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 17, fontWeight: 800 }}>Is this a fit?</div>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>Research starts after you approve.</div>
    </div>
    {c.trigger && (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "#fff3e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon path={KIND.why_now.path} size={15} color="#c25400" />
        </div>
        <div style={{ lineHeight: 1.45 }}>
          {c.trigger.text}
          {c.trigger.date && <span style={{ color: "var(--faint)" }}> · {c.trigger.date}</span>}
        </div>
      </div>
    )}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {(c.checks ?? []).map((k) => (
        <span
          key={k.criterion}
          title={k.evidence}
          className={`pill ${VERDICT[k.verdict].cls}`}
          style={{ fontWeight: 500 }}
        >
          {VERDICT[k.verdict].mark} {k.criterion.replace(/\s*\(source:[^)]*\)/i, "")}
        </span>
      ))}
    </div>
    <div style={{ display: "flex", gap: 10 }}>
      <button
        type="button"
        className="primary btn"
        style={{ flex: 1 }}
        onClick={() => onAnswer(true)}
      >
        ✓ Approve fit
      </button>
      <button
        type="button"
        className="secondary btn"
        style={{ height: 44 }}
        onClick={() => onAnswer(false)}
      >
        Not a fit
      </button>
    </div>
  </div>
);

export const CompanyView = ({
  ws,
  icpId,
  domain,
  go,
  onState,
}: {
  ws: Workspace;
  icpId: string;
  domain: string;
  go: (v: View) => void;
  onState: (s: State) => void;
}) => {
  const icp = ws.icps.find((i) => i.id === icpId);
  const c = icp?.companies.find((x) => x.domain === domain);
  const [shown, setShown] = useState<ActionId | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [hunterKey, setHunterKey] = useState("");
  const [pasting, setPasting] = useState(false);
  const [liDraft, setLiDraft] = useState("");
  useEffect(() => {
    if (c?.signals?.some((x) => !x.seen)) void api().markSeen(icpId, domain);
  }, [c?.signals, icpId, domain]);
  if (!icp || !c) return null;
  const r = c.research;
  const nProven = r?.findings.filter((f) => f.status === "proven").length ?? 0;
  const nWeak = r?.findings.filter((f) => f.status === "weak").length ?? 0;
  const person = r?.findings.find((f) => f.kind === "person" && f.person)?.person;
  const opener = r?.opener.map((l) => l.text).join(" ") ?? "";
  const result = shown ? c.actions?.[shown] : undefined;
  // A real profile or company page only. Unverified = grayed out, the founder can paste one.
  const li = linkedinFor(c);
  const liSub = li
    ? li.who
      ? `${li.who}'s profile`
      : li.url.includes("/company/")
        ? "Company page"
        : "Your saved profile"
    : "Not verified · add the link";
  const liValid = LINKEDIN.test(liDraft.trim().replace(/^http:\/\//, "https://"));
  const searchLinkedIn = () => {
    const q = encodeURIComponent(`${person?.name ?? ""} ${c.name}`.trim());
    void api().openExternal(`https://www.linkedin.com/search/results/all/?keywords=${q}`);
  };

  const run = (a: Action) => {
    if (a.id === "live") {
      const note = c.actions?.linkedin?.text ?? opener;
      return go({
        kind: "agent",
        title: `Browser agent on LinkedIn · ${c.name}`,
        url: "https://www.linkedin.com/feed/",
        back: { kind: "company", icpId, domain: c.domain },
        task: `Find ${person ? `${person.name} (${person.role}) at` : "the founder or growth lead of"} ${c.name} (${c.domain}) on LinkedIn and prepare a connection request${note ? ` with a note based on this text (shorten it to fit LinkedIn's limit, keep it a complete sentence):\n\n${note}` : ""}.\nIf LinkedIn asks to log in, say so and stop. Ask the founder before you send the request.`,
      });
    }
    if (a.id === "openLinkedIn") {
      if (li) return void api().openExternal(li.url);
      return setPasting(!pasting);
    }
    const id = a.id;
    setShown(id);
    if (c.actions?.[id]?.status !== "running")
      void api().runAction(icpId, c.domain, id).then(onState);
  };
  const copy = (what: string, t: string) => {
    void navigator.clipboard.writeText(t);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      className="enter"
      style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <div
        className="drag"
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 20px",
          fontSize: 13,
          color: "var(--muted)",
          borderBottom: "0.5px solid rgba(0,0,0,0.07)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          className="btn"
          style={{ background: "transparent", color: "var(--muted)", padding: 0 }}
          onClick={() => go({ kind: "icp", icpId })}
        >
          {icp.name}
        </button>
        <span aria-hidden="true">›</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{c.name}</span>
      </div>

      <div
        className="scroll"
        style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 16 }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {c.logo ? (
            <img
              src={c.logo}
              alt=""
              width={56}
              height={56}
              style={{
                width: 56,
                height: 56,
                borderRadius: 15,
                objectFit: "contain",
                background: "#fff",
                boxShadow: "0 0 0 0.5px rgba(0,0,0,0.12), 0 6px 16px rgba(0,0,0,0.08)",
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 15,
                background: "#111114",
                color: "#fff",
                fontSize: 24,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initial(c.name)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
              {c.name}
            </h1>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              <a
                href={`https://${c.domain}`}
                onClick={(e) => {
                  e.preventDefault();
                  void api().openExternal(`https://${c.domain}`);
                }}
                style={{ fontSize: 13 }}
              >
                {c.domain}
              </a>
              {r && <span className="pill p-green">● {nProven} proven</span>}
              {r && nWeak > 0 && <span className="pill p-amber">{nWeak} unproven</span>}
              {person && (
                <span className="pill p-gray">
                  <Icon path={PERSON_PATH} size={12} />
                  {person.name}
                </span>
              )}
            </div>
          </div>
          <FitRing score={c.match ?? r?.fitScore ?? null} />
        </header>

        {c.approval !== "approved" ? (
          <Approval
            c={c}
            onAnswer={(ok) => void api().approveCompany(icpId, c.domain, ok).then(onState)}
          />
        ) : !r ? (
          <div
            className="panel"
            style={{
              padding: 28,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
            }}
          >
            {c.status === "researching" || c.status === "queued" ? (
              <>
                <Spinner />
                <div style={{ fontWeight: 600 }}>
                  {c.status === "researching" ? "Your AI is researching" : "In the queue"}
                </div>
                <div style={{ color: "var(--muted)" }}>
                  Then the code checks every quote on its page.
                </div>
                <button
                  type="button"
                  className="btn stop-btn"
                  onClick={() => void api().stopResearch(icpId, c.domain).then(onState)}
                >
                  {c.status === "researching" ? "Stop research" : "Take out of the queue"}
                </button>
              </>
            ) : (
              <Snap
                kind={c.status === "failed" ? "error" : "start"}
                title={c.status === "failed" ? "Snap, the research broke" : "Not researched yet"}
                text={c.error ? friendly(c.error) : undefined}
                cta={c.status === "failed" ? "Try again" : `Research ${c.name}`}
                onCta={() => void api().researchCompany(icpId, c.domain).then(onState)}
              />
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <section
              className="panel"
              style={{ flex: 1.25, padding: "8px 10px", minWidth: 0 }}
              aria-label="What we know"
            >
              {c.checks && c.checks.length > 0 && (
                <div
                  style={{ padding: "8px 14px 10px", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 0 6px" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Why it matches your ICP</div>
                    <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>
                      {c.checks.filter((x) => x.verdict === "yes").length} of {c.checks.length}{" "}
                      confirmed
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {c.checks.map((k) => (
                      <span
                        key={k.criterion}
                        title={k.evidence}
                        className={`pill ${k.verdict === "yes" ? "p-green" : k.verdict === "no" ? "p-red" : "p-gray"}`}
                        style={{ whiteSpace: "normal", fontWeight: 500 }}
                      >
                        {k.verdict === "yes" ? "✓" : k.verdict === "no" ? "✕" : "?"} {k.criterion}
                      </span>
                    ))}
                  </div>
                  {c.trigger && (
                    <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-2)" }}>
                      <b style={{ fontWeight: 600 }}>Signal: </b>
                      {c.trigger.text}
                      {c.trigger.url && (
                        <>
                          {" "}
                          <a
                            href={c.trigger.url}
                            onClick={(e) => {
                              e.preventDefault();
                              void api().openExternal(c.trigger?.url ?? "");
                            }}
                          >
                            source
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {ORDER.map((kind) => {
                const fs = r.findings
                  .filter((f) => f.kind === kind)
                  .sort((a, b) => rank(a) - rank(b));
                if (fs.length === 0) return null;
                const k = KIND[kind];
                return (
                  <div
                    key={kind}
                    style={{ padding: "8px 6px", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "0 8px 4px",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          background: "#f2f2f4",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon path={k.path} size={14} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{k.title}</div>
                    </div>
                    {fs.slice(0, 2).map((f) => (
                      <Fact key={f.id} f={f} />
                    ))}
                    {fs.length > 2 && (
                      <details>
                        <summary
                          style={{
                            fontSize: 12,
                            color: "var(--muted)",
                            padding: "2px 8px 2px 26px",
                          }}
                        >
                          + {fs.length - 2} more
                        </summary>
                        {fs.slice(2).map((f) => (
                          <Fact key={f.id} f={f} />
                        ))}
                      </details>
                    )}
                  </div>
                );
              })}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "10px 14px 6px",
                  fontSize: 11,
                  color: "var(--faint)",
                }}
              >
                <span>
                  <span style={{ color: "#1f8a43" }}>●</span> 2+ websites
                </span>
                <span>
                  <span style={{ color: "#d97706" }}>●</span> 1 website
                </span>
                <span>
                  <span style={{ color: "#c7c7cc" }}>●</span> not found on page
                </span>
              </div>
            </section>

            <aside
              style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}
            >
              <div className="panel" style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#e0244a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9 M10 21a2 2 0 004 0" />
                  </svg>
                  <div className="lbl">Live signals</div>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      marginLeft: "auto",
                      background: "transparent",
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    disabled={watching}
                    onClick={() => {
                      setWatching(true);
                      void api()
                        .watchNow(icpId, c.domain)
                        .then(onState)
                        .finally(() => setWatching(false));
                    }}
                  >
                    {watching ? "Checking…" : "Check now"}
                  </button>
                </div>
                {(c.signals ?? []).length === 0 ? (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                    IcpFinder checks {c.name} and its founder every day while the app is open.
                    {c.watchedAt
                      ? ` Last check: ${new Date(c.watchedAt).toLocaleDateString()}.`
                      : ""}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {(c.signals ?? []).slice(0, 5).map((sig) => (
                      <div
                        key={sig.text}
                        style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.45 }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            marginTop: 7,
                            flexShrink: 0,
                            background: sig.seen ? "#d1d1d6" : "#e0244a",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          {sig.text}
                          <span style={{ color: "var(--faint)" }}>
                            {sig.date ? ` · ${sig.date}` : ""}
                          </span>
                          {sig.url && (
                            <>
                              {" "}
                              <a
                                href={sig.url}
                                onClick={(e) => {
                                  e.preventDefault();
                                  void api().openExternal(sig.url ?? "");
                                }}
                              >
                                source
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {opener && (
                <div
                  className="panel"
                  style={{
                    padding: 14,
                    background: "#fffafb",
                    boxShadow: "inset 0 0 0 1px #ffd6df",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="lbl">Your opener</div>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        marginLeft: "auto",
                        background: "transparent",
                        color: "var(--accent)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      onClick={() => copy("opener", opener)}
                    >
                      {copied === "opener" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div style={{ marginTop: 6, lineHeight: 1.5, userSelect: "text" }}>{opener}</div>
                </div>
              )}

              <div className="lbl" style={{ padding: "4px 2px 0" }}>
                Next steps · your AI does them
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {ACTIONS.map((a) => {
                  const st =
                    a.id !== "openLinkedIn" && a.id !== "live" ? c.actions?.[a.id] : undefined;
                  const unverified = a.id === "openLinkedIn" && !li;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className="btn rise"
                      onClick={() => run(a)}
                      aria-expanded={a.id === "openLinkedIn" && !li ? pasting : undefined}
                      title={unverified ? "We could not verify a LinkedIn page" : undefined}
                      style={{
                        opacity: unverified && !pasting ? 0.55 : 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: 12,
                        borderRadius: 14,
                        background: "#fff",
                        textAlign: "left",
                        boxShadow:
                          shown === a.id
                            ? `inset 0 0 0 2px ${a.ink}`
                            : "inset 0 0 0 0.5px rgba(0,0,0,0.12)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 9,
                            background: a.tint,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {a.brand ? (
                            <ToolLogo name={a.brand} size={30} radius={9} />
                          ) : (
                            <Icon path={a.path} size={16} color={a.ink} />
                          )}
                        </div>
                        <div style={{ marginLeft: "auto" }}>
                          {st?.status === "running" ? (
                            <Spinner />
                          ) : st?.status === "done" ? (
                            <span style={{ color: "var(--green)", fontSize: 12, fontWeight: 700 }}>
                              ✓
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
                        <div className="ellipsis" style={{ fontSize: 11, color: "var(--muted)" }}>
                          {a.id === "openLinkedIn" ? liSub : a.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {pasting && !li && (
                <div
                  className="panel pop"
                  style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <ToolLogo name="linkedin" size={18} radius={4} />
                    <b style={{ fontSize: 13 }}>Not verified on LinkedIn</b>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                    We could not find {person?.name ?? c.name} on LinkedIn. Found it? Paste the
                    profile or company link. It stays with this company.
                  </div>
                  <form
                    style={{ display: "flex", gap: 8 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!liValid) return;
                      void api()
                        .saveLinkedIn(icpId, c.domain, liDraft)
                        .then((s) => {
                          onState(s);
                          setPasting(false);
                          setLiDraft("");
                        });
                    }}
                  >
                    <input
                      className="field"
                      aria-label="LinkedIn link"
                      placeholder="https://www.linkedin.com/in/…"
                      value={liDraft}
                      onChange={(e) => setLiDraft(e.target.value)}
                      style={{ flex: 1, minWidth: 0, height: 34, fontSize: 13 }}
                    />
                    <button
                      type="submit"
                      className="ob-cta"
                      disabled={!liValid}
                      style={{ height: 34, fontSize: 12.5 }}
                    >
                      Save
                    </button>
                  </form>
                  {liDraft.trim() && !liValid && (
                    <div style={{ fontSize: 12, color: "#e0244a" }}>
                      Use a linkedin.com/in/ or linkedin.com/company/ link.
                    </div>
                  )}
                  <button
                    type="button"
                    className="ghost btn"
                    style={{ alignSelf: "flex-start", fontSize: 12, color: "var(--accent)" }}
                    onClick={searchLinkedIn}
                  >
                    Search LinkedIn for it
                  </button>
                </div>
              )}

              {shown && (
                <div className="panel pop" style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="lbl">{ACTIONS.find((a) => a.id === shown)?.title}</div>
                    {result?.status === "done" && result.text && (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          marginLeft: "auto",
                          background: "transparent",
                          color: "var(--accent)",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        onClick={() => copy("result", result.text ?? "")}
                      >
                        {copied === "result" ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      userSelect: "text",
                      color: result?.status === "failed" ? "var(--red)" : "var(--ink)",
                    }}
                  >
                    {!result || result.status === "running" ? (
                      <span
                        style={{
                          display: "inline-flex",
                          gap: 8,
                          alignItems: "center",
                          color: "var(--muted)",
                        }}
                      >
                        <Spinner />
                        Your AI is working on it…
                      </span>
                    ) : (
                      result.text
                    )}
                  </div>
                  {shown === "findEmail" &&
                    result?.status === "failed" &&
                    /Hunter/.test(result.text ?? "") && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <input
                          className="field"
                          type="password"
                          aria-label="Hunter API key"
                          placeholder="Paste your Hunter API key"
                          value={hunterKey}
                          onChange={(e) => setHunterKey(e.target.value)}
                          style={{ height: 38, fontSize: 13 }}
                        />
                        <button
                          type="button"
                          className="primary btn"
                          style={{ height: 38 }}
                          disabled={!hunterKey.trim()}
                          onClick={async () => {
                            const v = await api().verifyHunter(hunterKey);
                            if (!v.ok) return;
                            onState(await api().saveSettings({ hunterKey: hunterKey.trim() }));
                            onState(await api().runAction(icpId, c.domain, "findEmail"));
                          }}
                        >
                          Connect
                        </button>
                      </div>
                    )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 14,
                  border: "1px dashed #d1d1d6",
                  color: "var(--muted)",
                  fontSize: 12,
                }}
              >
                <Icon path="M3 5h18v12H3z M8 21h8 M12 17v4" size={18} color="#8a8a8e" />
                <div style={{ flex: 1 }}>
                  <b style={{ color: "var(--ink-2)" }}>Soon:</b> Codex support.
                </div>
              </div>

              {r.gaps.length > 0 && (
                <details className="panel" style={{ padding: "10px 14px" }}>
                  <summary style={{ fontSize: 13, fontWeight: 600 }}>
                    Still to check by hand ({r.gaps.length})
                  </summary>
                  <ul
                    style={{
                      margin: "8px 0 0",
                      paddingLeft: 18,
                      lineHeight: 1.6,
                      color: "var(--ink-2)",
                      fontSize: 13,
                    }}
                  >
                    {r.gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </details>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};
