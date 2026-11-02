import { useState } from "react";
import {
  byReachFirst,
  type PipelineStage,
  type SetStage,
  STAGE_LABEL,
  stageOf,
  WHEN,
  type When,
  whenOf,
} from "../../shared/pipeline";
import { timingOf } from "../../shared/timing";
import type { Company, Icp, State, Workspace } from "../../shared/types";
import type { View } from "./App";
import { api } from "./ui";

/** The stage control on a company: a native menu shown as a chip. */
export const StageChip = ({
  icpId,
  c,
  onState,
}: {
  icpId: string;
  c: Company;
  onState: (s: State) => void;
}) => {
  const stage = stageOf(c);
  const set = (v: string) =>
    void api()
      .setStage(icpId, c.domain, v === "" ? null : (v as SetStage))
      .then(onState);
  return (
    <select
      className={`stage-chip stage-${stage}`}
      aria-label={`Stage for ${c.name}`}
      value={c.pipeline?.stage ?? ""}
      onChange={(e) => set(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">
        {
          STAGE_LABEL[
            stage === "followup" ? "followup" : c.approval === "approved" ? "approved" : "new"
          ]
        }
      </option>
      <option value="contacted">{stage === "followup" ? "Follow up" : "Contacted"}</option>
      <option value="talking">Talking</option>
      <option value="won">Customer</option>
      <option value="lost">Not now</option>
    </select>
  );
};

const COLUMNS: Array<{ stage: PipelineStage; empty: string }> = [
  { stage: "new", empty: "Companies we found that you haven’t researched yet." },
  { stage: "approved", empty: "Companies you research start here." },
  { stage: "contacted", empty: "Mark a company Contacted after you reach out." },
  { stage: "followup", empty: "Contacted companies with no change for 5 days show up here." },
  { stage: "talking", empty: "Set Talking when someone replies." },
];

type Row = { icp: Icp; c: Company };

const DRAG = "application/x-icpfinder-company";

/** What dropping a card on a column does. Follow up is never set by hand, and a researched
 *  company cannot go back to New; dropping a new company on Approved starts its research. */
const dropAction = (to: PipelineStage, c: Company): "approve" | "clear" | SetStage | null => {
  const from = stageOf(c);
  if (to === from || to === "followup" || to === "new") return null;
  if (to === "approved") return c.approval === "approved" ? "clear" : "approve";
  return to as SetStage;
};

const Logo = ({ c }: { c: Company }) =>
  c.logo ? (
    <img src={c.logo} alt="" width={28} height={28} className="pipe-logo" />
  ) : (
    <span className="pipe-logo pipe-initial" aria-hidden="true">
      {(c.name[0] ?? "?").toUpperCase()}
    </span>
  );

const Card = ({
  row,
  showIcp,
  go,
  onState,
}: {
  row: Row;
  showIcp: boolean;
  go: (v: View) => void;
  onState: (s: State) => void;
}) => {
  const { icp, c } = row;
  const when = timingOf(c);
  const signal = c.signals?.[0]?.text ?? c.trigger?.text;
  return (
    <article
      className="pipe-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG, JSON.stringify({ icpId: icp.id, domain: c.domain }));
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        type="button"
        className="btn pipe-open"
        onClick={() => go({ kind: "company", icpId: icp.id, domain: c.domain })}
      >
        <span className="pipe-name">
          <Logo c={c} />
          <b className="ellipsis">{c.name}</b>
        </span>
        {showIcp && <span className="pipe-icp ellipsis">{icp.name}</span>}
        <span className="pipe-why clamp2">
          <span className={`timing timing-${when.tone}`}>{when.label}</span>{" "}
          {signal ?? "No recent signal found"}
        </span>
      </button>
      <StageChip icpId={icp.id} c={c} onState={onState} />
    </article>
  );
};

/** Every company the founder works on, across profiles, on one board. The filters on top pick
 *  the profile and how fresh the moment is; each column lists freshest and best match first. */
export const Pipeline = ({
  ws,
  go,
  onState,
}: {
  ws: Workspace;
  go: (v: View) => void;
  onState: (s: State) => void;
}) => {
  const [icpId, setIcpId] = useState<string>("all");
  const [when, setWhen] = useState<When | "all">("all");
  const [over, setOver] = useState<PipelineStage | null>(null);
  const drop = (to: PipelineStage, raw: string) => {
    setOver(null);
    let at: { icpId?: string; domain?: string };
    try {
      at = JSON.parse(raw);
    } catch {
      return;
    }
    const r = inProfile.find((x) => x.icp.id === at.icpId && x.c.domain === at.domain);
    const act = r && dropAction(to, r.c);
    if (!r || !act) return;
    const done =
      act === "approve"
        ? api().approveCompany(r.icp.id, r.c.domain, true)
        : api().setStage(r.icp.id, r.c.domain, act === "clear" ? null : act);
    void done.then(onState);
  };
  const now = Date.now();
  const inProfile: Row[] = ws.icps
    .filter((i) => icpId === "all" || i.id === icpId)
    .flatMap((icp) => icp.companies.map((c) => ({ icp, c })))
    .filter((r) => r.c.approval !== "rejected");
  const open = inProfile.filter((r) => !["won", "lost"].includes(stageOf(r.c, now)));
  const rows = open
    .filter((r) => when === "all" || whenOf(r.c, now) === when)
    .sort((a, z) => byReachFirst(now)(a.c, z.c));
  const count = (k: When) => open.filter((r) => whenOf(r.c, now) === k).length;
  const most = Math.max(1, ...WHEN.map((w) => count(w.key)));
  const closed = inProfile.filter((r) => ["won", "lost"].includes(stageOf(r.c, now)));
  return (
    <div className="native-page pipeline">
      <header className="pipeline-head">
        <div>
          <h1 className="ob-h1">Pipeline</h1>
          <p className="ob-sub">Freshest moment first. Pick when to see who to reach first.</p>
        </div>
        {ws.icps.length > 1 && (
          <div className="ob-seg">
            {[{ id: "all", name: "All profiles" }, ...ws.icps].map((i) => (
              <button
                key={i.id}
                type="button"
                aria-pressed={icpId === i.id}
                className={icpId === i.id ? "on" : ""}
                onClick={() => setIcpId(i.id)}
              >
                <span className="ellipsis">{i.name}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="reach-filter">
        {WHEN.map((w) => {
          const n = count(w.key);
          const on = when === w.key;
          return (
            <button
              key={w.key}
              type="button"
              aria-pressed={on}
              className={`btn reach-pick reach-${w.key} ${on ? "on" : ""}`}
              disabled={!n}
              onClick={() => setWhen(on ? "all" : w.key)}
            >
              <span>{w.label}</span>
              <b>{n}</b>
              <i style={{ width: `${(n / most) * 100}%` }} aria-hidden="true" />
            </button>
          );
        })}
        {when !== "all" && (
          <button type="button" className="btn native-secondary" onClick={() => setWhen("all")}>
            Show all
          </button>
        )}
      </div>

      <div className="pipe-board">
        {COLUMNS.map((col) => {
          const list = rows.filter((r) => stageOf(r.c, now) === col.stage);
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: drop target for mouse dragging; the stage chip on each card does the same by keyboard
            <section
              key={col.stage}
              className={`pipe-col pipe-col-${col.stage} ${over === col.stage ? "drop" : ""}`}
              onDragOver={(e) => {
                if (col.stage === "followup" || col.stage === "new") return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (over !== col.stage) setOver(col.stage);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(col.stage, e.dataTransfer.getData(DRAG));
              }}
            >
              <h3>
                {STAGE_LABEL[col.stage]} <span>{list.length}</span>
              </h3>
              <div className="pipe-cards">
                {list.length ? (
                  list.map((r) => (
                    <Card
                      key={`${r.icp.id}-${r.c.domain}`}
                      row={r}
                      showIcp={icpId === "all"}
                      go={go}
                      onState={onState}
                    />
                  ))
                ) : (
                  <p className="native-muted">{col.empty}</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {closed.length > 0 && (
        <p className="native-muted pipe-closed">
          {closed.filter((r) => stageOf(r.c, now) === "won").length} customers ·{" "}
          {closed.filter((r) => stageOf(r.c, now) === "lost").length} not now. Change a stage to
          bring one back.
        </p>
      )}
    </div>
  );
};
