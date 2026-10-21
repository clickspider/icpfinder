import { useEffect, useRef, useState } from "react";
import { icpPresentation } from "../../shared/onboarding";
import type { IcpDraft, State, Workspace } from "../../shared/types";
import type { View } from "./App";
import { profileStatus } from "./dashboard-state";
import { api, cleanError } from "./ui";

const fields = [
  ["title", "Profile name"],
  ["tag", "Profile characteristics"],
  ["fit", "How this group could benefit"],
  ["buyer", "Who to talk to"],
  ["signal", "A reason to reach out"],
  ["skip", "May not be a fit if"],
] as const;
export function Overview({
  ws,
  go,
  onState,
}: {
  ws: Workspace;
  go: (v: View) => void;
  onState: (s: State) => void;
}) {
  const [adding, setAdding] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (adding) dialog.current?.showModal();
    else dialog.current?.close();
  }, [adding]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="native-page scroll">
      <header className="native-page-head">
        <div>
          <div className="native-eyebrow">{ws.product.name}</div>
          <h1>Your customer profiles</h1>
          <p>Choose a group to explore. You can edit any profile as you learn more.</p>
        </div>
        <button type="button" className="btn native-secondary" onClick={() => setAdding(true)}>
          ＋ Add a profile
        </button>
      </header>
      <div className="native-list-label">
        <span>Customer group</span>
        <span>Company search</span>
      </div>
      <div className="native-profile-list">
        {ws.icps.map((icp) => {
          const p = icpPresentation(icp);
          return (
            <button
              type="button"
              className="btn native-profile-row"
              key={icp.id}
              onClick={() => go({ kind: "icp", icpId: icp.id })}
            >
              <span>
                <h2>{p.title}</h2>
                <small>{p.tag}</small>
                <p>{p.fit}</p>
              </span>
              <span className="native-row-status">
                {profileStatus(icp, ws)}
                <span aria-hidden="true">›</span>
              </span>
            </button>
          );
        })}
      </div>
      {!ws.icps.length && (
        <p className="native-empty">
          Add a profile or suggest profiles from the sidebar to get started.
        </p>
      )}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setAdding(false);
        }}
        onClose={() => setAdding(false)}
        aria-labelledby="add-profile-title"
        className="native-add-dialog"
      >
        {adding && (
          <>
            <h2 id="add-profile-title">Add a profile</h2>
            <p>You can refine the details later.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const draft = Object.fromEntries(
                  fields.map(([key]) => [key, String(data.get(key) ?? "").trim()])
                ) as unknown as IcpDraft;
                setBusy(true);
                setError("");
                try {
                  onState(await api().addIcp(draft));
                  setAdding(false);
                } catch (e) {
                  setError(cleanError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="ir-editor-fields">
                {fields.map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      autoFocus={key === "title"}
                      className="field"
                      name={key}
                      required
                      maxLength={240}
                      disabled={busy}
                    />
                  </label>
                ))}
              </div>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="native-form-actions">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? "Adding…" : "Add profile"}
                </button>
              </div>
            </form>
          </>
        )}
      </dialog>
    </div>
  );
}
