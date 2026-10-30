import type { CSSProperties } from "react";

const paths: Record<string, React.ReactNode> = {
  arrow: (
    <>
      <path d="M4 12h15M13 5l7 7-7 7" />
    </>
  ),
  diagonal: (
    <>
      <path d="M6 18 18 6M6 6h12v12" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  phone: (
    <path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a14 14 0 0 1-7-7l2-2-2-5Z" />
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  edit: <path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6ZM12 20h9" />,
  file: <path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h6" />,
  tools: <path d="m14 6 4-4 1 5-4 4-3-1-7 9a2 2 0 0 1-3-3l9-7-1-3 4-4 1 5Z" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
      <path d="M9 21v-8h6v8" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v11H3V6Zm11 4h4l3 4v3h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  paint: (
    <>
      <path d="M4 4h14v7H4V4Zm14 3h3v7h-9v3" />
      <rect x="10" y="17" width="4" height="5" rx="1" />
    </>
  ),
  ruler: (
    <>
      <path d="m3 16 13-13 5 5L8 21l-5-5Z" />
      <path d="m13 6 3 3M9 10l3 3M5 14l3 3" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3C8 2 3 7 5 14c2 7 15 6 15-11Z" />
      <path d="M3 21 16 8" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l2 13H3L5 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </>
  ),
  cart: (
    <>
      <path d="M2 3h3l3 12h11l3-9H6M8 15l-1 3h13" />
      <circle cx="9" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.9 13a9 9 0 1 1-9.9-9.9A7 7 0 0 0 20.9 13Z" />,
};

export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name] ?? paths.arrow}
    </svg>
  );
}
