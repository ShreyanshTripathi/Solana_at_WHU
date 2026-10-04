// Volty, the mascot: a cheerful lightning bolt with a little sun behind it. Plain SVG, so it renders
// on the server, scales to any size and needs no image file. `mood` changes the face; `mark` drops
// the sun rays for small sizes (the top bar, the favicon).

export type VoltyMood = "happy" | "wink" | "wow";

export function Volty({
  size = 64,
  mood = "happy",
  mark = false,
  className,
  title = "Volty",
}: {
  size?: number;
  mood?: VoltyMood;
  mark?: boolean;
  className?: string;
  title?: string;
}) {
  const id = `volty-${mood}-${mark ? "m" : "f"}`;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={title} className={className}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="55%" stopColor="#FCC419" />
          <stop offset="100%" stopColor="#F59F00" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFF3BF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFF3BF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {mark && <circle cx="60" cy="60" r="58" fill="#14213D" />}
      {!mark && (
        <g>
          <circle cx="60" cy="58" r="52" fill={`url(#${id}-glow)`} />
          {/* Sun rays */}
          <g stroke="#F2A93B" strokeWidth="6" strokeLinecap="round">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
              const r = (a * Math.PI) / 180;
              return <line key={a} x1={60 + Math.cos(r) * 44} y1={58 + Math.sin(r) * 44} x2={60 + Math.cos(r) * 53} y2={58 + Math.sin(r) * 53} />;
            })}
          </g>
        </g>
      )}

      {/* The bolt (a little smaller on the round mark) */}
      <g transform={mark ? "translate(9 9) scale(0.85)" : undefined}>
      <path
        d="M70 6 L23 66 L51 66 L41 114 L97 47 L67 47 L81 6 Z"
        fill={`url(#${id}-body)`}
        stroke="#E8590C"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* A shine on the upper arm */}
      <path d="M70 15 L41 54" stroke="#FFF9DB" strokeWidth="4" strokeLinecap="round" opacity="0.8" />

      {/* Cheeks */}
      <ellipse cx="46" cy="63" rx="5" ry="3" fill="#FF8787" opacity="0.55" />
      <ellipse cx="77" cy="60" rx="5" ry="3" fill="#FF8787" opacity="0.55" />

      {/* Eyes */}
      {mood === "wink" ? (
        <>
          <circle cx="53" cy="55" r="5.5" fill="#FFFFFF" stroke="#7A3E00" strokeWidth="1.5" />
          <circle cx="54" cy="56" r="2.8" fill="#2B1A00" />
          <path d="M63 55 Q68 51 73 55" fill="none" stroke="#2B1A00" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="53" cy="55" r="5.5" fill="#FFFFFF" stroke="#7A3E00" strokeWidth="1.5" />
          <circle cx="68" cy="54" r="5.5" fill="#FFFFFF" stroke="#7A3E00" strokeWidth="1.5" />
          <circle cx="54" cy="56" r={mood === "wow" ? 2 : 2.8} fill="#2B1A00" />
          <circle cx="69" cy="55" r={mood === "wow" ? 2 : 2.8} fill="#2B1A00" />
          <circle cx="55" cy="54.5" r="1" fill="#FFFFFF" />
          <circle cx="70" cy="53.5" r="1" fill="#FFFFFF" />
        </>
      )}

      {/* Mouth */}
      {mood === "wow" ? (
        <ellipse cx="62" cy="66" rx="3.5" ry="4" fill="#7A3E00" />
      ) : (
        <path d="M56 64 Q62 71 69 63" fill="#7A3E00" stroke="#7A3E00" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      </g>
    </svg>
  );
}
