// SPDX-License-Identifier: MIT
import { useState } from "react";
import { businessEditPatch } from "../../shared/business-edit";
import {
  AUDIENCES,
  marketplaceOf,
  OVERVIEW_FIELDS,
  PROGRESS,
} from "../../shared/business-overview";
import type { Product, State, Workspace } from "../../shared/types";
import { api, ProductLogo } from "./ui";

export const ProductView = ({ ws, onState }: { ws: Workspace; onState: (s: State) => void }) => {
  const p = ws.product;
  const [draft, setDraft] = useState<Product | null>(null);
  const [proposal, setProposal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fields = OVERVIEW_FIELDS.filter(
    ([key]) => ["name", "sell", "problem"].includes(key) || p[key] || draft?.[key]
  );
  const close = () => {
    setDraft(null);
    setProposal(false);
    setError("");
  };
  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      onState(await api().updateProduct(businessEditPatch(p, draft)));
      close();
    } catch {
      setError("Couldn’t save your changes. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const proposed = await api().previewBusiness();
      setDraft({ ...p, ...proposed });
      setProposal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const marketplace = marketplaceOf(p) === true || marketplaceOf(draft ?? p) === true;
  return (
    <div className="native-page native-business-page scroll enter">
      <header className="native-page-head">
        <div>
          <div className="native-eyebrow">Your business</div>
          <div className="native-business-title">
            <ProductLogo product={p} size={40} radius={9} />
            <h1>{p.name}</h1>
          </div>
          <p>Review and edit your business details.</p>
        </div>
        {!draft && (
          <button
            type="button"
            className="native-secondary"
            disabled={busy}
            onClick={() => setDraft({ ...p })}
          >
            Edit overview
          </button>
        )}
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="native-business-content">
        {draft ? (
          <form
            className="native-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <h2>{proposal ? "Review updated information" : "Edit overview"}</h2>
            <p>
              {proposal
                ? "These website suggestions haven’t been saved. Check each detail before applying them. Your profiles and research will stay as they are."
                : "Check that the details reflect your business."}
            </p>
            <fieldset disabled={busy}>
              {fields.map(([key, label]) => (
                <label key={key} htmlFor={`business-${key}`}>
                  {label}
                  {key === "name" ? (
                    <input
                      id={`business-${key}`}
                      required
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    />
                  ) : (
                    <textarea
                      id={`business-${key}`}
                      rows={3}
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    />
                  )}
                  {proposal && <small>Saved: {p[key] || "Not provided"}</small>}
                </label>
              ))}
              <label>
                Who do you sell to?
                <select
                  value={draft.audience ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, audience: AUDIENCES.find((v) => v === e.target.value) })
                  }
                >
                  <option value="">Not specified</option>
                  {AUDIENCES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                {proposal && <small>Saved: {p.audience || "Not specified"}</small>}
              </label>
              <label>
                Where is your business today?
                <select
                  value={draft.progress ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, progress: PROGRESS.find((v) => v === e.target.value) })
                  }
                >
                  <option value="">Not specified</option>
                  {PROGRESS.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                {proposal && <small>Saved: {p.progress || "Not specified"}</small>}
              </label>
              {marketplace && (
                <label>
                  Business structure
                  <select
                    value={marketplaceOf(draft) ? "yes" : "no"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        model: undefined,
                        marketplace: e.target.value === "yes",
                      })
                    }
                  >
                    <option value="yes">Marketplace connecting buyers and sellers</option>
                    <option value="no">Not a marketplace</option>
                  </select>
                </label>
              )}
              <div className="native-form-actions">
                <button type="button" className="ghost btn" onClick={close}>
                  Cancel
                </button>
                <button type="submit" className="primary btn">
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </fieldset>
          </form>
        ) : (
          <>
            <dl className="native-facts">
              {fields.map(([key, label]) => (
                <div key={key}>
                  <dt>
                    {label}
                    {p[key] && !p.confirmedFields?.includes(key) && <small>Suggested</small>}
                  </dt>
                  <dd>{p[key] || "Not provided"}</dd>
                </div>
              ))}
              <div>
                <dt>
                  Who do you sell to?
                  {p.audience && !p.confirmedFields?.includes("audience") && (
                    <small>Suggested</small>
                  )}
                </dt>
                <dd>{p.audience || "Not specified"}</dd>
              </div>
              <div>
                <dt>
                  Where is your business today?
                  {p.progress && !p.confirmedFields?.includes("progress") && (
                    <small>Suggested</small>
                  )}
                </dt>
                <dd>{p.progress || "Not specified"}</dd>
              </div>
              {marketplace && (
                <div>
                  <dt>
                    Business structure
                    {!p.confirmedFields?.includes("marketplace") && <small>Suggested</small>}
                  </dt>
                  <dd>Marketplace connecting buyers and sellers</dd>
                </div>
              )}
            </dl>
            <section className="native-maintenance">
              <h2>Keep your overview up to date</h2>
              <p>
                Saved changes inform future research and profile suggestions. Existing profiles and
                research stay unchanged.
              </p>
              {/^https?:\/\//.test(p.url) ? (
                <>
                  <small>{p.url}</small>
                  <div>
                    <button
                      type="button"
                      className="native-secondary"
                      disabled={busy}
                      onClick={() => void refresh()}
                    >
                      {busy ? "Reading your website…" : "Check website for updates"}
                    </button>
                  </div>
                  <small>
                    Uses your selected provider. You’ll review suggestions before saving.
                  </small>
                </>
              ) : (
                <small>
                  This business was described in writing. Use Edit overview to update it.
                </small>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
};
