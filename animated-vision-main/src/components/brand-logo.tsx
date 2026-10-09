// CloudCurb AI mark: cloud outline, server stack and leaf.
export function BrandMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`brand-logo-mark ${className}`}
      width={size}
      height={size * 0.8}
      viewBox="0 0 100 80"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="brand-logo-cloud"
        d="M30 66 H21 C11 66 5 58 5 49 C5 40 12 33 21 33 C22 20 33 10 47 10 C59 10 68 18 71 29 C73 28 75 28 77 28 C87 28 94 36 94 46 C94 57 86 66 76 66 H70"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[34, 46, 58].map((y) => (
        <g key={y}>
          <rect x="31" y={y} width="38" height="10" rx="2.5" className="brand-logo-server" />
          <rect x="35" y={y + 4} width="10" height="2.4" rx="1.2" fill="currentColor" />
          <circle cx="54" cy={y + 5.2} r="1.9" className="brand-logo-green" />
          <circle cx="59.5" cy={y + 5.2} r="1.9" fill="currentColor" />
          <circle cx="65" cy={y + 5.2} r="1.9" fill="currentColor" />
        </g>
      ))}
      <path className="brand-logo-green" d="M72 60 C64 46 69 30 89 22 C93 39 87 53 72 60 Z" />
      <path
        d="M73 57 C76 46 80 38 87 27"
        fill="none"
        className="brand-logo-vein"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <span className="brand-logo">
      <BrandMark size={size} />
      <span className="brand-logo-name">
        CloudCurb <span className="brand-logo-ai">AI</span>
      </span>
    </span>
  );
}
