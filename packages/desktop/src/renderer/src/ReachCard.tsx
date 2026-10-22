import { useEffect, useState } from "react";
import { type ReachKind, reachSearches } from "../../shared/reach";
import type { Company, State } from "../../shared/types";
import { api, Spinner, ToolLogo } from "./ui";

const LABEL: Record<ReachKind, string> = {
  post: "Their post",
  x: "X",
  linkedin: "LinkedIn",
  email: "Email",
  github: "GitHub",
  hn: "Hacker News",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
};
const LOGO: Partial<Record<ReachKind, string>> = {
  x: "x",
  linkedin: "linkedin",
  hn: "hn",
  instagram: "instagram",
};

/** A post shows the site it is on (Hacker News, X, LinkedIn, Reddit). */
const logoFor = (l: { kind: ReachKind; url: string }): string =>
  LOGO[l.kind] ??
  (l.kind === "post"
    ? /ycombinator/.test(l.url)
      ? "hn"
      : /(x|twitter)\.com/.test(l.url)
        ? "x"
        : /linkedin/.test(l.url)
          ? "linkedin"
          : /reddit/.test(l.url)
            ? "reddit"
            : ""
    : "");

const short = (url: string) =>
  url
    .replace(/^mailto:/, "")
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/$/, "");

/** Where to reach them: the founder's own post first, then their profiles. No AI, no tokens. */
export function ReachCard({
  icpId,
  c,
  person,
  onState,
}: {
  icpId: string;
  c: Company;
  person?: string;
  onState: (s: State) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const find = () => {
    setBusy(true);
    void api()
      .findReach(icpId, c.domain)
      .then(onState)
      .finally(() => setBusy(false));
  };
  // Free to run: look once when the page opens, after research found their name and post.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per company
  useEffect(() => {
    if (!c.reachAt) find();
  }, [c.domain]);
  const links = c.reach ?? [];
  const searches = reachSearches(c.name, person, new Set(links.map((l) => l.kind)));
  const open = (url: string) => {
    if (url.startsWith("mailto:")) {
      void api().copyText(url.slice(7));
      setCopied(url);
      return;
    }
    void api().openExternal(url);
  };

  return (
    <div className="panel reach">
      <div className="reach-head">
        <div className="lbl">Where to reach them</div>
        {busy ? (
          <Spinner />
        ) : (
          <button type="button" className="ghost btn reach-again" onClick={find}>
            Look again
          </button>
        )}
      </div>
      <p className="reach-tip">
        Answer where they already post. Their own words are your best opener.
      </p>
      {links.length === 0 && !busy && (
        <p className="reach-empty">No public links found yet. Search below.</p>
      )}
      {links.map((l) => (
        <button key={l.url} type="button" className="btn reach-row" onClick={() => open(l.url)}>
          {logoFor(l) ? (
            <ToolLogo name={logoFor(l)} size={22} radius={6} />
          ) : (
            <span className="reach-dot">{LABEL[l.kind].slice(0, 1)}</span>
          )}
          <span className="reach-main">
            <b>{LABEL[l.kind]}</b>
            <span className="ellipsis">{short(l.url)}</span>
          </span>
          <span className="reach-src">{copied === l.url ? "Copied" : `from ${l.source}`}</span>
        </button>
      ))}
      {searches.length > 0 && (
        <div className="reach-search">
          <span>Not found yet:</span>
          {searches.map((s) => (
            <button
              key={s.kind}
              type="button"
              className="secondary btn"
              onClick={() => void api().openExternal(s.url)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
