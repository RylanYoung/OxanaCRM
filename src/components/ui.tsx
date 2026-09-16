"use client";

import React, { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ Button */

type BtnVariant = "primary" | "ghost" | "danger" | "soft" | "win";
type BtnSize = "sm" | "md" | "lg" | "xl";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary:
    "bg-gradient-to-b from-brand-bright to-brand text-white shadow-lg shadow-brand/25 " +
    "hover:brightness-110 active:brightness-95 border border-white/10",
  win:
    "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 " +
    "hover:brightness-110 border border-white/10",
  soft:
    "bg-ink-700/70 text-ink-100 border border-ink-600 hover:bg-ink-600/70",
  ghost:
    "bg-transparent text-ink-300 border border-transparent hover:bg-ink-800 hover:text-ink-100",
  danger:
    "bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 hover:text-red-200",
};

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-10 px-4 text-sm rounded-xl gap-2",
  md: "h-12 px-5 text-base rounded-xl gap-2",
  lg: "h-14 px-7 text-lg rounded-2xl gap-2.5",
  xl: "h-16 px-9 text-xl rounded-2xl gap-3",
};

export function Button({
  variant = "soft", size = "md", className = "", children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; size?: BtnSize;
}) {
  return (
    <button
      {...rest}
      className={`focus-ring inline-flex items-center justify-center font-semibold
        transition-all duration-150 active:scale-[0.97] select-none
        disabled:opacity-40 disabled:pointer-events-none
        ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  className = "", children, ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`card ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title, sub, right,
}: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        {sub && <p className="text-ink-400 text-base mt-1">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  children, color = "#6366f1", size = "md",
}: { children: React.ReactNode; color?: string; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap
        ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"}`}
      style={{
        color,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 42%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Inputs */

const FIELD =
  "w-full bg-ink-900/70 border-2 border-ink-700 rounded-xl px-4 text-ink-100 " +
  "placeholder:text-ink-500 transition-colors focus-ring " +
  "hover:border-ink-600 focus:border-brand-bright";

export function Field({
  label, hint, children, className = "",
}: { label?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-sm font-semibold text-ink-300 mb-2 uppercase tracking-wide">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="block text-xs text-ink-500 mt-1.5">{hint}</span>}
    </label>
  );
}

export function Input({
  className = "", ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${FIELD} h-13 py-3 text-lg ${className}`} />;
}

export function Textarea({
  className = "", ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${FIELD} py-3 text-base leading-relaxed ${className}`} />;
}

export function Select({
  className = "", children, ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`${FIELD} h-13 py-3 text-lg appearance-none cursor-pointer
        bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="%2397a5ba" stroke-width="2.5"><path d="M5 8l5 5 5-5"/></svg>')]
        bg-no-repeat bg-[right_0.9rem_center] pr-11 ${className}`}
    >
      {children}
    </select>
  );
}

/* ----------------------------------------------------------------- Stepper */

/** Big +/- number control — the heart of the weekly logger. */
export function Stepper({
  value, onChange, step = 1, min = 0, accent = "#6366f1", money = false,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  accent?: string;
  money?: boolean;
}) {
  const bump = (d: number) => onChange(Math.max(min, Math.round((value + d) * 100) / 100));
  const btn =
    "h-14 w-14 shrink-0 rounded-xl text-2xl font-bold flex items-center justify-center " +
    "transition-all active:scale-90 focus-ring select-none";
  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button" aria-label="decrease" onClick={() => bump(-step)}
        className={`${btn} bg-ink-800 border-2 border-ink-700 text-ink-300 hover:text-white hover:border-ink-500`}
      >
        −
      </button>
      <div className="relative flex-1 min-w-0">
        {money && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-ink-500 pointer-events-none">
            $
          </span>
        )}
        <input
          type="number" inputMode="decimal" value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
          onFocus={(e) => e.target.select()}
          className={`tnum w-full h-14 rounded-xl bg-ink-900/80 border-2 text-center
            text-3xl font-extrabold focus-ring transition-colors
            ${money ? "pl-8" : ""}`}
          style={{
            borderColor: value > 0 ? accent : "var(--color-ink-700)",
            color: value > 0 ? accent : "var(--color-ink-400)",
          }}
        />
      </div>
      <button
        type="button" aria-label="increase" onClick={() => bump(step)}
        className={`${btn} border-2`}
        style={{
          background: `color-mix(in srgb, ${accent} 18%, transparent)`,
          borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
          color: accent,
        }}
      >
        +
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------- Modal */

export function Modal({
  open, onClose, title, sub, children, footer, wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6
                 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panel}
        className={`pop card w-full ${wide ? "max-w-4xl" : "max-w-2xl"}
          max-h-[92vh] flex flex-col rounded-b-none sm:rounded-b-[1.25rem]
          shadow-2xl shadow-black/60 border-ink-600`}
      >
        <div className="flex items-start justify-between gap-4 px-7 pt-7 pb-5 border-b border-ink-700">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
            {sub && <p className="text-ink-400 mt-1">{sub}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <span className="text-2xl leading-none">×</span>
          </Button>
        </div>

        <div className="px-7 py-6 overflow-y-auto grow">{children}</div>

        {footer && (
          <div className="px-7 py-5 border-t border-ink-700 flex flex-wrap justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon, title, sub, action,
}: { icon: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="text-6xl mb-5 opacity-70 select-none">{icon}</div>
      <h3 className="text-2xl font-bold text-ink-200">{title}</h3>
      {sub && <p className="text-ink-400 mt-2 max-w-md text-lg">{sub}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({
  text, color, size = 48,
}: { text: string; color: string; size?: number }) {
  return (
    <div
      className="shrink-0 rounded-2xl flex items-center justify-center font-bold text-white select-none"
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 55%, #0b0f1a))`,
      }}
    >
      {text}
    </div>
  );
}

/* ----------------------------------------------------------------- Confirm */

export function ConfirmDialog({
  open, onCancel, onConfirm, title, body, confirmLabel = "Delete",
}: {
  open: boolean; onCancel: () => void; onConfirm: () => void;
  title: string; body: string; confirmLabel?: string;
}) {
  return (
    <Modal
      open={open} onClose={onCancel} title={title}
      footer={
        <>
          <Button size="lg" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="lg" variant="danger" onClick={() => { onConfirm(); onCancel(); }}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-lg text-ink-300 leading-relaxed">{body}</p>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Skeleton */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-xl ${className}`} />;
}
