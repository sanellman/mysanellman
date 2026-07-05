"use client";

import { useEffect, useState } from "react";

/* ── Shared styles (Dark Premium) ───────────────────────── */
export const card =
  "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]";
export const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/25";
export const ghostBtn =
  "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white";

/* ── Money format ───────────────────────────────────────── */
export const baht = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency", currency: "THB", minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n);

/* ── Number input helper ────────────────────────────────── */
export function NumInput({
  value, onChange, min = 0, className, placeholder, ref,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  className?: string;
  placeholder?: string;
  ref?: React.Ref<HTMLInputElement>;
}) {
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    // sync if parent changes value from outside (e.g. reset)
    setRaw(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder={placeholder ?? "0"}
      value={raw}
      className={className}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
        setRaw(v);
        const n = parseFloat(v);
        if (v !== "" && v !== "." && !isNaN(n)) onChange(Math.max(min, n));
        else if (v === "") onChange(0);
      }}
      onBlur={() => {
        setRaw(value === 0 ? "" : String(value));
      }}
    />
  );
}
