'use client'

interface DynamicCoverProps {
  title: string
  size?: number        // kept for API compat, ignored (SVG fills parent)
  borderRadius?: number
}

/* 8 warm palette pairs [dark, light] */
const PALETTES: [string, string][] = [
  ['#7A5C0E', '#C9A030'],  // gold
  ['#6B2E1A', '#C4613A'],  // terracotta
  ['#1B3354', '#2E6EA8'],  // navy
  ['#3A2254', '#7A58B0'],  // purple
  ['#183D2C', '#3A9465'],  // forest
  ['#4A1414', '#A84040'],  // ruby
  ['#12384A', '#2E8FAA'],  // teal
  ['#3D2410', '#8A5E28'],  // umber
]

export default function DynamicCover({ title, borderRadius = 0 }: DynamicCoverProps) {
  const idx   = title.charCodeAt(0) % PALETTES.length
  const [dark, light] = PALETTES[idx]
  const gid   = `dcg${idx}`

  /* Line widths alternate for a realistic text-line feel */
  const lines = [40, 52, 86, 52, 38, 60, 78, 44, 62, 50, 40, 54]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 100 150"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: 'block', borderRadius }}
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor={light} />
          <stop offset="100%" stopColor={dark}  />
        </linearGradient>
      </defs>

      {/* ── Background ── */}
      <rect width="100" height="150" fill={`url(#${gid})`} />

      {/* ── Top-edge subtle light ── */}
      <rect x="0" y="0" width="100" height="1.5" fill="#fff" opacity="0.3" />

      {/* ── Big decorative " (open-quote) ── */}
      <text
        x="50" y="62"
        textAnchor="middle"
        fontSize="78"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="900"
        fill="#fff"
        opacity="0.13"
      >&#x201C;</text>

      {/* ── Horizontal text-lines (bottom half) ── */}
      {lines.map((w, i) => (
        <rect
          key={i}
          x={(100 - w) / 2}
          y={90 + i * 5.5}
          width={w}
          height="2"
          rx="1"
          fill="#fff"
          opacity={i === 0 ? 0.28 : 0.14}
        />
      ))}

      {/* ── Small quote icon (centered) ── */}
      <g transform="translate(50,52)" opacity="0.55">
        {/* left mark */}
        <ellipse cx="-9"  cy="-6" rx="4.5" ry="4.5" fill="#fff" opacity="0.6"/>
        <path d="M -13.5 -3 Q -15 1 -10 4 Q -7.5 2 -8 -1" fill="#fff" opacity="0.6"/>
        {/* right mark */}
        <ellipse cx="2"   cy="-6" rx="4.5" ry="4.5" fill="#fff" opacity="0.6"/>
        <path d="M  -2.5 -3 Q -4 1  1  4 Q  3.5 2  3  -1" fill="#fff" opacity="0.6"/>
      </g>
    </svg>
  )
}
