// Line icons on a 24 × 24 grid with one stroke width and square ends, so that
// all icons have the same weight. The icons use the current text color.
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5L19 7',
  close: 'M6 6l12 12M18 6L6 18',
  auto: 'M12 4a8 8 0 0 1 0 16a8 8 0 0 1 0-16zM12 4v16',
  sun: 'M12 8a4 4 0 0 1 0 8a4 4 0 0 1 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  moon: 'M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10z',
  edit: 'M4 20v-4L15 5l4 4L8 20zM12 8l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  tag: 'M4 4h8l8 8-8 8-8-8zM8 8h.01',
  star: 'M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2-5.6-3.2-5.6 3.2 1.3-6.2L3 9.5l6.3-.7z',
  grip: 'M4 8h16M4 12h16M4 16h16',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  rank: 'M3 20h18M5 20v-7h4v7M10 20V5h4v15M15 20v-10h4v10',
  backup: 'M4 14v6h16v-6M12 4v11M8 11l4 4 4-4',
  download: 'M12 4v11M7 10l5 5l5-5M4 20h16',
  upload: 'M12 15V4M7 9l5-5l5 5M4 20h16',
};

export type IconName = keyof typeof PATHS;

// A filled icon uses the current text color also for its area.
export function Icon({ name, size = 20, filled }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg
      className="svg-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
