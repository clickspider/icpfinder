/** Small, monochrome interface symbols; never platform emoji glyphs. */
const paths = {
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  source: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5",
  check: "M5 12l5 5L20 6",
  close: "M6 6l12 12M18 6L6 18",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  minus: "M5 12h14",
  refine: "M4 7h16M4 17h16M8 4v6M16 14v6",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  target:
    "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0M12 10v4M10 12h4",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z",
  lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4",
  warning: "M12 3L2 21h20zM12 9v5M12 17v1",
} as const;
export function AppIcon({ name, size = 16 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, verticalAlign: "middle" }}
    >
      <path d={paths[name]} />
    </svg>
  );
}
