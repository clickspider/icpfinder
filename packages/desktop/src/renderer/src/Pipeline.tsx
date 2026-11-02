import { useState } from "react";
import {
  type PipelineStage,
  reachFirst,
  type SetStage,
  STAGE_LABEL,
  stageOf,
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
  { stage: "approved", empty: "Companies you research start here." },
  { stage: "contacted", empty: "Mark a company Contacted after you reach out." },
  { stage: "followup", empty: "Contacted companies with no change for 5 days show up here." },
  { stage: "talking", empty: "Set Talking when someone replies." },
];

type Row = { icp: Icp; c: Company };

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
    <article className="pipe-card">
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

/** Every company the founder works on, across profiles: who to reach first, then the board. */
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
  const [open, setOpen] = useState<string | null>(null);
  const icps = ws.icps.filter((i) => icpId === "all" || i.id === icpId);
  const rows: Row[] = icps.flatMap((icp) => icp.companies.map((c) => ({ icp, c })));
  const buckets = reachFirst(rows.map((r) => r.c));
  const most = Math.max(1, ...buckets.map((b) => b.companies.length));
  const rowOf = (c: Company) => rows.find((r) => r.c === c);
  const closed = rows.filter((r) => ["won", "lost"].includes(stageOf(r.c)));
  return (
    <div className="native-page pipeline scroll">
      <header className="pipeline-head">
        <div>
          <h1 className="ob-h1">Pipeline</h1>
          <p className="ob-sub">Who to reach first, and where each company stands.</p>
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

      <section className="panel reach-first" aria-label="Who to reach first">
        <h2>Who to reach first</h2>
        <p className="native-muted">
          Freshest moment on top. Companies you have not contacted yet.
        </p>
        {buckets.map((b) => (
          <div key={b.key} className="reach-row">
            <button
              type="button"
              className={`btn reach-bar reach-${b.key}`}
              style={{ width: `${Math.max(18, (b.companies.length / most) * 100)}%` }}
              disabled={!b.companies.length}
              aria-expanded={open === b.key}
              onClick={() => setOpen(open === b.key ? null : b.key)}
            >
              {b.label}
            </button>
            <span className="reach-count">
              {b.companies.length} {b.companies.length === 1 ? "company" : "companies"}
            </span>
            {open === b.key && (
              <div className="reach-list">
                {b.companies.map((c) => {
                  const r = rowOf(c);
                  return r ? (
                    <Card
                      key={`${r.icp.id}-${c.domain}`}
                      row={r}
                      showIcp={icpId === "all"}
                      go={go}
                      onState={onState}
                    />
                  ) : null;
                })}
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="pipe-board">
        {COLUMNS.map((col) => {
          const list = rows.filter((r) => stageOf(r.c) === col.stage);
          return (
            <section key={col.stage} className={`pipe-col pipe-col-${col.stage}`}>
              <h3>
                {STAGE_LABEL[col.stage]} <span>{list.length}</span>
              </h3>
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
            </section>
          );
        })}
      </div>
      {closed.length > 0 && (
        <p className="native-muted pipe-closed">
          {closed.filter((r) => stageOf(r.c) === "won").length} customers ·{" "}
          {closed.filter((r) => stageOf(r.c) === "lost").length} not now. Change a stage to bring
          one back.
        </p>
      )}
    </div>
  );
};
