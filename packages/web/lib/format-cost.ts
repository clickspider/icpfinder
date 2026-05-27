// SPDX-License-Identifier: MIT
//
// Single source of truth for cost rendering across the product. Provider events
// stream `costCents` as a raw decimal cent value (e.g. 0.13, 105.05). Engineers
// read the raw number fine; everyone else expected dollars-and-cents the way a
// grocery receipt shows it. We render in standard USD with two decimals.
//
// Rules:
//   <= 0           → "$0.00"
//   < 1¢ (< $0.01) → "<$0.01"   (so 0.40¢ doesn't look like a free run)
//   else           → "$X.XX"
//
// `formatCostCents` is the canonical formatter. Use it everywhere a cost lands
// in the UI; do not roll your own `.toFixed(2)` + "¢" string.

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCostCents(costCents: number): string {
  if (!Number.isFinite(costCents) || costCents <= 0) return "$0.00";
  if (costCents < 1) return "<$0.01";
  return USD.format(costCents / 100);
}

export function formatCostUsd(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return "$0.00";
  if (usd < 0.01) return "<$0.01";
  return USD.format(usd);
}
