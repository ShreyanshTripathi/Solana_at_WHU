// Small stroke icons for the navigation. Decorative: the text next to them carries the meaning.

const paths: Record<string, React.ReactNode> = {
  sell: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  buy: (
    <>
      <path d="M3 11l9-7 9 7v9H3z" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  business: (
    <>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  agent: (
    <>
      <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </>
  ),
  statements: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
    </>
  ),
  projects: (
    <>
      <rect x="3" y="8" width="18" height="10" rx="2" />
      <path d="M7 8V6h10v2M3 13h18" />
    </>
  ),
  federation: (
    <>
      <circle cx="5" cy="12" r="2.5" />
      <circle cx="19" cy="6" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="M7.3 11l9.4-4M7.3 13l9.4 4" />
    </>
  ),
  map: (
    <>
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  home: (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
  console: <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />,
  demo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5z" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

// The wordmark: a black tile with the orange bolt, and the name.
export function Wordmark({
  size = 26,
  dark = false,
}: {
  size?: number;
  dark?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={`flex items-center justify-center rounded-[8px] ${dark ? "bg-white/10 ring-1 ring-white/15" : "bg-[#111111]"}`}
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.54}
          height={size * 0.54}
          viewBox="0 0 24 24"
          fill="#FFB27A"
        >
          <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
        </svg>
      </span>
      <span className="text-[19px] font-semibold tracking-[-0.4px]">Volty</span>
    </span>
  );
}
