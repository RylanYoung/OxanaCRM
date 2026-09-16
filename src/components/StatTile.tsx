"use client";

import React from "react";

/**
 * Big, readable number tile.
 *
 * The value always wears a TEXT token — the accent colour lives on the small
 * mark beside the label, so identity is never carried by colour alone and the
 * number keeps full contrast.
 */
export function StatTile({
  label, value, sub, color, hint, onClick, size = "md",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  hint?: string;
  onClick?: () => void;
  size?: "md" | "lg";
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      title={hint}
      className={`card text-left w-full p-5 sm:p-6 transition-all
        ${onClick ? "hover:border-ink-500 hover:-translate-y-0.5 focus-ring cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        {color && (
          <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: color }} />
        )}
        <span className="text-sm font-bold uppercase tracking-wider text-ink-400 truncate">
          {label}
        </span>
      </div>
      <div
        className={`tnum font-extrabold text-ink-100 leading-none tracking-tight
          ${size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}
      >
        {value}
      </div>
      {sub && <div className="text-sm text-ink-400 mt-2.5">{sub}</div>}
    </Tag>
  );
}

/** Horizontal goal bar — target is a weekly goal scaled to the range. */
export function GoalBar({
  label, actual, target, pct, format,
}: {
  label: string;
  actual: number;
  target: number;
  pct: number;
  format: (n: number) => string;
}) {
  const hit = pct >= 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="text-base font-semibold text-ink-200">{label}</span>
        <span className="tnum text-base text-ink-300">
          <b className="text-ink-100">{format(actual)}</b>
          <span className="text-ink-500"> / {format(target)}</span>
        </span>
      </div>
      <div className="h-4 rounded-lg bg-ink-800 overflow-hidden">
        <div
          className="h-full rounded-lg transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: hit ? "#199e70" : "#3987e5",
          }}
        />
      </div>
      <div className="mt-1.5 text-sm tnum text-ink-500">
        {hit ? "Target hit ✓" : `${pct.toFixed(0)}% of target`}
      </div>
    </div>
  );
}
