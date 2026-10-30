import { useEffect, useState } from "react";
import type { Listen, ListenSource, Notice } from "../../shared/listen";
import { icpPresentation } from "../../shared/onboarding";
import type { State, Workspace } from "../../shared/types";
import { fmtTokens, groupBy, tokensOf } from "../../shared/usage";
import { BrowserPanel } from "./BrowserPanel";
import { api, ModelPicker, Spinner, ToolLogo } from "./ui";

const SOURCE: Record<ListenSource, { name: string; logo: string; verb: string }> = {
  hn: { name: "Hacker News", logo: "hn", verb: "Reply on HN" },
  reddit: { name: "Reddit", logo: "reddit", verb: "Reply on Reddit" },
  x: { name: "X", logo: "x", verb: "Reply on X" },
  linkedin: { name: "LinkedIn", logo: "linkedin", verb: "Comment on LinkedIn" },
};

const ago = (iso?: string): string => {
  if (!iso) return "";
  const h = Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
};
const dayOf = (iso: string): string => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : "Earlier";
};

/** Setup: what to listen for per profile, suggested once, then the founder's to change. */
function ListenSetup({
  ws,
  state,
  onState,
}: {
  ws: Workspace;
  state: State;
  onState: (s: State) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const icps = ws.icps.filter((i) => i.profileKind !== "consumer");
  const missing = icps.some((i) => !i.listen);
  const suggest = () => {
    setBusy(true);
    setError("");
    void api()
      .listenSuggest()
      .then(onState)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: suggest once when the page opens
  useEffect(() => {
    if (missing) suggest();
  }, []);
  const save = (icpId: string, l: Listen) => void api().listenSave(icpId, l).then(onState);
  const provider = state.settings.provider ?? "claude";
  const start = () => {
    for (const icp of icps) if (icp.listen) save(icp.id, { ...icp.listen, on: true });
    void api().listenRun().then(onState);
  };
  return (
    <div className="native-page noticed-setup scroll">
      <h1 className="ob-h1">Hear about the right people first</h1>
      <p className="ob-sub">
        We looked at your profiles. Here is what is worth listening for, and where. Change anything,
        then start.
      </p>
      {busy && (
        <p className="native-muted">
          <Spinner /> Suggesting what to listen for…
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {icps.map((icp) =>
        icp.listen ? (
          <section key={icp.id} className="panel listen-sec">
            <h3>{icpPresentation(icp).title}</h3>
            <p>What to listen for, from this profile’s reasons to reach out.</p>
            {icp.listen.categories.map((c) => (
              <label key={c.id} className="listen-opt">
                <input
                  type="checkbox"
                  checked={c.on}
                  onChange={() =>
                    save(icp.id, {
                      ...icp.listen!,
                      categories: icp.listen!.categories.map((x) =>
                        x.id === c.id ? { ...x, on: !x.on } : x
                      ),
                    })
                  }
                />
                <span>
                  <b>{c.name}</b>
                  <small>{c.keywords.map((k) => `“${k}”`).join(", ")}</small>
                </span>
              </label>
            ))}
            <div className="listen-where">
              <b>Where:</b>
              {(Object.keys(SOURCE) as ListenSource[]).map((s) => (
                <label key={s} className="listen-src">
                  <input
                    type="checkbox"
                    checked={icp.listen!.sources[s]}
                    onChange={() =>
                      save(icp.id, {
                        ...icp.listen!,
                        sources: { ...icp.listen!.sources, [s]: !icp.listen!.sources[s] },
                      })
                    }
                  />
                  {s === "reddit" && icp.listen!.subreddits.length
                    ? `Reddit ${icp.listen!.subreddits.map((r) => `r/${r}`).join(", ")}`
                    : SOURCE[s].name}
                </label>
              ))}
            </div>
          </section>
        ) : null
      )}
      <section className="panel listen-sec">
        <h3>How it runs</h3>
        <div className="listen-run">
          <span>
            <b>Every morning at {state.settings.listen?.time ?? "08:30"}</b>
            <small>One notification, only for strong fits. At most 10 posts a day.</small>
          </span>
          <input
            type="time"
            className="field"
            aria-label="Listening time"
            value={state.settings.listen?.time ?? "08:30"}
            onChange={(e) =>
              void api()
                .saveSettings({
                  listen: { ...state.settings.listen, time: e.target.value || "08:30" },
                })
                .then(onState)
            }
          />
        </div>
        <div className="listen-run">
          <span>
            <b>Model</b>
            <small>
              Keywords sort the posts first, so the AI reads only a few. The lightest model is
              usually enough.
            </small>
          </span>
          <ModelPicker
            provider={provider}
            value={state.settings.listen?.model ?? ""}
            label=" "
            onChange={(model) =>
              void api()
                .saveSettings({ listen: { time: state.settings.listen?.time ?? "08:30", model } })
                .then(onState)
            }
          />
        </div>
      </section>
      <div className="listen-foot">
        <button
          type="button"
          className="primary btn"
          disabled={busy || !icps.some((i) => i.listen)}
          onClick={start}
        >
          Start listening
        </button>
        <span className="native-muted">You can change all of this later in Noticed.</span>
      </div>
    </div>
  );
}

/** Noticed: people who fit a profile and just said something worth answering. */
export function Noticed({
  ws,
  state,
  onState,
}: {
  ws: Workspace;
  state: State;
  onState: (s: State) => void;
}) {
  const [cat, setCat] = useState<string>("all");
  const [icpId, setIcpId] = useState<string>("all");
  const [running, setRunning] = useState(false);
  const [setup, setSetup] = useState(false);
  const listening = ws.icps.some((i) => i.listen?.on);
  const notices = (ws.notices ?? []).filter((n) => n.status !== "dismissed");
  // Mark today's new posts as seen once the feed is open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: on open only
  useEffect(() => {
    for (const n of notices) if (n.status === "new") void api().noticeSet(n.id, "seen");
  }, []);
  if (!listening || setup)
    return (
      <ListenSetup
        ws={ws}
        state={state}
        onState={(s) => {
          onState(s);
          if (s.workspaces.find((w) => w.id === ws.id)?.icps.some((i) => i.listen?.on))
            setSetup(false);
        }}
      />
    );

  const catName = (n: Notice) =>
    ws.icps.find((i) => i.id === n.icpId)?.listen?.categories.find((c) => c.id === n.categoryId)
      ?.name ?? "";
  const cats = [
    ...new Set(notices.filter((n) => icpId === "all" || n.icpId === icpId).map(catName)),
  ].filter(Boolean);
  const shown = notices.filter(
    (n) => (icpId === "all" || n.icpId === icpId) && (cat === "all" || catName(n) === cat)
  );
  const week = groupBy(
    (state.usage ?? []).filter((r) => r.ws === ws.id && r.task === "Listening"),
    7,
    () => "all"
  )[0]?.[1];
  const run = () => {
    setRunning(true);
    void api()
      .listenRun()
      .then(onState)
      .finally(() => setRunning(false));
  };
  const set = (n: Notice, status: Notice["status"]) =>
    void api().noticeSet(n.id, status).then(onState);
  let lastDay = "";

  return (
    <div className="native-page noticed scroll">
      <header className="noticed-head">
        <div>
          <h1 className="ob-h1">Noticed</h1>
          <p className="ob-sub">
            People who fit your profiles and just said something worth answering. Checked every
            morning at {state.settings.listen?.time ?? "08:30"}.
          </p>
        </div>
        <button type="button" className="btn native-secondary" disabled={running} onClick={run}>
          {running ? <Spinner /> : null} Check now
        </button>
      </header>
      <div className="noticed-chips" role="tablist" aria-label="Categories">
        {["all", ...cats].map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={cat === c}
            className={`btn noticed-chip ${cat === c ? "on" : ""}`}
            onClick={() => setCat(c)}
          >
            {c === "all" ? "All" : c}{" "}
            <b>
              {
                notices.filter(
                  (n) => (icpId === "all" || n.icpId === icpId) && (c === "all" || catName(n) === c)
                ).length
              }
            </b>
          </button>
        ))}
        <select
          className="field noticed-profile"
          aria-label="Profile"
          value={icpId}
          onChange={(e) => {
            setIcpId(e.target.value);
            setCat("all");
          }}
        >
          <option value="all">All profiles</option>
          {ws.icps
            .filter((i) => i.listen?.on)
            .map((i) => (
              <option key={i.id} value={i.id}>
                {icpPresentation(i).title}
              </option>
            ))}
        </select>
      </div>
      {(ws.listening || running) && (
        <div className="panel noticed-live" aria-live="polite">
          <b>
            <Spinner /> Checking now
          </b>
          <ol>
            {(ws.listenSteps ?? ["Starting"]).map((x, i) => (
              <li key={`${i}-${x}`}>{x}</li>
            ))}
          </ol>
          <small>
            Reddit, X and LinkedIn pages open in small minimized windows in your browser. This takes
            about a minute.
          </small>
        </div>
      )}
      {!ws.listening && !running && ws.listenSteps?.length ? (
        <details className="noticed-last">
          <summary>What the last check did</summary>
          <ol>
            {ws.listenSteps.map((x, i) => (
              <li key={`${i}-${x}`}>{x}</li>
            ))}
          </ol>
        </details>
      ) : null}
      <div className="noticed-grid">
        <section aria-label="Posts">
          {!shown.length && (
            <p className="native-muted noticed-empty">
              {ws.listenedAt
                ? `Nothing new worth answering since ${new Date(ws.listenedAt).toLocaleString()}. That is normal: we only show strong fits.`
                : "The first check runs in a moment, or press Check now."}
            </p>
          )}
          {shown.map((n) => {
            const day = dayOf(n.postedAt ?? n.foundAt);
            const head = day !== lastDay ? <div className="noticed-day">{day}</div> : null;
            lastDay = day;
            const icp = ws.icps.find((i) => i.id === n.icpId);
            return (
              <div key={n.id}>
                {head}
                <article className={`noticed-item ${n.status === "saved" ? "saved" : ""}`}>
                  <ToolLogo name={SOURCE[n.source].logo} size={34} radius={8} />
                  <div className="noticed-body">
                    <div className="noticed-who">
                      <b>{n.author}</b>
                      {n.company && <span> · {n.company}</span>}
                      <span> · {SOURCE[n.source].name}</span>
                    </div>
                    <blockquote>“{n.quote}”</blockquote>
                    <p className="noticed-why">{n.why}</p>
                    <div className="noticed-meta">
                      <span className="noticed-cat">{catName(n)}</span>
                      {n.postedAt && <span>{ago(n.postedAt)}</span>}
                      {icp && <span>{icpPresentation(icp).title}</span>}
                    </div>
                  </div>
                  <div className="noticed-acts">
                    <button
                      type="button"
                      className="btn native-secondary"
                      onClick={() => void api().openExternal(n.url)}
                    >
                      {SOURCE[n.source].verb}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => set(n, n.status === "saved" ? "seen" : "saved")}
                    >
                      {n.status === "saved" ? "Saved" : "Save person"}
                    </button>
                    <button type="button" className="btn ghost" onClick={() => set(n, "dismissed")}>
                      Not relevant
                    </button>
                  </div>
                </article>
              </div>
            );
          })}
        </section>
        <aside className="panel noticed-side">
          <h3>Where we listen</h3>
          <p>
            Hacker News is read through its public page. Reddit, X and LinkedIn are read in your own
            browser through Claude in Chrome, where you are already signed in. It only reads. It
            never posts, likes or follows.
          </p>
          {ws.icps
            .filter((i) => i.listen?.on)
            .map((i) => (
              <div key={i.id} className="noticed-src">
                <b>{icpPresentation(i).title}</b>
                <small>
                  {(Object.keys(SOURCE) as ListenSource[])
                    .filter((s) => i.listen?.sources[s])
                    .map((s) =>
                      s === "reddit" && i.listen?.subreddits.length
                        ? i.listen.subreddits.map((r) => `r/${r}`).join(", ")
                        : SOURCE[s].name
                    )
                    .join(" · ")}
                </small>
              </div>
            ))}
          {(ws.listenProblems ?? []).map((p) => (
            <p key={p} className="noticed-problem">
              {p}
            </p>
          ))}
          <BrowserPanel state={state} onState={onState} compact />
          <div className="noticed-quiet">
            <b>Model:</b> {state.settings.listen?.model || "the lightest"}
            <br />
            <b>Last 7 days:</b> {week ? fmtTokens(tokensOf(week)) : "0"} tokens for listening.
            <br />
            Keywords sort the posts first. AI only checks the few that pass.
          </div>
          <button type="button" className="btn native-secondary" onClick={() => setSetup(true)}>
            Change what we listen for
          </button>
        </aside>
      </div>
    </div>
  );
}
