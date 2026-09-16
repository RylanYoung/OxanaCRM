"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { money as fmtMoney, num, pct, rate } from "@/lib/format";

/* Measure the container so the SVG can lay out real text without distortion. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Round an axis maximum up to something a human would pick. */
function niceMax(v: number): number {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

const AXIS = "var(--color-ink-500)";
const GRID = "var(--color-ink-700)";

/* ------------------------------------------------------------ TrendChart */

export interface TrendPoint {
  key: string;
  label: string;
  value: number;
  full: string;
}

/**
 * One series at a time, on one axis. Switching metrics is how you compare —
 * deliberately never two y-scales on one chart.
 */
export function TrendChart({
  data, color, money = false, height = 260,
}: {
  data: TrendPoint[];
  color: string;
  money?: boolean;
  height?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padL = 56, padR = 12, padT = 16, padB = 34;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;

  const max = useMemo(() => niceMax(Math.max(...data.map((d) => d.value), 0)), [data]);
  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => max * f), [max]);

  const n = data.length || 1;
  const slot = innerW / n;
  const barW = Math.max(3, Math.min(48, slot - 4)); // 2px surface gap each side
  const fmt = (v: number) => (money ? fmtMoney(v, "USD", true) : num(v));

  // Thin out x labels until they can't collide.
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 68))));

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Weekly trend">
          {ticks.map((t, i) => {
            const y = padT + innerH - (t / max) * innerH;
            return (
              <g key={i}>
                <line x1={padL} x2={w - padR} y1={y} y2={y}
                      stroke={GRID} strokeWidth={1} opacity={i === 0 ? 0.9 : 0.4} />
                <text x={padL - 10} y={y + 4} textAnchor="end"
                      fontSize={12} fill={AXIS} className="tnum">
                  {fmt(t)}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const h = max ? (d.value / max) * innerH : 0;
            const x = padL + i * slot + (slot - barW) / 2;
            const y = padT + innerH - h;
            const on = hover === i;
            return (
              <g key={d.key}
                 onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                {/* Hit target is the whole column, not just the bar. */}
                <rect x={padL + i * slot} y={padT} width={slot} height={innerH}
                      fill={on ? "var(--color-ink-100)" : "transparent"} opacity={on ? 0.05 : 0} />
                {d.value > 0 && (
                  <rect x={x} y={y} width={barW} height={Math.max(2, h)}
                        rx={Math.min(4, barW / 2)} fill={color}
                        opacity={hover === null || on ? 1 : 0.42} />
                )}
                {i % every === 0 && (
                  <text x={padL + i * slot + slot / 2} y={height - 12}
                        textAnchor="middle" fontSize={12}
                        fill={on ? "var(--color-ink-200)" : AXIS}>
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute z-20 card px-4 py-3 shadow-2xl shadow-black/60"
          style={{
            left: Math.min(Math.max(padL + hover * slot + slot / 2 - 80, 0), Math.max(0, w - 170)),
            top: 4, width: 170,
          }}
        >
          <div className="text-xs text-ink-400 mb-1">{data[hover].full}</div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: color }} />
            <span className="text-xl font-bold tnum text-ink-100">{fmt(data[hover].value)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Funnel */

export interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

/**
 * Magnitude is encoded by BAR LENGTH, so a single hue is correct here — a
 * rainbow would imply a category difference that does not exist.
 */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = Math.max(...steps.map((s) => s.value), 0);
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const w = top ? (s.value / top) * 100 : 0;
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv = prev !== null ? rate(s.value, prev) : null;
        return (
          <div key={s.label} className="group">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="text-base font-semibold text-ink-200">{s.label}</span>
              <span className="flex items-baseline gap-3">
                <span className="text-xl font-bold tnum text-ink-100">{num(s.value)}</span>
                {conv !== null && (
                  <span className="text-sm tnum text-ink-400 w-16 text-right">
                    {pct(conv, 0)}
                  </span>
                )}
              </span>
            </div>
            <div className="h-5 rounded-lg bg-ink-800 overflow-hidden">
              <div
                className="h-full rounded-lg transition-[width] duration-500 ease-out"
                style={{ width: `${w}%`, background: s.color, minWidth: s.value > 0 ? 6 : 0 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ StageBars */

export interface StageBar {
  id: string;
  label: string;
  color: string;
  count: number;
  value: number;
}

/** Colour here is identity — each bar is a stage the user named and coloured. */
export function StageBars({ rows, currency }: { rows: StageBar[]; currency: string }) {
  const top = Math.max(...rows.map((r) => r.value), 0);
  if (!rows.length) return null;
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.id}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: r.color }} />
              <span className="text-base font-semibold text-ink-200 truncate">{r.label}</span>
              <span className="text-sm text-ink-500 shrink-0">
                {r.count} {r.count === 1 ? "deal" : "deals"}
              </span>
            </span>
            <span className="text-lg font-bold tnum text-ink-100 shrink-0">
              {fmtMoney(r.value, currency, true)}
            </span>
          </div>
          <div className="h-4 rounded-lg bg-ink-800 overflow-hidden">
            <div
              className="h-full rounded-lg transition-[width] duration-500 ease-out"
              style={{ width: `${top ? (r.value / top) * 100 : 0}%`, background: r.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Sparkline */

export function Sparkline({
  values, color, height = 40,
}: { values: number[]; color: string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * w : 0;
    return `${x},${height - (v / max) * height}`;
  });
  return (
    <div ref={ref} style={{ height }} className="w-full">
      {w > 0 && values.length > 1 && (
        <svg width={w} height={height} aria-hidden>
          <polyline points={pts.join(" ")} fill="none" stroke={color}
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
