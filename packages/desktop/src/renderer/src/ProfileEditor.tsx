import { useState } from "react";
import { icpPresentation } from "../../shared/onboarding";
import type { Icp, IcpDraft, State } from "../../shared/types";
import { api } from "./ui";

const FIELDS = [
  ["tag", "Profile characteristics"],
  ["title", "Profile name"],
  ["fit", "How this group could benefit"],
  ["buyer", "Who to talk to"],
  ["signal", "A reason to reach out"],
  ["skip", "May not be a fit if"],
] as const;
export function ProfileEditor({ icp, onState }: { icp: Icp; onState: (state: State) => void }) {
  const [draft, setDraft] = useState<IcpDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const values = icpPresentation(icp);
  return (
    <section className={`panel pe ${draft ? "editing" : ""}`} aria-label="Customer profile">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="pe-title">Customer profile</h2>
        {!draft && (
          <button
            type="button"
            className="btn ghost"
            disabled={icp.sourcing}
            onClick={() => {
              setDraft(values);
              setError("");
            }}
          >
            Edit profile
          </button>
        )}
      </div>
      {draft ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              onState(await api().updateProfile(icp.id, draft));
              setDraft(null);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn’t save profile.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="pe-fields">
            {FIELDS.map(([key, label]) => (
              <label key={key} htmlFor={`profile-${icp.id}-${key}`}>
                {label}
                <textarea
                  className="field pe-input"
                  id={`profile-${icp.id}-${key}`}
                  required
                  rows={1}
                  maxLength={240}
                  disabled={busy}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="ob-overview-actions">
            <button className="ob-cta pe-save" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              className="btn ghost"
              type="button"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="pe-view">
          <div className="pe-summary">
            <p className="pe-fit">{values.fit}</p>
            <p className="pe-tag">{values.tag}</p>
          </div>
          <div className="pe-details">
            <div>
              <span className="pe-label">Who to talk to</span>
              <p>{values.buyer}</p>
            </div>
            <div>
              <span className="pe-label">A reason to reach out</span>
              <p>{values.signal}</p>
            </div>
            <div className="pe-skip">
              <span className="pe-label">May not be a fit if</span>
              <p>{values.skip}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
