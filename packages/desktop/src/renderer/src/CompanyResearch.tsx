import type { Finding, FindingKind, OutreachLine } from "@icpfinder/core";
import { useState } from "react";
import {
  RESEARCH_KINDS,
  RESEARCH_TABS,
  type ResearchTab,
  researchConcerns,
  researchHighlights,
} from "../../shared/company-research";
import { evidenceLabel, findingLabel, findingReason } from "../../shared/evidence-labels";
import type { Company } from "../../shared/types";
import { api, host } from "./ui";

const LABEL: Record<FindingKind, string> = {
  why_now: "Recent signals",
  person: "People to consider",
  what_they_sell: "What they offer",
  their_need: "Potential needs",
  linkedin_post: "Their posts",
  tech_stack: "Tools they use",
  disqualifier: "Fit considerations",
};

export function ResearchFact({ finding: f }: { finding: Finding }) {
  return (
    <article className="company-fact">
      <p>{f.claim}</p>
      <small>
        {findingLabel(f.status)}
        {f.date ? ` · ${f.date}` : f.kind === "why_now" ? " · Event date unconfirmed" : ""}
      </small>
      {f.why && <p className="company-muted">{findingReason(f.why)}</p>}
      {f.person && (
        <p className="company-muted">
          {f.person.name} · {f.person.role}
          {f.person.profileUrl && (
            <>
              {" "}
              ·{" "}
              <a
                href={f.person.profileUrl}
                onClick={(e) => {
                  e.preventDefault();
                  void api().openExternal(f.person?.profileUrl ?? "");
                }}
              >
                Profile from research ↗
              </a>
            </>
          )}
        </p>
      )}
      <details className="company-disclosure">
        <summary>Sources and checks</summary>
        {f.evidence.length === 0 ? (
          <p>No supporting source is available.</p>
        ) : (
          f.evidence.map((e) => (
            <div className="company-evidence" key={`${e.url}-${e.quote}`}>
              <a
                href={e.url}
                onClick={(event) => {
                  event.preventDefault();
                  void api().openExternal(e.url);
                }}
              >
                {host(e.url)} ↗
              </a>
              <small>{evidenceLabel[e.check]}</small>
              <blockquote>{e.quote || "No source quote was recorded."}</blockquote>
            </div>
          ))
        )}
      </details>
    </article>
  );
}

export function CitedResearch({ lines, findings }: { lines: OutreachLine[]; findings: Finding[] }) {
  return (
    <>
      {lines.map((line) => (
        <div key={`${line.text}-${line.citations.join("-")}`} className="company-summary-line">
          <p>{line.text}</p>
          {line.citations.length > 0 && (
            <details className="company-disclosure">
              <summary>Supporting research</summary>
              {line.citations.map((id) => {
                const f = findings.find((f) => f.id === id);
                return f ? (
                  <ResearchFact key={id} finding={f} />
                ) : (
                  <p key={id}>The cited finding is no longer available.</p>
                );
              })}
            </details>
          )}
        </div>
      ))}
    </>
  );
}

