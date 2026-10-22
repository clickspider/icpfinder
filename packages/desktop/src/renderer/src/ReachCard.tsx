import type { Finding } from "@icpfinder/core";
import { useEffect, useState } from "react";
import { type ReachLink, reachSearches } from "../../shared/reach";
import type { Company, State } from "../../shared/types";
import { ResearchFact } from "./CompanyResearch";
import { api, host } from "./ui";

const short = (url: string) =>
  url
    .replace(/^mailto:/, "")
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/$/, "");

/** Contact discovery remains code-only; presenting a route never sends a message. */
export function ReachCard({
  icpId,
  c,
  person,
  onState,
}: {
  icpId: string;
  c: Company;
  person?: Finding;
  onState: (s: State) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [copyError, setCopyError] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (c.reachAt) {
      setBusy(false);
      setError("");
      return;
    }
    let active = true;
    setBusy(true);
    void api()
      .findReach(icpId, c.domain)
      .then((s) => {
        if (active) onState(s);
      })
      .catch(() => {
        if (active) setError("We couldn’t check for contact routes.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [icpId, c.domain, c.reachAt, onState]);
  const links = c.reach ?? [];
  const primary = links.find((l) => l.kind === "post") ?? links.find((l) => l.kind !== "email");
  const email = links.find((l) => l.kind === "email");
  const others = links.filter((l) => l !== primary && l !== email);
  const searches = reachSearches(c.name, person?.person?.name, new Set(links.map((l) => l.kind)));
  const selected = searches.find((s) => s.kind === search) ?? searches[0];
  const copy = async (l: ReachLink) => {
    setCopyError("");
    setCopied("");
    try {
      await api().copyText(l.url.replace(/^mailto:/, ""));
      setCopied(l.url);
    } catch {
      setCopyError("Couldn’t copy the email. Try again.");
    }
  };
  const route = (l: ReachLink) => (
    <div className="company-contact-route" key={l.url}>
      {l.kind === "email" ? (
        <div className="company-email">
          <span>{short(l.url)}</span>
          <button type="button" className="secondary btn" onClick={() => void copy(l)}>
            {copied === l.url ? "Copied" : "Copy email"}
          </button>
        </div>
      ) : (
        <a
          href={l.url}
          onClick={(e) => {
            e.preventDefault();
            void api().openExternal(l.url);
          }}
        >
          {l.kind === "post"
            ? `View post on ${host(l.url)}`
            : l.kind === "linkedin"
              ? "View LinkedIn page"
              : "View public profile"}{" "}
          · {short(l.url)} ↗
        </a>
      )}
      <small>Found via {l.source}</small>
    </div>
  );
  return (
    <section className="company-contact" aria-label="Contact routes">
      <h2>Where to reach them</h2>
      {person?.person ? (
        <>
          <h3>{person.person.name}</h3>
          <p>{person.person.role}</p>
          <p className="company-muted">Purchasing responsibility hasn’t been confirmed.</p>
          <details className="company-disclosure">
            <summary>Person source</summary>
            <ResearchFact finding={person} />
          </details>
        </>
      ) : (
        <p>We haven’t identified a person to contact.</p>
      )}
      {busy && (
        <p role="status" className="company-muted">
          Looking for contact routes…
        </p>
      )}
      {error && <p role="alert">{error} Use More actions to try again.</p>}
      {copyError && <p role="alert">{copyError}</p>}
      {primary && route(primary)}
      {email && route(email)}
      {!busy && !error && links.length === 0 && (
        <p className="company-muted">No contact routes found in the pages checked.</p>
      )}
      {!busy && links.length === 0 && searches.find((s) => s.kind === "linkedin") && (
        <a
          href={searches.find((s) => s.kind === "linkedin")?.url}
          onClick={(e) => {
            e.preventDefault();
            const route = searches.find((s) => s.kind === "linkedin");
            if (route) void api().openExternal(route.url);
          }}
        >
          Search LinkedIn ↗
        </a>
      )}
      {(others.length > 0 || searches.length > 0) && (
        <details className="company-disclosure">
          <summary>Other contact routes</summary>
          {others.map(route)}
          {searches.length > 0 && (
            <div className="company-contact-search">
              <label htmlFor="company-contact-search">Search for a missing route</label>
              <div>
                <select
                  id="company-contact-search"
                  value={selected?.kind ?? ""}
                  onChange={(e) => setSearch(e.target.value)}
                >
                  {searches.map((s) => (
                    <option key={s.kind} value={s.kind}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="secondary btn"
                  onClick={() => {
                    if (selected) void api().openExternal(selected.url);
                  }}
                >
                  Search ↗
                </button>
              </div>
            </div>
          )}
        </details>
      )}
    </section>
  );
}
