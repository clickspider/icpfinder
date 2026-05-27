// SPDX-License-Identifier: MIT

"use client";

interface RunDoneCalloutsProps {
  byok: boolean;
  variant: "hero" | "find";
  /** When provided, "Add keys" toggles inline panel; otherwise it links to /find#keys. */
  onAddKeys?: () => void;
}

export function RunDoneCallouts({ byok, variant, onAddKeys }: RunDoneCalloutsProps) {
  const pillClass =
    "rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-3.5 py-1.5 transition-colors hover:bg-[color:var(--bg-card-hi)] hover:text-[color:var(--text)]";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-[13px] text-[color:var(--text-muted)]">
      {variant === "hero" ? (
        <a href="/find" className={pillClass}>
          Run again on /find →
        </a>
      ) : null}
      {!byok ? (
        onAddKeys ? (
          <button type="button" onClick={onAddKeys} className={pillClass}>
            Add your keys for unlimited ↓
          </button>
        ) : (
          <a href="/find#keys" className={pillClass}>
            Add your keys for unlimited →
          </a>
        )
      ) : null}
    </div>
  );
}
