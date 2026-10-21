import { useState } from "react";
import { marketplaceOf, OVERVIEW_FIELDS } from "../../shared/business-overview";
import type { Product } from "../../shared/types";

export function BusinessOverview({
  product,
  loading,
  name,
  onSave,
  onEditing,
}: {
  product?: Product;
  loading?: boolean;
  name?: string;
  onSave?: (patch: Partial<Product>) => Promise<void>;
  onEditing?: (editing: boolean) => void;
}) {
  const [draft, setDraft] = useState<Product | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (loading || !product)
    return (
      <>
        <h2>{name || "Your business"}</h2>
        <div className="ob-brief-skeleton" role="status" aria-label="Preparing business overview">
          <span />
          <span />
        </div>
      </>
    );
  // Every field in edit mode has the same label and position in view mode.
  const shown = draft ?? product;
  const fields = OVERVIEW_FIELDS.filter(
    ([key]) => key === "name" || key === "sell" || key === "problem" || Boolean(product[key])
  );
  const close = () => {
    setDraft(null);
    setEditing(false);
    setError("");
    onEditing?.(false);
  };
  const save = async () => {
    if (!draft || !onSave) return;
    setSaving(true);
    setError("");
    try {
      const patch: Partial<Product> = {
        marketplace: marketplaceOf(draft),
        model: undefined,
        confirmedFields: [
          ...new Set([
            ...(product.confirmedFields ?? []),
            ...fields.map(([key]) => key),
            "marketplace",
          ]),
        ],
      };
      for (const [key] of fields) patch[key] = draft[key]?.trim() ?? "";
      await onSave(patch);
      close();
    } catch {
      setError("Couldn’t save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const structure =
    marketplaceOf(product) === undefined
      ? "Not specified"
      : marketplaceOf(product)
        ? "Marketplace connecting buyers and sellers"
        : "Not a marketplace";
  const beginEdit = () => {
    if (!draft) setDraft({ ...product, marketplace: marketplaceOf(product) });
    setEditing(true);
    onEditing?.(true);
  };
  return (
    <div className="ob-flip-scene">
      <fieldset className="ob-overview-mode" aria-label="Overview mode">
        <button
          type="button"
          aria-label="View overview"
          title="View overview"
          aria-pressed={!editing}
          disabled={saving}
          onClick={() => {
            setEditing(false);
            onEditing?.(false);
          }}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Edit overview"
          title="Edit overview"
          aria-pressed={editing}
          disabled={saving || !onSave}
          onClick={beginEdit}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z" />
          </svg>
        </button>
      </fieldset>
      <div className={`ob-flip-shell ${editing ? "is-editing" : ""}`}>
        <section
          className="ob-flip-face ob-flip-view"
          aria-hidden={editing}
          ref={(el) => {
            if (el) el.inert = editing;
          }}
        >
          <div className="ob-flip-content">
            <h2>{product.name || "Your business"}</h2>
            <dl className="ob-brief ob-overview">
              {fields.map(([key, label]) => (
                <div key={key}>
                  <dt>
                    {label}
                    {!product.confirmedFields?.includes(key) && product[key] && (
                      <span className="ob-suggestion">Suggested</span>
                    )}
                  </dt>
                  <dd>{product[key] || "Not provided"}</dd>
                </div>
              ))}
              <div>
                <dt>
                  Business structure
                  {marketplaceOf(product) !== undefined &&
                    !product.confirmedFields?.includes("marketplace") && (
                      <span className="ob-suggestion">Suggested</span>
                    )}
                </dt>
                <dd>{structure}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section
          className="ob-flip-face ob-flip-edit"
          aria-hidden={!editing}
          ref={(el) => {
            if (el) el.inert = !editing;
          }}
        >
          <form
            className="ob-flip-content ob-overview-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <h2>Edit overview</h2>
            <p className="ob-form-help">Check that the details reflect your business.</p>
            {fields.map(([key, label]) => (
              <div className="ob-form-field" key={key}>
                <label htmlFor={`overview-${key}`}>{label}</label>
                {key === "name" ? (
                  <input
                    id={`overview-${key}`}
                    value={shown[key] ?? ""}
                    disabled={saving}
                    onChange={(e) => draft && setDraft({ ...draft, [key]: e.target.value })}
                  />
                ) : (
                  <textarea
                    id={`overview-${key}`}
                    rows={3}
                    value={shown[key] ?? ""}
                    disabled={saving}
                    onChange={(e) => draft && setDraft({ ...draft, [key]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <div className="ob-form-field">
              <label htmlFor="overview-marketplace">Business structure</label>
              <select
                id="overview-marketplace"
                disabled={saving}
                value={
                  marketplaceOf(shown) === undefined
                    ? "unknown"
                    : marketplaceOf(shown)
                      ? "yes"
                      : "no"
                }
                onChange={(e) =>
                  draft &&
                  setDraft({
                    ...draft,
                    model: undefined,
                    marketplace:
                      e.target.value === "unknown" ? undefined : e.target.value === "yes",
                  })
                }
              >
                <option value="unknown">Not specified</option>
                <option value="yes">Marketplace connecting buyers and sellers</option>
                <option value="no">Not a marketplace</option>
              </select>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="ob-overview-actions">
              <button type="submit" className="ob-cta" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="btn ghost" disabled={saving} onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
