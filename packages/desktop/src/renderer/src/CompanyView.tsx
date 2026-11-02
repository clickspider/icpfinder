// SPDX-License-Identifier: MIT
//
// Company research organized by fit, timing, and background, with full evidence
// available inline and contact routes alongside.

import type { FindingKind } from "@icpfinder/core";
import { useEffect, useRef, useState } from "react";
import { LINKEDIN, linkedinFor } from "../../shared/people";
import type { ActionId, State, Workspace } from "../../shared/types";
import type { View } from "./App";
import { CitedResearch, CompanyResearch, CompanyUpdates } from "./CompanyResearch";
import "./company-view.css";
import { ReachCard } from "./ReachCard";
import { api, friendly, initial, Snap, Spinner, ToolLogo } from "./ui";

const KIND: Record<FindingKind, { title: string; path: string }> = {
  why_now: { title: "Recent signals", path: "M13 2L4 14h7l-1 8 9-12h-7z" },
  person: {
    title: "People to consider",
    path: "M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0",
  },
  what_they_sell: {
    title: "What they offer",
    path: "M3 11.5V4a1 1 0 011-1h7.5L21 12.5 12.5 21z M7.5 7.5h.01",
  },
  their_need: {
    title: "Potential needs",
    path: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7a5 5 0 100 10 5 5 0 000-10z M12 11a1 1 0 100 2 1 1 0 000-2z",
  },
  linkedin_post: { title: "Their posts", path: "M4 5h16v11H8l-4 4z" },
  tech_stack: {
    title: "Tools they use",
    path: "M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  },
  disqualifier: {
    title: "Fit considerations",
    path: "M12 3a9 9 0 100 18 9 9 0 000-18z M5.6 5.6l12.8 12.8",
  },
};
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
    title: "Draft an email",
    sub: "Based on supported findings",
    path: "M3 6h18v12H3z M3 7l9 6 9-6",
    tint: "#fff0f3",
    ink: "#e0244a",
  },
  {
    id: "linkedin",
    title: "Draft a LinkedIn note",
    brand: "linkedin",
    sub: "A short connection message",
    path: "M4 4h16v16H4z M8 10v6 M8 7v.01 M12 16v-4a2 2 0 014 0v4 M12 10v6",
    tint: "#e8f1fe",
    ink: "#0a66c2",
  },
  {
    id: "intros",
    title: "Explore introduction paths",
    sub: "Look for relevant public connections",
    path: "M8 12a3 3 0 100-6 3 3 0 000 6z M16 12a3 3 0 100-6 3 3 0 000 6z M2 20a6 6 0 0112 0 M10 20a6 6 0 0112 0",
    tint: "#f1e6ff",
    ink: "#8e2fc0",
  },
  {
    id: "brief",
    title: "Prepare for a call",
    sub: "Key context and questions to ask",
    path: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h6 M9 16h6",
    tint: "#fff3e0",
    ink: "#c25400",
  },
  {
    id: "findEmail",
    title: "Find a work email",
    brand: "hunter",
    sub: "Their site, then Hunter",
    path: "M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0 M17 3l4 4",
    tint: "#ffece4",
    ink: "#d84315",
  },
  {
    id: "gmailDraft",
    title: "Create a Gmail draft",
    brand: "gmail",
    sub: "Requires the Claude Gmail connector",
    path: "M3 6h18v12H3z M3 7l9 6 9-6 M16 15l2 2 3-4",
    tint: "#fdecea",
    ink: "#c5221f",
  },
  {
    id: "live",
    title: "Prepare a LinkedIn request",
    brand: "linkedin",
    sub: "Opens a browser task",
    path: "M3 5h18v12H3z M8 21h8 M12 17v4 M10 9l4 2-4 2z",
    tint: "#fff0f3",
    ink: "#e0244a",
  },
  {
    id: "openLinkedIn",
    title: "Search LinkedIn",
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
      <div style={{ fontSize: 17, fontWeight: 800 }}>Worth a closer look?</div>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>
        Start deeper research to learn more about this company.
      </div>
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
      <button type="button" className="btn native-row-action" onClick={() => onAnswer(true)}>
        Research company
      </button>
      <button
        type="button"
        className="btn native-row-action native-row-action-muted"
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
  const resultPanel = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<ActionId | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [findingReach, setFindingReach] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [hunterKey, setHunterKey] = useState("");
  const [pasting, setPasting] = useState(false);
  const [liDraft, setLiDraft] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (updatesOpen && c?.signals?.some((x) => !x.seen))
      void api()
        .markSeen(icpId, domain)
        .then(onState)
        .catch(() => setError("Couldn’t mark updates as read."));
  }, [c?.signals, icpId, domain, updatesOpen, onState]);
  useEffect(() => {
    if (shown) resultPanel.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [shown]);
  if (!icp || !c) return null;
  const r = c.research;
  const personFinding = r?.findings.find(
    (f) => f.kind === "person" && f.status === "proven" && f.person
  );
  const person = personFinding?.person;
  const opener = r?.opener.map((l) => l.text).join(" ") ?? "";
  const result = shown ? c.actions?.[shown] : undefined;
  // Stored LinkedIn URLs are routes, not proof of ownership or verification.
  const li = linkedinFor(c);
  const liSub = li
    ? li.url.includes("/company/")
      ? "Company-page link"
      : "Profile link"
    : "No LinkedIn link available";
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
    if (!c.actions?.[id] || c.actions[id]?.status === "failed")
      void api()
        .runAction(icpId, c.domain, id)
        .then(onState)
        .catch(() => setError("Couldn’t start this action. Please try again."));
  };
  const copy = async (what: string, t: string) => {
    try {
      await api().copyText(t);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Couldn’t copy. Try again.");
    }
  };

  return (
    <div
      className="enter native-company"
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
        style={{
          flex: 1,
          padding: "28px 36px 56px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
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
              <span className="company-muted">
                Match score {c.match ?? r?.fitScore ?? "–"} / 100
              </span>
              {r && (
                <span className="company-muted">
                  Researched {new Date(r.researchedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </header>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {r && (
          <p className="native-muted" role="status">
            {c.status === "researching"
              ? "Researching this company… Earlier findings remain below."
              : c.status === "queued"
                ? "Research queued. Earlier findings remain below."
                : c.status === "failed"
                  ? "We couldn’t complete the research. Available findings remain below."
                  : "Research complete"}
            {c.status === "failed" && (
              <button
                type="button"
                className="native-secondary"
                onClick={() =>
                  void api()
                    .researchCompany(icpId, c.domain)
                    .then(onState)
                    .catch(() => setError("Couldn’t restart research."))
                }
              >
                Try again
              </button>
            )}
          </p>
        )}
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
                  {c.status === "researching" ? "Researching this company…" : "Research queued"}
                </div>
                <div style={{ color: "var(--muted)" }}>
                  We’ll check the quoted evidence against its sources.
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
                title={
                  c.status === "failed"
                    ? "We couldn’t complete the research."
                    : "Not researched yet"
                }
                text={c.error ? friendly(c.error) : undefined}
                cta={c.status === "failed" ? "Try again" : `Research ${c.name}`}
                onCta={() => void api().researchCompany(icpId, c.domain).then(onState)}
              />
            )}
          </div>
        ) : (
          <div className="company-detail-columns">
            <CompanyResearch
              key={`${icpId}-${domain}`}
              company={c}
              onUpdatesViewed={() => {
                void api()
                  .markSeen(icpId, domain)
                  .then(onState)
                  .catch(() => setError("Couldn’t mark updates as read."));
              }}
            />
            <aside>
              <ReachCard
                key={`${icpId}-${domain}`}
                icpId={icpId}
                c={c}
                person={personFinding}
                onState={onState}
              />
              {(c.signals?.length ?? 0) > 0 && (
                <details
                  className="company-disclosure"
                  open={updatesOpen}
                  onToggle={(event) => setUpdatesOpen(event.currentTarget.open)}
                >
                  <summary>
                    {c.signals?.some((s) => !s.seen)
                      ? `New updates (${c.signals.filter((s) => !s.seen).length})`
                      : `Updates (${c.signals?.length})`}
                  </summary>
                  <CompanyUpdates company={c} />
                </details>
              )}
              <details className="company-disclosure company-more-actions">
                <summary>More actions</summary>
                <h3>Refresh information</h3>
                <div className="company-maintenance">
                  <button
                    type="button"
                    className="secondary btn"
                    disabled={watching}
                    onClick={() => {
                      setWatching(true);
                      void api()
                        .watchNow(icpId, c.domain)
                        .then(onState)
                        .catch(() => setError("Couldn’t check for updates. Try again."))
                        .finally(() => setWatching(false));
                    }}
                  >
                    {watching ? "Checking for updates…" : "Check for updates"}
                  </button>
                  <button
                    type="button"
                    className="secondary btn"
                    disabled={findingReach}
                    onClick={() => {
                      setFindingReach(true);
                      void api()
                        .findReach(icpId, c.domain)
                        .then(onState)
                        .catch(() => setError("Couldn’t check contact routes. Try again."))
                        .finally(() => setFindingReach(false));
                    }}
                  >
                    {findingReach ? "Checking…" : "Look for contact routes again"}
                  </button>
                </div>
                <p className="company-muted">
                  Checking for updates uses AI tokens. Contact-route lookup does not.
                </p>
                {opener && (
                  <details className="company-disclosure">
                    <summary>Saved suggested opener</summary>
                    <CitedResearch lines={r.opener} findings={r.findings} />
                    <button
                      type="button"
                      className="secondary btn"
                      onClick={() => void copy("opener", opener)}
                    >
                      {copied === "opener" ? "Copied" : "Copy opener"}
                    </button>
                  </details>
                )}
                <h3>Research and outreach</h3>
                <p className="company-muted">
                  AI actions use tokens from your connected provider. Review any draft before
                  sending.
                </p>
                <div className="company-action-list">
                  {ACTIONS.map((a) => {
                    const st =
                      a.id !== "openLinkedIn" && a.id !== "live" ? c.actions?.[a.id] : undefined;
                    const unverified = a.id === "openLinkedIn" && !li;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`btn secondary company-action-row ${shown === a.id ? "selected" : ""}`}
                        onClick={() => run(a)}
                        aria-expanded={
                          a.id === "openLinkedIn"
                            ? !li
                              ? pasting
                              : undefined
                            : a.id === "live"
                              ? undefined
                              : shown === a.id
                        }
                        aria-controls={shown === a.id ? "company-action-result" : undefined}
                        title={unverified ? "No LinkedIn link available" : undefined}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {a.id === "openLinkedIn"
                              ? li
                                ? "Open LinkedIn page"
                                : "Add LinkedIn link"
                              : a.title}
                          </div>
                          {st && (
                            <small role={st.status === "running" ? "status" : undefined}>
                              {st.status === "running"
                                ? "Working…"
                                : st.status === "done"
                                  ? "Saved result"
                                  : "Failed — try again"}
                            </small>
                          )}
                          <div className="ellipsis" style={{ fontSize: 11, color: "var(--muted)" }}>
                            {a.id === "openLinkedIn" ? liSub : a.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </details>

              {pasting && !li && (
                <div
                  className="panel pop"
                  style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <ToolLogo name="linkedin" size={18} radius={4} />
                    <b style={{ fontSize: 13 }}>No LinkedIn link available</b>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                    Add a profile or company-page link to save it with this company.
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
                <div
                  ref={resultPanel}
                  id="company-action-result"
                  className="panel pop"
                  role="status"
                  style={{ padding: 14 }}
                >
                  {result?.status === "done" && (
                    <button
                      type="button"
                      className="native-secondary"
                      onClick={() =>
                        void api()
                          .runAction(icpId, c.domain, shown)
                          .then(onState)
                          .catch(() => setError("Couldn’t start this action."))
                      }
                    >
                      {shown === "gmailDraft"
                        ? "Create another Gmail draft"
                        : shown === "findEmail"
                          ? "Search again"
                          : "Generate again"}
                    </button>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="lbl">{ACTIONS.find((a) => a.id === shown)?.title}</div>
                    {result?.status === "done" && result.text && (
                      <button
                        type="button"
                        className="secondary btn"
                        style={{ marginLeft: "auto" }}
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
                        Working…
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
                          style={{ fontSize: 13 }}
                        />
                        <button
                          type="button"
                          className="primary btn"
                          disabled={!hunterKey.trim()}
                          onClick={async () => {
                            setError("");
                            try {
                              const v = await api().verifyHunter(hunterKey);
                              if (!v.ok) {
                                setError(v.error ?? "Couldn’t check Hunter.");
                                return;
                              }
                              onState(await api().saveSettings({ hunterKey: hunterKey.trim() }));
                              onState(await api().runAction(icpId, c.domain, "findEmail"));
                            } catch {
                              setError("Couldn’t complete the email lookup. Try again.");
                            }
                          }}
                        >
                          Connect and find email
                        </button>
                      </div>
                    )}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};
