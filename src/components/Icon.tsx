const PATHS: Record<string, string> = {
  search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm5-2 4 4",
  chevron: "M6 9l6 6 6-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  desk: "M3 10h18M5 10v9M19 10v9",
  close: "M6 6l12 12M18 6L6 18",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  share: "M12 4v11M7.5 8.5 12 4l4.5 4.5M5 14v5h14v-5",
  expand: "M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5",
};

export function Icon({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect x="1.5" y="3" width="23" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="5" y="6.5" width="9" height="8" rx="1.5" fill="var(--accent)" />
      <path d="M9 23h8M13 18v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
