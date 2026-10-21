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
import { DUO } from "./glass";
import { api, best, friendly, IcpArt, initial, proven, Snap, Spinner, ToolLogo } from "./ui";

const I = {
  check: "M5 12l5 5 9-10",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  x: "M6 6l12 12 M18 6L6 18",
  pain: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7a5 5 0 100 10 5 5 0 000-10z M12 11a1 1 0 100 2 1 1 0 000-2z",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
};
const TINTS = ["#fff1f3", "#f6efff", "#fff4e8", "#eef5ff", "#ecf8f1"];

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
    <div
      className="crow"
      style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,2fr) 80px 40px", columnGap: 16 }}
    >
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
            <span className="clamp2">{signal ?? "No recent signal"}</span>
          </>
        )}
      </button>
      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
        {pending ? (
          <>
            <button
              type="button"
              className="btn"
              aria-label={`Approve ${c.name}`}
              title="Approve fit"
              onClick={() => onAnswer(true)}
              style={{ width: 32, height: 32, borderRadius: 9, background: "#e6f5ea" }}
            >
              <Ico d={I.check} c="#1f8a43" />
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
          <Spinner />
        ) : c.status === "done" ? (
          <span className="pill p-green">✓ {p} proven</span>
        ) : c.status === "candidate" ? (
          <span className="pill">Not researched</span>
        ) : (
          <span className="pill p-red">failed</span>
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
          <Spinner /> {icp.sourcingNote ?? "Hunting…"}
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
        : "Sharpening the ICP";
  const pct = h.phase === "check" && h.total ? (h.checked / h.total) * 100 : 0;
  return (
    <div className="hunt">
      <div className="hunt-head">
        <span className="hunt-orb" aria-hidden="true" />
        <b>{title}</b>
        {h.round > 1 && <span className="gtag">Round {h.round}</span>}
        <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12 }}>
          {mins(left)} left
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
          <ToolLogo name="instagram" size={22} radius={6} />
          <b style={{ marginLeft: 2 }}>Your way in</b>
        </div>
        <div className="wayin-text">
          Add your LinkedIn or Instagram. I find who can intro you to these companies, and people
          you already know who fit this ICP and could buy from you.
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
  const icp = ws.icps.find((i) => i.id === icpId);
  if (!icp) return null;
  const bar = scoringOf(ws.scoring).bar;
  const reach = (c: Company) =>
    (c.warm?.length ? 2 : 0) +
    (c.linkedin ? 1 : 0) +
    (c.actions?.findEmail?.status === "done" ? 1 : 0);
  const hidden =
    icp.companies.filter(
      (c) => (c.match ?? 0) > 0 && (c.match ?? 0) < bar && c.approval !== "rejected"
    ).length + (icp.belowBar ?? 0);
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

  return (
    <div
      className="enter scroll"
      style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 16 }}
    >
      <header
        className="drag"
        style={{
          borderRadius: 18,
          background: TINTS[icp.art % TINTS.length],
          padding: "22px 24px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        <IcpArt icp={icp} size={72} radius={20} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
            ICP · {ws.product.name}
          </div>
          <h1
            style={{
              margin: "2px 0 0",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            {icp.name}
          </h1>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>{icp.industry}</div>
          {icp.reasoning && (
            <div className="ir-why icp-why">
              <i aria-hidden="true">{DUO.Idea?.(16)}</i>
              <p>
                <b>Why we picked it</b>
                {icp.reasoning}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`btn nodrag ${icp.sourcing ? "stop-btn" : "primary"}`}
          onClick={() => (icp.sourcing ? void api().stopHunt(icp.id).then(onState) : hunt())}
        >
          {icp.sourcing ? (
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <Spinner />
              Stop hunting
            </span>
          ) : icp.hunted ? (
            "Find more companies"
          ) : (
            "Hunt this ICP"
          )}
        </button>
      </header>
      <ProfileEditor key={icp.id} icp={icp} onState={onState} />

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <section
          className="panel"
          style={{ flex: "1.6 1 0", minWidth: 0, overflow: "hidden" }}
          aria-label="Companies"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px" }}>
            <h2 style={{ margin: 0, fontSize: 15 }}>Companies</h2>
            <div style={{ fontSize: 12, color: "var(--faint)" }}>
              {hidden > 0 && `${hidden} weaker fits hidden`}
              {rejected > 0 && `${hidden > 0 ? " · " : ""}${rejected} not a fit`}
            </div>
            <button
              type="button"
              className="ghost btn"
              style={{
                marginLeft: "auto",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              onClick={() => go({ kind: "matching", back: { kind: "icp", icpId: icp.id } })}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
                <circle cx="16" cy="6" r="2" />
                <circle cx="10" cy="12" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
              Adjust matching
            </button>
          </div>
          {icp.sourcing && (
            <HuntPanel icp={icp} timing={timing} candidates={scoringOf(ws.scoring).candidates} />
          )}
          {shown.map((c) => (
            <Row key={c.domain} c={c} onOpen={() => open(c)} onAnswer={(ok) => answer(c, ok)} />
          ))}
          {!icp.sourcing && shown.length === 0 && !icp.hunted && (
            <Snap
              kind="start"
              title="Ready to hunt"
              text="Your AI finds companies that fit."
              cta="Hunt this ICP"
              onCta={hunt}
            />
          )}
          {!icp.sourcing && icp.hunted && icp.lastHunt?.error && (
            <Snap
              kind="error"
              title="Snap, the search broke"
              text={friendly(icp.lastHunt.error)}
              cta="Try again"
              onCta={hunt}
            />
          )}
          {!icp.sourcing && icp.hunted && !icp.lastHunt?.error && shown.length === 0 && (
            <Snap
              kind="empty"
              title="Snap! No strong fits yet"
              text={
                icp.lastHunt
                  ? `Checked ${icp.lastHunt.checked} in the last search. ${icp.lastHunt.gap ?? "The ICP got sharper."}`
                  : "The ICP gets sharper each round."
              }
              cta="Search again"
              onCta={hunt}
            />
          )}
          {shown.some((c) => c.approval !== "approved") && (
            <div
              style={{
                padding: "10px 16px",
                fontSize: 12,
                color: "var(--muted)",
                borderTop: "0.5px solid rgba(0,0,0,0.07)",
              }}
            >
              ✓ Approve a fit to start its research
            </div>
          )}
        </section>

        <aside
          className="panel"
          style={{
            flex: "1 1 0",
            minWidth: 0,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {(shown.length > 0 || contacts.length > 0) && (
            <WayIn
              icp={icp}
              contacts={contacts}
              facts={facts}
              onState={onState}
              warmCos={shown.filter((c) => (c.warm?.length ?? 0) > 0).length}
              hasCos={shown.length > 0}
              go={go}
            />
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#fff0f3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ico d={I.pain} c="#e0244a" />
            </div>
            <div
              className="clamp2"
              title={icp.pain}
              style={{ fontSize: 13, lineHeight: 1.45, fontWeight: 500 }}
            >
              {icp.pain}
            </div>
          </div>
          {crit && (
            <Criteria
              criteria={crit}
              onSave={(c) => void api().updateCriteria(icp.id, c).then(onState)}
            />
          )}
          {icp.refinements?.[0] && (
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#f2f2f4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Ico d={I.spark} c="#6e6e73" />
              </div>
              <div
                className="clamp2"
                title={icp.refinements.join("\n")}
                style={{ lineHeight: 1.45 }}
              >
                Sharpened: {icp.refinements[0]}
              </div>
            </div>
          )}
          {!crit && (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Re-check ICPs on the product page.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
