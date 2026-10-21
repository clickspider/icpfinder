import { icpPresentation } from "../../shared/onboarding";
import { ProfileEditor } from "./ProfileEditor";
// SPDX-License-Identifier: MIT
//
// Main screen in the context of one ICP: who exactly (as short gates), and the
// companies that pass the product's bar. The founder approves a fit before any deep research.

import { useEffect, useMemo, useRef, useState } from "react";
import { type CompanyFacts, companiesToCheck, peopleInIcp } from "../../shared/people";
import { scoringOf } from "../../shared/scoring";
import type { Company, Contact, HuntStepKind, Icp, State, Workspace } from "../../shared/types";
import type { View } from "./App";
import { Criteria } from "./Criteria";
import { api, best, friendly, initial, proven, Spinner, ToolLogo } from "./ui";

const I = {
  check: "M5 12l5 5 9-10",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  x: "M6 6l12 12 M18 6L6 18",
  pain: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7a5 5 0 100 10 5 5 0 000-10z M12 11a1 1 0 100 2 1 1 0 000-2z",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
};

const Ico = ({ d, c = "#3c3c43", s = 14 }: { d: string; c?: string; s?: number }) => (
  <svg
    aria-hidden="true"
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const Row = ({
  c,
  onOpen,
  onAnswer,
}: {
  c: Company;
  onOpen: () => void;
  onAnswer: (ok: boolean) => void;
}) => {
  const wn = best(c.research, "why_now");
  const p = proven(c.research).length;
  const signal = wn ? wn.claim : c.trigger?.text;
  const yes = c.checks?.filter((x) => x.verdict === "yes").length ?? 0;
  const pending = c.approval !== "approved";
  return (
    <div className="crow native-company-row">
      <button
        type="button"
        className="btn"
        onClick={onOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
          background: "transparent",
          textAlign: "left",
          padding: 0,
        }}
      >
        {c.logo ? (
          <img
            src={c.logo}
            alt=""
            width={28}
            height={28}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              objectFit: "contain",
              background: "#fff",
              boxShadow: "0 0 0 0.5px rgba(0,0,0,0.12)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#e8e8ed",
              fontWeight: 700,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {initial(c.name)}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>
            <span className="ellipsis">{c.name}</span>
            {(c.signals ?? []).some((x) => !x.seen) && (
              <span className="pill p-red" style={{ padding: "1px 7px", fontSize: 11 }}>
                new
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--faint)",
              display: "flex",
              gap: 6,
              alignItems: "center",
              marginTop: 2,
            }}
          >
            <span className="ellipsis">{c.domain}</span>
            {(c.warm?.length ?? 0) > 0 && (
              <span
                className="pill p-green"
                style={{ padding: "0 6px", fontSize: 11, flexShrink: 0 }}
                title={(c.warm ?? []).map((p) => `${p.name}, ${p.position}`).join("\n")}
              >
                warm · {c.warm?.[0]?.name.split(" ")[0]}
              </span>
            )}
            {c.checks?.length ? (
              <span
                title="Must-haves confirmed"
                style={{
                  flexShrink: 0,
                  padding: "0 6px",
                  borderRadius: 6,
                  background: "#e6f5ea",
                  color: "#1f8a43",
                  fontWeight: 600,
                  lineHeight: "16px",
                }}
              >
                {yes}/{c.checks.length}
              </span>
            ) : null}
          </div>
        </div>
      </button>
      <button
        type="button"
        className="btn"
        onClick={onOpen}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          minWidth: 0,
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.4,
          background: "transparent",
          textAlign: "left",
          padding: 0,
        }}
      >
        {c.status === "researching" ? (
          <span style={{ color: "var(--accent)" }}>Researching…</span>
        ) : (
          <>
            <span style={{ flexShrink: 0, marginTop: 2 }}>
              <Ico d={I.bolt} c="#d97706" s={13} />
            </span>
            <span className="clamp2">{signal ?? "No recent signal found"}</span>
          </>
        )}
      </button>
      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
        {pending ? (
          <>
            <button
              type="button"
              className="btn"
              aria-label={`Research ${c.name}`}
              title="Start deeper research"
              onClick={() => onAnswer(true)}
              style={{ padding: "8px 10px", borderRadius: 7, background: "#f3f3f2", fontSize: 13 }}
            >
              Research company
            </button>
            <button
              type="button"
              className="btn"
              aria-label={`Not a fit: ${c.name}`}
              title="Not a fit"
              onClick={() => onAnswer(false)}
              style={{ width: 32, height: 32, borderRadius: 9, background: "#f2f2f4" }}
            >
              <Ico d={I.x} c="#6e6e73" />
            </button>
          </>
        ) : c.status === "researching" || c.status === "queued" ? (
          <span className="native-muted">
            <Spinner /> {c.status === "queued" ? "Research queued" : "Researching…"}
          </span>
        ) : c.status === "done" ? (
          <span className="pill p-green">
            {p} supported {p === 1 ? "finding" : "findings"}
          </span>
        ) : c.status === "candidate" ? (
          <span className="pill">Not researched</span>
        ) : (
          <span className="pill p-red">Research failed</span>
        )}
      </div>
      <div
        style={{
          fontWeight: 800,
          fontSize: 16,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          color: (c.match ?? 0) >= 85 ? "#1f8a43" : "var(--ink)",
        }}
      >
        <small style={{ display: "block", fontSize: 10, fontWeight: 400, color: "var(--muted)" }}>
          Match score
        </small>
        {c.match ?? "–"}
      </div>
    </div>
  );
};

