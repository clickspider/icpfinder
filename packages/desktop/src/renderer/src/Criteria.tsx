// SPDX-License-Identifier: MIT
//
// The ICP gates in one card: tabs (or a trackpad swipe) per list, an icon per
// item, and every item editable in place.

import { useRef, useState } from "react";
import type { IcpCriteria } from "../../shared/types";

type Key = keyof IcpCriteria;

const TABS: Array<{ key: Key; label: string; color: string; bg: string; d: string }> = [
  { key: "mustHave", label: "Must have", color: "#1f8a43", bg: "#e6f5ea", d: "M5 12l5 5 9-10" },
  {
    key: "signals",
    label: "Signals",
    color: "#c25400",
    bg: "#fff3e0",
    d: "M13 2L4 14h7l-1 8 9-12h-7z",
  },
  {
    key: "dealBreakers",
    label: "Not if",
    color: "#b01a39",
    bg: "#fff0f3",
    d: "M6 6l12 12 M18 6L6 18",
  },
];

// One icon per item, picked from its words; the tab icon when nothing fits.
const ITEM_ICONS: Array<[RegExp, string]> = [
  [
    /fund|raised|venture|series|seed|\$|revenue|mrr|bootstrap/i,
    "M12 3v18 M16.5 7.5c-1-1.5-2.7-2-4.5-2-2.5 0-4 1.3-4 3s1.5 2.6 4 3 4 1.4 4 3.2-1.8 3-4.2 3c-2 0-3.6-.7-4.6-2",
  ],
  [/pric|paid|plan|free tier|trial/i, "M3 12V4h8l10 10-8 8z M7.5 7.5h.01"],
  [
    /launch|product hunt|show hn|beta|waitlist/i,
    "M12 3c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10z M9 16l-2 4 M15 16l2 4",
  ],
  [/sales|sdr|hire|hiring|role|job/i, "M4 8h16v11H4z M9 8V5h6v3"],
  [/post|linkedin|twitter|tweet|blog|writ/i, "M4 5h16v11H8l-4 4z"],
  [/competitor|apollo|clay|uses |tool/i, "M7 7h13 M17 4l3 3-3 3 M17 17H4 M7 14l-3 3 3 3"],
  [/within|month|week|recent|days|year/i, "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l3 2"],
  [/open.?source|github|repo|code|api|sdk|developer/i, "M8 8l-4 4 4 4 M16 8l4 4-4 4"],
  [
    /homepage|site|copy|page|website/i,
    "M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c2.5 3 2.5 15 0 18",
  ],
  [/b2c|consumer|hobby/i, "M12 11a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0"],
  [
    /team|people|founder|solo|employee|person/i,
    "M9 11a3 3 0 100-6 3 3 0 000 6z M3 20a6 6 0 0112 0 M17 11a3 3 0 100-6 M21 20a6 6 0 00-4-5.7",
  ],
  [
    /b2b|saas|product|compan|business/i,
    "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5",
  ],
];

const SOURCE = /\s*\(source:[^)]*\)/i;

const Svg = ({ d, c, s = 14 }: { d: string; c: string; s?: number }) => (
  <svg
    aria-hidden="true"
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

export const Criteria = ({
  criteria,
  onSave,
}: {
  criteria: IcpCriteria;
  onSave: (c: IcpCriteria) => void;
}) => {
  const [tab, setTab] = useState(0);
  const [edit, setEdit] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState("");
  const swipe = useRef(0);
  const t = TABS[tab] as (typeof TABS)[number];
  const items = criteria[t.key];

  const save = (i: number | "new", text: string) => {
    const clean = text.trim();
    const next = [...items];
    if (i === "new") {
      if (clean) next.push(clean);
    } else if (!clean) next.splice(i, 1);
    else {
      const source = items[i]?.match(SOURCE)?.[0] ?? "";
      next[i] = clean === items[i]?.replace(SOURCE, "") ? (items[i] ?? clean) : clean + source;
    }
    onSave({ ...criteria, [t.key]: next });
    setEdit(null);
  };

  const go = (n: number) => {
    setEdit(null);
    setTab((n + TABS.length) % TABS.length);
  };

  return (
    <div
      onWheel={(e) => {
        // Two-finger swipe left/right on the trackpad switches tabs.
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        swipe.current += e.deltaX;
        if (Math.abs(swipe.current) > 120) {
          go(tab + (swipe.current > 0 ? 1 : -1));
          swipe.current = 0;
        }
      }}
    >
      <div role="tablist" className="seg">
        {TABS.map((x, i) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={i === tab}
            className={`btn seg-tab ${i === tab ? "on" : ""}`}
            onClick={() => go(i)}
          >
            <Svg d={x.d} c={i === tab ? x.color : "#8e8e93"} s={12} />
            {x.label}
            <span style={{ color: "var(--faint)", fontWeight: 500 }}>{criteria[x.key].length}</span>
          </button>
        ))}
      </div>
      <ul className="crit-list" role="tabpanel" aria-label={t.label}>
        {items.map((full, i) => {
          const text = full.replace(SOURCE, "");
          const icon = ITEM_ICONS.find(([re]) => re.test(text))?.[1] ?? t.d;
          return (
            <li key={`${t.key}-${full}`} className="crit-item">
              <span className="crit-icon" style={{ background: t.bg }}>
                <Svg d={icon} c={t.color} />
              </span>
              {edit === i ? (
                <input
                  className="field crit-input"
                  // biome-ignore lint/a11y/noAutofocus: edit starts on the user's click
                  autoFocus
                  value={draft}
                  aria-label="Edit item"
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => save(i, draft)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") save(i, draft);
                    if (e.key === "Escape") setEdit(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="btn crit-text"
                  title={
                    full.match(SOURCE)
                      ? `${full.match(SOURCE)?.[0].trim()} · click to edit`
                      : "Click to edit"
                  }
                  onClick={() => {
                    setDraft(text);
                    setEdit(i);
                  }}
                >
                  {text}
                </button>
              )}
              <button
                type="button"
                className="btn crit-del"
                aria-label={`Remove: ${text}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => save(i, "")}
              >
                <Svg d="M6 6l12 12 M18 6L6 18" c="currentColor" s={12} />
              </button>
            </li>
          );
        })}
        <li className="crit-item">
          {edit === "new" ? (
            <>
              <span className="crit-icon" style={{ background: t.bg }}>
                <Svg d={t.d} c={t.color} />
              </span>
              <input
                className="field crit-input"
                // biome-ignore lint/a11y/noAutofocus: add starts on the user's click
                autoFocus
                value={draft}
                placeholder={`New ${t.label.toLowerCase()} item`}
                aria-label="New item"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => save("new", draft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save("new", draft);
                  if (e.key === "Escape") setEdit(null);
                }}
              />
            </>
          ) : (
            <button
              type="button"
              className="btn crit-add"
              onClick={() => {
                setDraft("");
                setEdit("new");
              }}
            >
              + Add
            </button>
          )}
        </li>
      </ul>
    </div>
  );
};
