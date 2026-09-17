"use client";

/**
 * Oxana wordmark.
 *
 * The letterforms are set in Outfit — a geometric sans with the same single-
 * storey construction and circular O as the supplied logo — with wide tracking
 * and the brand's teal gradient running top-left to bottom-right.
 *
 * To use the real logo file instead: drop it at `public/oxana-logo.svg` and
 * swap <Wordmark> for an <img>. Everything else is driven off the brand tokens
 * in globals.css, so colours stay in sync either way.
 */

export function Wordmark({
  size = 28,
  className = "",
}: { size?: number; className?: string }) {
  return (
    <span
      className={`select-none font-black uppercase leading-none ${className}`}
      style={{
        fontFamily: '"Outfit", var(--font-sans)',
        fontSize: size,
        letterSpacing: size * 0.18,
        // trailing tracking would otherwise push the mark off-centre
        paddingRight: size * 0.18,
        // Top-to-bottom, matching the source artwork: deep teal crown fading to
        // bright cyan at the baseline.
        background: "linear-gradient(to bottom, var(--color-brand-deep) 0%, var(--color-brand) 50%, var(--color-brand-bright) 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      Oxana
    </span>
  );
}

/** The circular O mark, used where only an icon fits. */
export function LogoMark({ size = 44 }: { size?: number }) {
  const id = "oxana-mark-grad";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-deep)" />
          <stop offset="55%" stopColor="var(--color-brand)" />
          <stop offset="100%" stopColor="var(--color-brand-bright)" />
        </linearGradient>
      </defs>
      <rect
        x="4" y="4" width="40" height="40" rx="14"
        fill="none" stroke={`url(#${id})`} strokeWidth="6"
      />
    </svg>
  );
}

/**
 * Lockup: wordmark + optional tagline.
 *
 * Deliberately no LogoMark here — the wordmark already opens on a circular O,
 * so setting the mark beside it reads as "O OXANA". The mark is for
 * icon-only slots (favicon, collapsed nav) where no wordmark is present.
 */
export function Logo({
  size = 26,
  tagline = false,
}: { size?: number; tagline?: boolean }) {
  return (
    <span className="flex flex-col min-w-0">
      <Wordmark size={size} />
      {tagline && (
        <span
          className="text-ink-400 font-semibold uppercase truncate"
          style={{ fontSize: size * 0.32, letterSpacing: size * 0.06, marginTop: size * 0.22 }}
        >
          Call &amp; Deal Tracker
        </span>
      )}
    </span>
  );
}
