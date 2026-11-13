/**
 * NinRe's mark: the favicon's sky tile with an open book on the hills and the sun coming up behind it.
 * The pages (.lm-left, .lm-right) hinge on the spine at 32,35 and the sun is .lm-sun, so the splash can open them in turn.
 */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`logo-mark ${className}`.trim()} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#5b95d0" />
      <path d="M0 46c15-8 32-10 64-2v6a14 14 0 0 1-14 14H14A14 14 0 0 1 0 50z" fill="#3e8f4f" />
      <circle className="lm-sun" cx="32" cy="22" r="7" fill="#ffd66b" />
      <g className="lm-page lm-left">
        <path d="M32 35c-6-4-14-5-21-3v17c7-2 15-1 21 3z" fill="#fff" />
        <path d="M15 37.5c4-1 8-.6 12 .8M15 42c4-1 8-.6 12 .8" stroke="#9fd0ff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
      <g className="lm-page lm-right">
        <path d="M32 35c6-4 14-5 21-3v17c-7-2-15-1-21 3z" fill="#fff" />
        <circle cx="44" cy="40" r="4" fill="#ff5c7c" stroke="#fff" strokeWidth="1.5" />
      </g>
      <path d="M32 35v17" stroke="#14202b" strokeOpacity=".25" strokeWidth="1.2" />
    </svg>
  );
}
