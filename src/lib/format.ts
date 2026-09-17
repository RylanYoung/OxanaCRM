export function money(n: number, currency = "USD", compact = false): string {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact && Math.abs(v) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: compact && Math.abs(v) >= 10_000 ? 1 : v % 1 === 0 ? 0 : 2,
  }).format(v);
}

export function num(n: number): string {
  return new Intl.NumberFormat("en-US").format(Number(n) || 0);
}

/** Safe percentage — returns null when the denominator is zero. */
export function rate(top: number, bottom: number): number | null {
  if (!bottom) return null;
  return (top / bottom) * 100;
}

export function pct(v: number | null, digits = 1): string {
  if (v === null || !isFinite(v)) return "n/a";
  return `${v.toFixed(digits)}%`;
}

export function initials(first: string, last?: string | null): string {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?";
}

export function fullName(c: { first_name: string; last_name: string | null }): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

/** Deterministic pleasant colour from any string — used for avatars. */
export function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 55%)`;
}

export const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