export function CompanyResearch({
  company: c,
  onUpdatesViewed,
}: {
  company: Company;
  onUpdatesViewed: () => void;
}) {
  const [tab, setTab] = useState<ResearchTab>("Fit");
  const r = c.research;
  if (!r) return null;
  const concerns = researchConcerns(c);
  return (
    <section className="company-research" aria-label="Company research">
      <nav className="company-tabs" aria-label="Research sections">
        {RESEARCH_TABS.map((t) => (
          <button
            type="button"
            key={t}
            aria-current={tab === t ? "page" : undefined}
            aria-controls={`company-${t.replaceAll(" ", "-")}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {RESEARCH_TABS.map((t) => {
        const highlights = researchHighlights(r.findings, t);
        return (
          <div key={t} id={`company-${t.replaceAll(" ", "-")}`} hidden={tab !== t}>
            {t === "Fit" &&
              (r.fitSummary.length > 0 ? (
                <CitedResearch lines={r.fitSummary.slice(0, 1)} findings={r.findings} />
              ) : (
                <p>
                  {c.checks?.length
                    ? `${c.checks.filter((k) => k.verdict === "yes").length} of ${c.checks.length} profile criteria met.`
                    : "There isn’t enough information to assess the fit yet."}
                </p>
              ))}
            {t === "Why now" && (
              <p className="company-muted">
                These findings describe possible reasons to reach out, not confirmed buying intent.
              </p>
            )}
            {highlights.map((f) => (
              <ResearchFact key={f.id} finding={f} />
            ))}
            {highlights.length === 0 && t !== "Fit" && (
              <p className="company-muted">
                {t === "Why now"
                  ? r.findings.some((f) => f.kind === "why_now")
                    ? "No supported, dated timing signals are available."
                    : "No timing signals found in this research."
                  : r.findings.some((f) => RESEARCH_KINDS.Background.includes(f.kind))
                    ? "No supported background findings are available. See all background research for the recorded findings and checks."
                    : "No background findings available yet."}
              </p>
            )}
            {concerns.length > 0 && (
              <section className="company-concerns">
                <h3>Fit concerns and unknowns</h3>
                {concerns.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </section>
            )}
            <details className="company-disclosure company-full-research">
              <summary>
                {t === "Fit"
                  ? "All criteria and concerns"
                  : t === "Why now"
                    ? "All signals and updates"
                    : "All background research"}
              </summary>
              {t === "Fit" && (
                <>
                  {r.fitSummary.length > 0 && (
                    <CitedResearch lines={r.fitSummary} findings={r.findings} />
                  )}
                  <h3>Profile criteria</h3>
                  {c.checks?.length ? (
                    c.checks.map((k) => (
                      <div className="company-fact" key={k.criterion}>
                        <p>{k.criterion}</p>
                        <small>
                          {k.verdict === "yes" ? "Met" : k.verdict === "no" ? "Not met" : "Unknown"}
                        </small>
                        {k.evidence && <p>{k.evidence}</p>}
                      </div>
                    ))
                  ) : (
                    <p>No criteria checks were recorded.</p>
                  )}
                </>
              )}
              {t === "Why now" && c.trigger && (
                <section className="company-fact">
                  <h3>Original discovery signal</h3>
                  <p>{c.trigger.text}</p>
                  <small>{c.trigger.date ?? "Event date unconfirmed"}</small>
                  {c.trigger.url && (
                    <a
                      href={c.trigger.url}
                      onClick={(e) => {
                        e.preventDefault();
                        void api().openExternal(c.trigger?.url ?? "");
                      }}
                    >
                      Source ↗
                    </a>
                  )}
                </section>
              )}
              {RESEARCH_KINDS[t].map((kind) => (
                <section key={kind} className="company-research-group">
                  <h3>{LABEL[kind]}</h3>
                  {r.findings.filter((f) => f.kind === kind).length ? (
                    r.findings
                      .filter((f) => f.kind === kind)
                      .map((f) => <ResearchFact key={f.id} finding={f} />)
                  ) : (
                    <p className="company-muted">No findings recorded.</p>
                  )}
                </section>
              ))}
              {t === "Why now" && (
                <details
                  className="company-disclosure"
                  onToggle={(e) => {
                    if (e.currentTarget.open) onUpdatesViewed();
                  }}
                >
                  <summary>Monitoring updates ({c.signals?.length ?? 0})</summary>
                  <CompanyUpdates company={c} />
                </details>
              )}
              {t === "Fit" && r.gaps.length > 0 && (
                <section>
                  <h3>Still to check</h3>
                  <ul>
                    {r.gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </section>
              )}
            </details>
          </div>
        );
      })}
    </section>
  );
}

export function CompanyUpdates({ company: c }: { company: Company }) {
  return (
    <>
      <p className="company-muted">
        Monitoring updates are separate from the checked research findings.
      </p>
      {c.signals?.length ? (
        c.signals.map((sig) => (
          <article className="company-fact" key={`${sig.text}-${sig.found}`}>
            <p>{sig.text}</p>
            <small>
              {sig.date ? `Event: ${sig.date}` : "Event date unconfirmed"} · Found{" "}
              {new Date(sig.found).toLocaleDateString()}
            </small>
            {sig.url && (
              <a
                href={sig.url}
                onClick={(e) => {
                  e.preventDefault();
                  void api().openExternal(sig.url ?? "");
                }}
              >
                Source ↗
              </a>
            )}
          </article>
        ))
      ) : (
        <p>No monitoring updates recorded.</p>
      )}
      {c.watchedAt && (
        <p className="company-muted">Last checked {new Date(c.watchedAt).toLocaleString()}</p>
      )}
    </>
  );
}
