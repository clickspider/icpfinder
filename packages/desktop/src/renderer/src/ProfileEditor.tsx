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
    <section className="panel" style={{ padding: 20 }} aria-label="Customer profile">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 16 }}>Customer profile</h2>
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
          <div className="ir-editor-fields">
            {FIELDS.map(([key, label]) => (
              <label key={key} htmlFor={`profile-${icp.id}-${key}`}>
                {label}
                <input
                  className="field"
                  id={`profile-${icp.id}-${key}`}
                  required
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
            <button className="btn" type="submit" disabled={busy}>
              Save changes
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
        <dl className="ob-brief">
          {FIELDS.map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{values[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
