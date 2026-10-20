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
  return (
    <>
      <h2>{product.name || "Your business"}</h2>
      <dl className="ob-brief ob-overview">
        {fields.map(([key, label]) => (
          <div key={key}>
            <dt>
              <label htmlFor={`overview-${key}`}>{label}</label>
              {!product.confirmedFields?.includes(key) && product[key] && (
                <span className="ob-suggestion">Suggested</span>
              )}
            </dt>
            <dd>
              {draft ? (
                <textarea
                  id={`overview-${key}`}
                  className="field"
                  rows={key === "name" ? 1 : 2}
                  value={shown[key] ?? ""}
                  disabled={saving}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              ) : (
                product[key] || "Not provided"
              )}
            </dd>
          </div>
        ))}
        <div>
          <dt>
            <label htmlFor="overview-marketplace">Business structure</label>
            {marketplaceOf(product) !== undefined &&
              !product.confirmedFields?.includes("marketplace") && (
                <span className="ob-suggestion">Suggested</span>
              )}
          </dt>
          <dd>
            {draft ? (
              <select
                id="overview-marketplace"
                className="field"
                disabled={saving}
                value={
                  marketplaceOf(draft) === undefined
                    ? "unknown"
                    : marketplaceOf(draft)
                      ? "yes"
                      : "no"
                }
                onChange={(e) =>
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
            ) : marketplaceOf(product) === undefined ? (
              "Not specified"
            ) : marketplaceOf(product) ? (
              "Marketplace connecting buyers and sellers"
            ) : (
              "Not a marketplace"
            )}
          </dd>
        </div>
      </dl>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="ob-overview-actions">
        {draft ? (
          <>
            <button type="button" className="btn" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="btn ghost" disabled={saving} onClick={close}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn ghost"
            disabled={!onSave}
            onClick={() => {
              setDraft({ ...product, marketplace: marketplaceOf(product) });
              onEditing?.(true);
            }}
          >
            Edit overview
          </button>
        )}
      </div>
    </>
  );
}
