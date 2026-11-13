import type { ReactNode } from "react";

/* One drawn icon set: 24px box, 1.8 stroke, round joins. */
const P: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4Z" /><circle cx="12" cy="13" r="3.6" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.4" /></>,
  pen: <><path d="M4 20l1-4L16 5l3 3L8 19Z" /><path d="M14 7l3 3" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.6-1.6-1.8-1.6-3.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-3.9-4-7-9-7Z" /><circle cx="7.5" cy="11" r="1.1" /><circle cx="10" cy="7" r="1.1" /><circle cx="14.5" cy="7" r="1.1" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16.2 14.1c2.6-.3 4.4 1.3 4.8 4.4" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  book: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6" /></>,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></>,
  moon: <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5 8 8 0 1 0 19.5 14.6z" />,
  auto: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></>,
  rotl: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></>,
  rotr: <><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v4h-4" /></>,
  bigger: <><circle cx="11" cy="11" r="7" /><path d="M16 16l5 5M11 8v6M8 11h6" /></>,
  smaller: <><circle cx="11" cy="11" r="7" /><path d="M16 16l5 5M8 11h6" /></>,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  more: <><circle cx="5.5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18.5" cy="12" r="1.3" /></>,
  contents: <path d="M5 6h14M5 12h14M5 18h9" />,
  out: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  turn: <><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></>,

  /* How the home shows the books: on the shelves, or face-out in a row */
  shelf: <><path d="M4 3v18M20 3v18M4 12h16M4 20.5h16" /><path d="M7.5 12V6.5M10.5 12V5.5M14 12V7.5l2.5-1.2L18 12M8 20.5V15M11 20.5v-6" /></>,
  carousel: <><rect x="7.5" y="4.5" width="9" height="13" rx="1.5" /><path d="M4 7v8M20 7v8M10 20.5h.01M12 20.5h.01M14 20.5h.01" /></>,

  /* Signing up: who, where and how people travel, and where they heard of NinRe */
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" />,
  home: <><path d="M4 11l8-6.5 8 6.5v9H4Z" /><path d="M10 20v-5.5h4V20" /></>,
  mountain: <><path d="M2.5 19.5 9 8.5l4 6 2.7-3.8 5.8 8.8Z" /><path d="M7.3 11.4 9 12.6l1.7-1.3" /></>,
  wave: <><circle cx="17" cy="6.5" r="2.5" /><path d="M3 13c2.2 0 2.2-1.6 4.5-1.6S9.8 13 12 13s2.2-1.6 4.5-1.6S18.8 13 21 13" /><path d="M3 18c2.2 0 2.2-1.6 4.5-1.6S9.8 18 12 18s2.2-1.6 4.5-1.6S18.8 18 21 18" /></>,
  city: <><path d="M3 20.5h18" /><path d="M5 20.5V10h5v10.5" /><path d="M10 20.5V4h6v16.5" /><path d="M16 20.5V12h3v8.5" /><path d="M12.5 8h1M12.5 11.5h1M12.5 15h1M7 13.5h1M7 17h1" /></>,
  food: <><path d="M3.5 12h17a8.5 8.5 0 0 1-17 0Z" /><path d="M13 3.5l-2.5 8.5M18.5 4.5 14 12" /></>,
  car: <><path d="M3.5 16.5V13l2.2-5h12.6l2.2 5v3.5Z" /><path d="M3.5 13h17" /><circle cx="7.5" cy="16.5" r="1.8" /><circle cx="16.5" cy="16.5" r="1.8" /></>,
  backpack: <><path d="M6 10a6 6 0 0 1 12 0v10.5H6Z" /><path d="M9.5 4.6V3h5v1.6" /><path d="M9 20.5V15h6v5.5" /><path d="M6 12.5h12" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15.5" rx="2" /><path d="M4 10h16M8.5 3v4M15.5 3v4" /></>,
  plane: <><path d="M21 3.5 3 10.8l7 2.6 2.6 7.1Z" /><path d="M10 13.4 21 3.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  phone: <><rect x="6.5" y="3" width="11" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10.5 21 8v8l-5-2.5" /></>,
  chat: <path d="M4 5h16v11H9.5L4 20Z" />,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>,

  /* Kinds of book */
  journal: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z" /><path d="M9 4v14M15 6v14" /></>,
  album: <><rect x="7" y="7" width="13" height="13" rx="1.5" /><path d="M4 16V5a1 1 0 0 1 1-1h11" /><path d="M7 17l3.5-4 3 3 2-2 4.5 4.5" /></>,

  /* Settings */
  bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /><circle cx="12" cy="12" r="6.6" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  shield: <><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6Z" /><path d="M9 12l2.2 2.2L15.5 10" /></>,
  "user-plus": <><circle cx="10" cy="8" r="3.4" /><path d="M3.5 20c.7-3.8 3.2-5.6 6.5-5.6 1.4 0 2.6.3 3.6.9" /><path d="M18 14v6M15 17h6" /></>,
  download: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19.5h14" /></>,

  /* How an album page lays its photos out */
  "lay-grid": <><rect x="3" y="4" width="8" height="7" rx="1" /><rect x="13" y="4" width="8" height="7" rx="1" /><rect x="3" y="13" width="8" height="7" rx="1" /><rect x="13" y="13" width="8" height="7" rx="1" /></>,
  "lay-feature": <><rect x="3" y="4" width="11" height="16" rx="1" /><rect x="16" y="4" width="5" height="7" rx="1" /><rect x="16" y="13" width="5" height="7" rx="1" /></>,
  "lay-collage": <><rect x="3" y="4" width="11" height="10" rx="1" /><rect x="16" y="4" width="5" height="4" rx="1" /><rect x="16" y="10" width="5" height="4" rx="1" /><rect x="3" y="16" width="18" height="4" rx="1" /></>,
  "lay-strip": <><rect x="6" y="2.5" width="5" height="19" rx="1" /><rect x="13" y="2.5" width="5" height="19" rx="1" /><path d="M6 9h5M6 15h5M13 9h5M13 15h5" /></>,
  "lay-spread": <><rect x="2.5" y="5" width="19" height="14" rx="1" /><path d="M12 5v14" strokeDasharray="2 2" /><path d="M2.5 16l5-5 4 4 3-3 7 6" /></>,
};

export type IconName = keyof typeof P;

export function Icon({ name, className, title }: { name: IconName; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {P[name]}
    </svg>
  );
}