/** Asked only after real value: companies are on screen, now show who the founder knows there. */
/**
 * Your way in: where the founder's own network helps this ICP. Two uses:
 * people who can intro you to these companies, and people you know who ARE
 * this ICP and could buy directly. Asked for only once companies are on screen.
 */
const STEP_ICON: Record<HuntStepKind, string> = {
  search: "🔎",
  source: "📰",
  found: "✨",
  check: "⏳",
  pass: "✓",
  skip: "–",
  sharpen: "⚡",
};

const mins = (ms: number) =>
  ms < 60_000 ? "less than a minute" : `about ${Math.round(ms / 60_000)} min`;

/** Live hunt: what the agent is doing now, how far it is, and about how long is left. */
const HuntPanel = ({
  icp,
  timing,
  candidates,
}: {
  icp: Icp;
  timing: { searchMs: number; checkMs: number };
  candidates: number;
}) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const h = icp.hunt;
  if (!h)
    return (
      <div className="hunt">
        <div className="hunt-head">
          <Spinner /> {icp.sourcingNote ?? "Stop finding companies"}
        </div>
      </div>
    );
  const since = Date.now() - Date.parse(h.phaseAt);
  const workers = 4;
  const checks = (n: number) => Math.ceil(n / workers) * timing.checkMs;
  const left =
    h.phase === "search"
      ? Math.max(0, timing.searchMs - since) + checks(candidates)
      : h.phase === "check"
        ? Math.max(0, checks(h.total - h.checked) - (since % timing.checkMs))
        : timing.searchMs + checks(candidates);
  const title =
    h.phase === "search"
      ? "Searching the web"
      : h.phase === "check"
        ? `Checking companies · ${h.checked} of ${h.total}`
        : "Adjusting search criteria…";
  const pct = h.phase === "check" && h.total ? (h.checked / h.total) * 100 : 0;
  return (
    <div className="hunt">
      <div className="hunt-head">
        <span className="hunt-orb" aria-hidden="true" />
        <b>{title}</b>
        {h.round > 1 && <span className="gtag">Round {h.round}</span>}
        <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12 }}>
          Estimated time remaining: {mins(left)}
        </span>
      </div>
      <div className={`hunt-bar ${h.phase !== "check" ? "busy" : ""}`}>
        <i style={{ width: `${h.phase === "check" ? Math.max(4, pct) : 30}%` }} />
      </div>
      <ul className="hunt-steps">
        {h.steps.slice(0, 6).map((s, i) => (
          <li key={`${s.at}${s.text}`} className={`hunt-step ${s.kind} ${i === 0 ? "now" : ""}`}>
            <span className="hunt-ico">
              {s.logo ? <img src={s.logo} alt="" /> : STEP_ICON[s.kind]}
            </span>
            <span className="ellipsis">{s.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const WayIn = ({
  icp,
  contacts,
  facts,
  onState,
  warmCos,
  go,
  hasCos,
}: {
  icp: Icp;
  contacts: Contact[];
  facts: Record<string, CompanyFacts>;
  onState: (s: State) => void;
  warmCos: number;
  go: (v: View) => void;
  hasCos: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const all = useMemo(() => peopleInIcp(contacts, icp, facts), [contacts, icp, facts]);
  const sure = all.filter((m) => m.fit === "fits").length;
  const likely = all.filter((m) => m.fit === "likely").length;
  const todo = useMemo(
    () => (contacts.length ? companiesToCheck(contacts, icp, facts).length : 0),
    [contacts, icp, facts]
  );
  // First visit: Claude writes this ICP's buyer profile and checks unknown companies, once.
  // Every state push brings new objects, so depend on plain values and remember what already ran.
  const hasProfile = Boolean(icp.people);
  const ran = useRef(new Set<string>());
  useEffect(() => {
    const key = `${icp.id}:${hasProfile}:${todo}`;
    if (!contacts.length || (hasProfile && todo === 0) || ran.current.has(key)) return;
    ran.current.add(key);
    setChecking(true);
    void api()
      .matchPeople(icp.id)
      .then(onState)
      .finally(() => setChecking(false));
  }, [contacts.length, icp.id, hasProfile, todo, onState]);
  if (!contacts.length)
    return (
      <div className="wayin">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ToolLogo name="linkedin" size={22} radius={6} />
          <b style={{ marginLeft: 2 }}>Your way in</b>
        </div>
        <div className="wayin-text">
          Import LinkedIn connections to explore possible introductions.
        </div>
        <button
          type="button"
          className="ob-cta"
          style={{ height: 32, fontSize: 12.5, alignSelf: "flex-start" }}
          onClick={() => go({ kind: "network" })}
        >
          Add my network
        </button>
      </div>
    );
  return (
    <div className="wayin">
      <div style={{ display: "flex", alignItems: "center" }}>
        <b>Your way in</b>
        <button
          type="button"
          className="ghost btn"
          style={{ marginLeft: "auto", fontSize: 12 }}
          onClick={() => go({ kind: "network" })}
        >
          {contacts.length.toLocaleString()} people
        </button>
      </div>
      {hasCos && (
        <div className="wayin-row">
          <span className="wayin-ico">🤝</span>
          <span>
            <b>{warmCos}</b> {warmCos === 1 ? "company" : "companies"} here where you know someone
          </span>
        </div>
      )}
      <button
        type="button"
        className="btn wayin-row"
        style={{ textAlign: "left", width: "100%" }}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="wayin-ico">🎯</span>
        <span style={{ flex: 1 }}>
          <b>{checking && !icp.people ? "…" : sure}</b> people you know fit
          {likely > 0 && <span style={{ color: "var(--muted)" }}> · {likely} likely</span>}
          {all.length - sure - likely > 0 && (
            <span style={{ color: "var(--faint)" }}> · {all.length - sure - likely} unknown</span>
          )}
          {checking && <span style={{ color: "var(--muted)" }}> · checking</span>}
        </span>
        <span style={{ color: "var(--faint)" }}>{open ? "⌃" : "⌄"}</span>
      </button>
      {open && all.length - sure > 0 && !checking && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["linkedin", "web"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="ghost btn"
              style={{
                fontSize: 12,
                color: "var(--accent)",
                display: "inline-flex",
                gap: 5,
                alignItems: "center",
              }}
              onClick={() => {
                setChecking(true);
                void api()
                  .matchPeople(icp.id, m)
                  .then(onState)
                  .finally(() => setChecking(false));
              }}
            >
              {m === "linkedin" ? (
                <>
                  <ToolLogo name="linkedin" size={13} radius={3} /> Check sizes on LinkedIn
                </>
              ) : (
                "🔎 Search the web"
              )}
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="wayin-list">
          {all.slice(0, 12).map(({ person: p, fit, why }) => (
            <button
              key={`${p.name}|${p.company}`}
              type="button"
              className={`btn wayin-person ${p.url ? "" : "nolink"}`}
              disabled={!p.url}
              onClick={() => p.url && void api().openExternal(p.url)}
              title={p.url ? `Open ${p.name} on LinkedIn` : "No profile link in your export"}
            >
              <span className="wayin-av">{initial(p.name)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="ellipsis" style={{ display: "block", fontWeight: 600 }}>
                  {p.name}
                </span>
                <span
                  className="ellipsis"
                  style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}
                >
                  {p.position} · {p.company}
                </span>
              </span>
              <span className={`fit-tag ${fit}`} title={why}>
                {fit}
              </span>
            </button>
          ))}
          {all.length > 12 && (
            <div style={{ fontSize: 12, color: "var(--muted)", padding: "4px 6px" }}>
              +{all.length - 12} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const IcpView = ({
  ws,
  icpId,
  contacts,
  facts,
  timing,
  go,
  onState,
}: {
  timing: { searchMs: number; checkMs: number };
  ws: Workspace;
  icpId: string;
  contacts: Contact[];
  facts: Record<string, CompanyFacts>;
  go: (v: View) => void;
  onState: (s: State) => void;
}) => {
  const inspector = useRef<HTMLDialogElement>(null);
  const icp = ws.icps.find((i) => i.id === icpId);
  if (!icp) return null;
  const bar = scoringOf(ws.scoring).bar;
  const reach = (c: Company) =>
    (c.warm?.length ? 2 : 0) +
    (c.linkedin ? 1 : 0) +
    (c.actions?.findEmail?.status === "done" ? 1 : 0);
  const hidden =
    icp.companies.filter((c) => (c.match ?? 0) < bar && c.approval !== "rejected").length +
    (icp.belowBar ?? 0);
  const shown = icp.companies
    .filter((c) => (c.match ?? 0) >= bar && c.approval !== "rejected")
    .sort(
      (a, b) =>
        Number(b.approval === "approved") - Number(a.approval === "approved") ||
        (b.match ?? 0) - (a.match ?? 0) ||
        // Equal fit: the one you can reach (someone you know, a LinkedIn page, a found email) first.
        reach(b) - reach(a)
    );
  const rejected = icp.companies.filter((c) => c.approval === "rejected").length;
  const crit = icp.criteria;
  const hunt = () => void api().huntIcp(icp.id).then(onState);
  const open = (c: Company) => go({ kind: "company", icpId: icp.id, domain: c.domain });
  const answer = (c: Company, ok: boolean) =>
    void api().approveCompany(icp.id, c.domain, ok).then(onState);

  const presentation = icpPresentation(icp);
  const consumer = icp.profileKind === "consumer";
  return (
    <div className="native-page native-icp scroll">
      <div className="native-crumb">
        <button type="button" className="btn" onClick={() => go({ kind: "overview" })}>
          Overview
        </button>
        <span>/ Customer profile</span>
      </div>
      <header className="native-profile-header">
        <div>
          <small>{presentation.tag}</small>
          <h1>{presentation.title}</h1>
          <p>{presentation.fit}</p>
          {icp.reasoning && <p><strong>Why we picked it</strong> {icp.reasoning}</p>}
        </div>
      </header>
      <button
        type="button"
        className="btn native-secondary native-details-button"
        onClick={() => inspector.current?.showModal()}
      >
        Profile details ↗
      </button>
      <dialog ref={inspector} className="native-inspector" aria-label="Profile details">
        <div className="native-inspector-head">
          <h2>Profile details</h2>
          <button
            type="button"
            className="btn ghost"
            aria-label="Close profile details"
            onClick={() => inspector.current?.close()}
          >
            ✕
          </button>
        </div>
        <ProfileEditor key={icp.id} icp={icp} onState={onState} />
      </dialog>
      {consumer ? (
        <div className="native-empty">
          <h2>A profile you can keep refining</h2>
          <p>Company search is available for business customer profiles.</p>
        </div>
      ) : (
        <>
          <section className="native-companies" aria-label="Companies">
            <div className="native-company-heading">
              <h2>Companies</h2>
              <button type="button" className="primary btn"  onClick={() => (icp.sourcing ? void api().stopHunt(icp.id).then(onState) : hunt())}>
                {icp.sourcing
                  ? "Stop finding companies"
                  : icp.lastHunt?.error
                    ? "Try again"
                    : icp.hunted
                      ? "Find more companies"
                      : "Find companies"}
              </button>
            </div>
            {(hidden > 0 || rejected > 0) && (
              <p className="native-muted">
                {hidden > 0 && `${hidden} below the match threshold`}
                {hidden > 0 && rejected > 0 && " · "}
                {rejected > 0 && `${rejected} not a fit`}
              </p>
            )}
            {icp.sourcing && (
              <HuntPanel icp={icp} timing={timing} candidates={scoringOf(ws.scoring).candidates} />
            )}
            {shown.length > 0 && (
              <div className="native-company-labels" aria-hidden="true">
                <span>Company</span>
                <span>Recent signal</span>
                <span>Research</span>
                <span>Score</span>
              </div>
            )}
            {shown.map((c) => (
              <Row key={c.domain} c={c} onOpen={() => open(c)} onAnswer={(ok) => answer(c, ok)} />
            ))}
            {!icp.sourcing && !icp.hunted && shown.length === 0 && (
              <div className="native-empty">
                <h2>Find companies to explore</h2>
                <p>
                  Search for companies that could fit this profile, then decide which ones to
                  research further.
                </p>
              </div>
            )}
            {!icp.sourcing && icp.lastHunt?.error && (
              <div className="native-empty" role="alert">
                <h2>We couldn’t complete the search.</h2>
                <p>{friendly(icp.lastHunt.error)}</p>
                {shown.length > 0 && <p>Available results are still shown above.</p>}
              </div>
            )}
            {!icp.sourcing && icp.hunted && !icp.lastHunt?.error && shown.length === 0 && (
              <div className="native-empty">
                <h2>No matches found this time.</h2>
                <p>
                  {icp.lastHunt
                    ? `Checked ${icp.lastHunt.checked} companies in the last search. ${icp.lastHunt.gap ?? ""}`
                    : "Try adjusting the matching criteria."}
                </p>
              </div>
            )}
            {shown.some((c) => c.approval !== "approved") && (
              <p className="native-muted">Choose a company to research further.</p>
            )}
          </section>
          <details className="native-disclosure">
            <summary>Search criteria</summary>
            <button type="button" className="btn ghost" onClick={() => go({ kind: "matching", back: { kind: "icp", icpId: icp.id } })}>
              Adjust matching for this business →
            </button>
            {crit ? (
              <Criteria
                criteria={crit}
                onSave={(c) => void api().updateCriteria(icp.id, c).then(onState)}
              />
            ) : (
              <p>Search criteria will be prepared when you start a company search.</p>
            )}
            {icp.refinements?.[0] && (
              <p className="native-muted">Latest refinement: {icp.refinements[0]}</p>
            )}
          </details>
          {(shown.length > 0 || contacts.length > 0) && (
            <details className="native-disclosure">
              <summary>Your way in</summary>
              <WayIn
                icp={icp}
                contacts={contacts}
                facts={facts}
                onState={onState}
                warmCos={shown.filter((c) => (c.warm?.length ?? 0) > 0).length}
                hasCos={shown.length > 0}
                go={go}
              />
            </details>
          )}
        </>
      )}
    </div>
  );
};
