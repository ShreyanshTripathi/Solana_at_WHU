// The flat street map used inside the app preview: roofs, roads and animated flows, with the
// viewer's own roof marked "You". Illustrative, like the 3D view.
export function FlatStreetMap({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 800 400"
      className="block h-auto w-full"
      role="img"
      aria-label={label}
    >
      <rect width="800" height="400" fill="#F7F7F4" />
      <g fill="none" strokeLinecap="round">
        <g stroke="#E9E9E4" strokeWidth="24">
          <path d="M0,230 L800,230" />
          <path d="M410,0 L410,400" />
          <path d="M0,40 C200,25 300,50 410,40" />
        </g>
        <g stroke="#FFFFFF" strokeWidth="20">
          <path d="M0,230 L800,230" />
          <path d="M410,0 L410,400" />
          <path d="M0,40 C200,25 300,50 410,40" />
        </g>
      </g>
      <rect x="560" y="330" width="170" height="60" rx="8" fill="#EAF2E5" />
      <g fontFamily="Geist Mono, monospace" fontSize="11" fill="#6B6B66">
        <g transform="translate(70,80)">
          <rect
            x="-7"
            y="-7"
            width="78"
            height="62"
            rx="10"
            fill="none"
            stroke="#FF7A1A"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <rect
            width="64"
            height="48"
            rx="6"
            fill="#FFFFFF"
            stroke="#D9D9D3"
            strokeWidth="1.5"
          />
          <rect x="8" y="8" width="48" height="22" rx="3" fill="#22324A" />
          <path
            d="M20,8 V30 M32,8 V30 M44,8 V30 M8,19 H56"
            stroke="#8FA3BF"
            strokeWidth="1"
          />
          <text x="0" y="68" fill="#C2410C" fontWeight="500">
            You
          </text>
        </g>
        <g transform="translate(180,100)">
          <rect
            width="64"
            height="48"
            rx="6"
            fill="#FFFFFF"
            stroke="#D9D9D3"
            strokeWidth="1.5"
          />
          <rect x="8" y="8" width="48" height="22" rx="3" fill="#22324A" />
          <path
            d="M20,8 V30 M32,8 V30 M44,8 V30 M8,19 H56"
            stroke="#8FA3BF"
            strokeWidth="1"
          />
          <text x="0" y="64">
            Carla
          </text>
        </g>
        <g transform="translate(290,100)">
          <rect
            width="56"
            height="44"
            rx="6"
            fill="#FFFFFF"
            stroke="#D9D9D3"
            strokeWidth="1.5"
          />
          <text x="0" y="60">
            No. 14
          </text>
        </g>
        <g transform="translate(80,270)">
          <rect
            width="64"
            height="48"
            rx="6"
            fill="#FFFFFF"
            stroke="#D9D9D3"
            strokeWidth="1.5"
          />
          <rect x="8" y="8" width="48" height="22" rx="3" fill="#22324A" />
          <path
            d="M20,8 V30 M32,8 V30 M44,8 V30 M8,19 H56"
            stroke="#8FA3BF"
            strokeWidth="1"
          />
          <text x="0" y="64">
            Weber
          </text>
        </g>
        <g transform="translate(205,290)">
          <rect
            width="56"
            height="44"
            rx="6"
            fill="#FFFFFF"
            stroke="#D9D9D3"
            strokeWidth="1.5"
          />
          <text x="0" y="60">
            Ben
          </text>
        </g>
        <g transform="translate(470,90)">
          <rect
            width="96"
            height="60"
            rx="8"
            fill="#FFFFFF"
            stroke="#BDBDB6"
            strokeWidth="1.5"
          />
          <text x="0" y="76" fill="#111111">
            Bäckerei
          </text>
        </g>
        <g transform="translate(480,270)">
          <rect
            width="96"
            height="60"
            rx="8"
            fill="#FFFFFF"
            stroke="#BDBDB6"
            strokeWidth="1.5"
          />
          <text x="0" y="76" fill="#111111">
            Praxis
          </text>
        </g>
        <g transform="translate(640,90)">
          <rect
            width="64"
            height="48"
            rx="6"
            fill="#FFFFFF"
            stroke="#D9D9D3"
            strokeWidth="1.5"
          />
          <rect x="8" y="8" width="48" height="22" rx="3" fill="#22324A" />
          <path
            d="M20,8 V30 M32,8 V30 M44,8 V30 M8,19 H56"
            stroke="#8FA3BF"
            strokeWidth="1"
          />
          <text x="0" y="64">
            Emil
          </text>
        </g>
        <g transform="translate(650,270)">
          <rect
            width="56"
            height="44"
            rx="6"
            fill="#FFFFFF"
            stroke="#D9D9D3"
            strokeWidth="1.5"
          />
          <text x="0" y="60">
            Dana
          </text>
        </g>
        <text x="672" y="392" fill="#2563EB">
          Mallendar ↘
        </text>
      </g>
      <g fill="none" strokeLinecap="round">
        <path
          d="M102,92 C200,0 400,20 512,104"
          stroke="#FF7A1A"
          strokeOpacity="0.18"
          strokeWidth="11"
        />
        <path
          d="M102,92 C200,0 400,20 512,104"
          stroke="#FF7A1A"
          strokeWidth="3"
          strokeDasharray="4 12"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="32"
            to="0"
            dur="1.1s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M212,112 C300,70 430,80 508,112"
          stroke="#FF7A1A"
          strokeOpacity="0.14"
          strokeWidth="10"
        />
        <path
          d="M212,112 C300,70 430,80 508,112"
          stroke="#FF7A1A"
          strokeWidth="2.5"
          strokeDasharray="4 12"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="32"
            to="0"
            dur="1.1s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M112,282 C160,250 190,270 228,296"
          stroke="#FF7A1A"
          strokeOpacity="0.14"
          strokeWidth="10"
        />
        <path
          d="M112,282 C160,250 190,270 228,296"
          stroke="#FF7A1A"
          strokeWidth="2.5"
          strokeDasharray="4 12"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="32"
            to="0"
            dur="1.1s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M672,112 C690,200 600,250 548,282"
          stroke="#FF7A1A"
          strokeOpacity="0.14"
          strokeWidth="10"
        />
        <path
          d="M672,112 C690,200 600,250 548,282"
          stroke="#FF7A1A"
          strokeWidth="2.5"
          strokeDasharray="4 12"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="32"
            to="0"
            dur="1.1s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M216,126 C300,230 420,290 512,296"
          stroke="#FF7A1A"
          strokeOpacity="0.14"
          strokeWidth="10"
        />
        <path
          d="M216,126 C300,230 420,290 512,296"
          stroke="#FF7A1A"
          strokeWidth="2.5"
          strokeDasharray="4 12"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="32"
            to="0"
            dur="1.1s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M800,380 C760,370 720,350 680,316"
          stroke="#2563EB"
          strokeOpacity="0.14"
          strokeWidth="10"
        />
        <path
          d="M800,380 C760,370 720,350 680,316"
          stroke="#2563EB"
          strokeWidth="2.5"
          strokeDasharray="4 12"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="32"
            to="0"
            dur="1.1s"
            repeatCount="indefinite"
          />
        </path>
      </g>
      <g stroke="#FFFFFF" strokeWidth="2">
        <circle r="6" fill="#FF7A1A">
          <animateMotion
            dur="3.2s"
            repeatCount="indefinite"
            path="M102,92 C200,0 400,20 512,104"
          />
        </circle>
        <circle r="5" fill="#FF7A1A">
          <animateMotion
            dur="2.6s"
            begin="0.8s"
            repeatCount="indefinite"
            path="M212,112 C300,70 430,80 508,112"
          />
        </circle>
        <circle r="5" fill="#FF7A1A">
          <animateMotion
            dur="2s"
            begin="0.3s"
            repeatCount="indefinite"
            path="M112,282 C160,250 190,270 228,296"
          />
        </circle>
        <circle r="5" fill="#FF7A1A">
          <animateMotion
            dur="2.8s"
            begin="1.2s"
            repeatCount="indefinite"
            path="M672,112 C690,200 600,250 548,282"
          />
        </circle>
        <circle r="5" fill="#FF7A1A">
          <animateMotion
            dur="3.4s"
            begin="0.5s"
            repeatCount="indefinite"
            path="M216,126 C300,230 420,290 512,296"
          />
        </circle>
        <circle r="5" fill="#2563EB">
          <animateMotion
            dur="2.4s"
            begin="0.2s"
            repeatCount="indefinite"
            path="M800,380 C760,370 720,350 680,316"
          />
        </circle>
      </g>
    </svg>
  );
}
