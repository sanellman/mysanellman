"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { card, field, baht, NumInput } from "../ui";

/* ── Types & config ─────────────────────────────────────── */
interface DailyItem {
  id: number;
  amount: number;
  cat: string;     // category key
  note: string;
  ts: number;      // เวลาที่บันทึก (epoch ms)
}

interface Category {
  key: string;
  label: string;
  icon: string;
  bar: string;     // สีแท่งกราฟ
  text: string;    // สีตัวอักษร
}

const CATS: Category[] = [
  { key: "food",     label: "อาหาร",     icon: "🍜", bar: "bg-orange-400",  text: "text-orange-300" },
  { key: "transport",label: "เดินทาง",   icon: "🚗", bar: "bg-sky-400",     text: "text-sky-300" },
  { key: "shopping", label: "ช้อปปิ้ง",  icon: "🛍️", bar: "bg-pink-400",    text: "text-pink-300" },
  { key: "bills",    label: "บิล/ของใช้", icon: "🧾", bar: "bg-violet-400",  text: "text-violet-300" },
  { key: "fun",      label: "บันเทิง",   icon: "🎬", bar: "bg-fuchsia-400", text: "text-fuchsia-300" },
  { key: "idol",     label: "ไอดอล",     icon: "🎤", bar: "bg-rose-400",    text: "text-rose-300" },
  { key: "health",   label: "สุขภาพ",    icon: "💊", bar: "bg-emerald-400", text: "text-emerald-300" },
  { key: "other",    label: "อื่น ๆ",    icon: "✨", bar: "bg-slate-400",   text: "text-slate-300" },
];
const CAT = Object.fromEntries(CATS.map((c) => [c.key, c])) as Record<string, Category>;
const catOf = (key: string) => CAT[key] ?? CATS[CATS.length - 1];

const KEY = "daily-expenses-v1";

const EXAMPLES: DailyItem[] = [];

/* ── Date helpers ───────────────────────────────────────── */
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const toInputDate = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/* แปลงค่าจาก <input type="date"> เป็น Date (คงเวลาปัจจุบันไว้) — คืน null ถ้าค่าว่าง/เพี้ยน */
const parseDateInput = (s: string, now: Date): Date | null => {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const year = y > 2400 ? y - 543 : y; // เผื่อพิมพ์ปีเป็น พ.ศ.
  const dt = new Date(year, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
  return isNaN(dt.getTime()) ? null : dt;
};
const timeLabel = (ts: number) =>
  new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
const weekdayShort = (ts: number) =>
  new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(new Date(ts));

function dayHeading(ts: number): string {
  const today = dayStart(new Date());
  const diff = Math.round((today - dayStart(new Date(ts))) / 86_400_000);
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "เมื่อวาน";
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }),
  }).format(d);
}

function sanitize(o: unknown, fallbackId: number): DailyItem | null {
  if (typeof o !== "object" || o === null) return null;
  const r = o as Record<string, unknown>;
  const amount = typeof r.amount === "number" && isFinite(r.amount) ? Math.max(0, r.amount) : 0;
  const ts = typeof r.ts === "number" && isFinite(r.ts) ? r.ts : Date.now();
  if (amount <= 0) return null;
  return {
    id: typeof r.id === "number" ? r.id : fallbackId,
    amount,
    cat: typeof r.cat === "string" && CAT[r.cat] ? r.cat : "other",
    note: typeof r.note === "string" ? r.note : "",
    ts,
  };
}

type Period = "today" | "7d" | "month";

/* ── Page ───────────────────────────────────────────────── */
export default function DailyPage() {
  const [items, setItems] = useState<DailyItem[]>(EXAMPLES);
  const [view,  setView]  = useState<"log" | "report">("log");

  /* form state */
  const [amount, setAmount] = useState(0);
  const [cat,    setCat]    = useState("food");
  const [note,   setNote]   = useState("");
  const [date,   setDate]   = useState<string>(() => toInputDate(new Date()));
  const [period, setPeriod] = useState<Period>("7d");
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [editBudget, setEditBudget] = useState(false);
  const [formError, setFormError] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  /* load / save */
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (Array.isArray(d.items)) {
        const list = d.items
          .map((o: unknown, i: number) => sanitize(o, i + 1))
          .filter((x: DailyItem | null): x is DailyItem => x !== null);
        setItems(list);
      }
      if (d.budgets && typeof d.budgets === "object") {
        const src = d.budgets as Record<string, unknown>;
        const b: Record<string, number> = {};
        for (const c of CATS) {
          const v = src[c.key];
          if (typeof v === "number" && isFinite(v) && v > 0) b[c.key] = v;
        }
        setBudgets(b);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, items, budgets }));
  }, [items, budgets]);

  /* add */
  const addItem = () => {
    if (amount <= 0) {
      setFormError("กรอกจำนวนเงินก่อน แล้วกด “เพิ่มรายการ” อีกครั้ง");
      amountRef.current?.focus();
      return;
    }
    const now = new Date();
    const picked = parseDateInput(date, now);
    // วันที่ว่าง/เพี้ยน/เป็นอนาคต → ใช้วันนี้แทน แล้วปรับช่องวันที่ให้ตรงกับที่บันทึกจริง
    const when = picked && picked.getTime() <= now.getTime() ? picked : now;
    if (when === now) setDate(toInputDate(now));
    setFormError("");
    const id = items.reduce((mx, it) => Math.max(mx, it.id), 0) + 1;
    setItems((p) => [...p, { id, amount, cat, note: note.trim(), ts: when.getTime() }]);
    // reset เฉพาะจำนวน/โน้ต — คงหมวดกับวันไว้ให้กรอกต่อได้เร็ว
    setAmount(0);
    setNote("");
    amountRef.current?.focus();
  };

  const remove = (id: number) => setItems((p) => p.filter((it) => it.id !== id));

  const setBudget = (key: string, v: number) =>
    setBudgets((p) => ({ ...p, [key]: v }));

  /* ── derived ──────────────────────────────────────────── */
  const todayTotal = useMemo(() => {
    const t = dayStart(new Date());
    return items.filter((it) => dayStart(new Date(it.ts)) === t).reduce((s, it) => s + it.amount, 0);
  }, [items]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    return items
      .filter((it) => {
        const d = new Date(it.ts);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, it) => s + it.amount, 0);
  }, [items]);

  // ยอดใช้จ่ายวันนี้ แยกตามหมวด (ไว้เทียบกับงบต่อวัน)
  const todayByCat = useMemo(() => {
    const t = dayStart(new Date());
    const acc: Record<string, number> = {};
    items
      .filter((it) => dayStart(new Date(it.ts)) === t)
      .forEach((it) => { acc[it.cat] = (acc[it.cat] ?? 0) + it.amount; });
    return acc;
  }, [items]);

  // จัดกลุ่มตามวัน (ใหม่สุดก่อน) สำหรับหน้า log
  const groups = useMemo(() => {
    const map = new Map<string, DailyItem[]>();
    [...items].sort((a, b) => b.ts - a.ts).forEach((it) => {
      const k = dayKey(it.ts);
      (map.get(k) ?? map.set(k, []).get(k)!).push(it);
    });
    return [...map.values()].map((list) => ({
      ts: list[0].ts,
      total: list.reduce((s, it) => s + it.amount, 0),
      items: list,
    }));
  }, [items]);

  /* ── report ───────────────────────────────────────────── */
  const report = useMemo(() => {
    const now = new Date();
    const from =
      period === "today" ? dayStart(now)
      : period === "7d" ? dayStart(now) - 6 * 86_400_000
      : new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const inRange = items.filter((it) => it.ts >= from);
    const total = inRange.reduce((s, it) => s + it.amount, 0);

    // แยกตามหมวด
    const byCat = CATS
      .map((c) => ({ cat: c, amount: inRange.filter((it) => it.cat === c.key).reduce((s, it) => s + it.amount, 0) }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const maxCat = byCat.reduce((m, x) => Math.max(m, x.amount), 0);

    const days = period === "today" ? 1 : period === "7d" ? 7 : now.getDate();
    const avg = total / days;

    // เทรนด์ 7 วันล่าสุด
    const trend = Array.from({ length: 7 }, (_, i) => {
      const dTs = dayStart(now) - (6 - i) * 86_400_000;
      const sum = items
        .filter((it) => dayStart(new Date(it.ts)) === dTs)
        .reduce((s, it) => s + it.amount, 0);
      return { ts: dTs, sum };
    });
    const maxTrend = trend.reduce((m, x) => Math.max(m, x.sum), 0);

    return { total, byCat, maxCat, avg, count: inRange.length, trend, maxTrend };
  }, [items, period]);

  const periodLabel: Record<Period, string> = { today: "วันนี้", "7d": "7 วันล่าสุด", month: "เดือนนี้" };

  /* ── UI ───────────────────────────────────────────────── */
  return (
    <main className="min-h-screen px-4 py-6 text-slate-200 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Hero — ยอดวันนี้ */}
        <div className="animate-float-in rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-5 backdrop-blur-xl">
          <p className="text-sm text-slate-300">ใช้ไปวันนี้</p>
          <p className="tnum mt-1 text-4xl font-bold text-white">{baht(todayTotal)}</p>
          <p className="tnum mt-1 text-xs text-slate-400">เดือนนี้รวม {baht(monthTotal)}</p>
        </div>

        {/* View switch */}
        <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          {(["log", "report"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                view === v
                  ? "bg-gradient-to-r from-violet-500/90 to-indigo-500/90 text-white shadow-lg shadow-violet-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {v === "log" ? "📝 บันทึก" : "📊 รายงาน"}
            </button>
          ))}
        </div>

        {view === "log" ? (
          <>
            {/* Quick add */}
            <div className={`${card} p-4`}>
              <h2 className="mb-3 font-semibold text-white">เพิ่มรายจ่าย</h2>

              {/* จำนวน */}
              <div className="flex items-center gap-2">
                <span className="text-2xl text-slate-500">฿</span>
                <NumInput
                  ref={amountRef}
                  value={amount}
                  onChange={(v) => { setAmount(v); if (v > 0) setFormError(""); }}
                  placeholder="0"
                  className={`${field} flex-1 text-2xl font-bold`}
                />
              </div>
              {formError && <p className="mt-2 text-xs text-rose-300">⚠️ {formError}</p>}

              {/* หมวดหมู่ */}
              <div className="mt-3 flex flex-wrap gap-2">
                {CATS.map((c) => {
                  const active = cat === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setCat(c.key)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                        active
                          ? "border-violet-400/50 bg-violet-500/20 text-white"
                          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                      }`}
                    >
                      <span>{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* งบวันนี้ของหมวดที่เลือก */}
              {(budgets[cat] ?? 0) > 0 && (() => {
                const spent = todayByCat[cat] ?? 0;
                const remain = budgets[cat] - spent;
                const over = remain < 0;
                return (
                  <p className={`mt-2 text-xs ${over ? "text-rose-300" : "text-slate-400"}`}>
                    {catOf(cat).icon} วันนี้ใช้ {baht(spent)} / {baht(budgets[cat])} ·{" "}
                    {over ? <b>เกินงบ {baht(-remain)}</b> : <>เหลือ {baht(remain)}</>}
                  </p>
                );
              })()}

              {/* โน้ต + วันที่ */}
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
                  placeholder="โน้ต (เช่น ข้าวมันไก่, กาแฟ)"
                  className={`${field} text-sm`}
                />
                <input
                  type="date"
                  value={date}
                  max={toInputDate(new Date())}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${field} text-sm [color-scheme:dark]`}
                />
              </div>

              <button
                onClick={addItem}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 active:scale-[0.99]"
              >
                + เพิ่มรายการ
              </button>
            </div>

            {/* งบต่อวัน */}
            <div className={`${card} p-4`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-white">🎯 งบต่อวัน</h2>
                <button
                  onClick={() => setEditBudget((v) => !v)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {editBudget ? "เสร็จ" : "ตั้งงบ"}
                </button>
              </div>

              {editBudget ? (
                <div className="space-y-2">
                  {CATS.map((c) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <span className="flex w-28 items-center gap-1.5 text-sm text-slate-300">
                        <span>{c.icon}</span>{c.label}
                      </span>
                      <NumInput
                        value={budgets[c.key] ?? 0}
                        onChange={(v) => setBudget(c.key, v)}
                        placeholder="ไม่จำกัด"
                        className={`${field} flex-1 text-sm`}
                      />
                      <span className="text-xs text-slate-500">฿/วัน</span>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">เว้นว่างหรือ 0 = ไม่จำกัด</p>
                </div>
              ) : (() => {
                const withBudget = CATS.filter((c) => (budgets[c.key] ?? 0) > 0);
                if (withBudget.length === 0) {
                  return (
                    <p className="text-sm text-slate-500">
                      ยังไม่ได้ตั้งงบ — กด <b className="text-slate-300">“ตั้งงบ”</b> เพื่อกำหนดเพดานต่อวัน เช่น อาหาร 150 ฿
                    </p>
                  );
                }
                return (
                  <div className="space-y-3">
                    {withBudget.map((c) => {
                      const spent = todayByCat[c.key] ?? 0;
                      const budget = budgets[c.key];
                      const pct = Math.min(100, (spent / budget) * 100);
                      const over = spent > budget;
                      const color = over ? "bg-rose-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-400";
                      return (
                        <div key={c.key}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-200"><span>{c.icon}</span>{c.label}</span>
                            <span className={`tnum ${over ? "font-semibold text-rose-300" : "text-slate-300"}`}>
                              {baht(spent)} / {baht(budget)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                          {over && <p className="mt-1 text-xs text-rose-300">⚠️ เกินงบวันนี้ {baht(spent - budget)}</p>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Log — grouped by day */}
            {groups.length === 0 ? (
              <div className={`${card} p-10 text-center`}>
                <p className="text-4xl">🧾</p>
                <p className="mt-2 text-sm text-slate-400">ยังไม่มีรายการ — เริ่มบันทึกรายจ่ายแรกของวันนี้เลย</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((g) => (
                  <div key={dayKey(g.ts)} className={`${card} overflow-hidden`}>
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                      <span className="text-sm font-medium text-slate-300">{dayHeading(g.ts)}</span>
                      <span className="tnum text-sm font-semibold text-white">{baht(g.total)}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {g.items.map((it) => {
                        const c = catOf(it.cat);
                        return (
                          <div key={it.id} className="group flex items-center gap-3 px-4 py-2.5">
                            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-lg`}>{c.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-slate-100">{it.note || c.label}</p>
                              <p className="text-xs text-slate-500">{c.label} · {timeLabel(it.ts)}</p>
                            </div>
                            <span className="tnum text-sm font-semibold text-slate-100">{baht(it.amount)}</span>
                            <button
                              onClick={() => remove(it.id)}
                              className="rounded-lg px-2 py-1 text-xs text-slate-600 transition hover:bg-rose-500/15 hover:text-rose-300"
                              aria-label="ลบรายการ"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Period selector */}
            <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
              {(["today", "7d", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                    period === p
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`${card} p-4`}>
                <p className="text-xs text-slate-400">รวม{periodLabel[period]}</p>
                <p className="tnum mt-1 text-xl font-bold text-white">{baht(report.total)}</p>
              </div>
              <div className={`${card} p-4`}>
                <p className="text-xs text-slate-400">จำนวนรายการ</p>
                <p className="tnum mt-1 text-xl font-bold text-cyan-300">{report.count}</p>
              </div>
              <div className={`${card} p-4`}>
                <p className="text-xs text-slate-400">เฉลี่ย/วัน</p>
                <p className="tnum mt-1 text-xl font-bold text-amber-300">{baht(report.avg)}</p>
              </div>
            </div>

            {/* 7-day trend */}
            <div className={`${card} p-4`}>
              <h2 className="mb-4 font-semibold text-white">แนวโน้ม 7 วันล่าสุด</h2>
              <div className="flex h-32 items-end justify-between gap-2">
                {report.trend.map((d) => {
                  const h = report.maxTrend > 0 ? (d.sum / report.maxTrend) * 100 : 0;
                  const isToday = dayStart(new Date()) === d.ts;
                  return (
                    <div key={d.ts} className="flex flex-1 flex-col items-center gap-1">
                      <span className="tnum text-[10px] text-slate-500">{d.sum > 0 ? Math.round(d.sum) : ""}</span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${isToday ? "bg-gradient-to-t from-violet-500 to-cyan-400" : "bg-white/15"}`}
                          style={{ height: `${Math.max(h, d.sum > 0 ? 6 : 0)}%` }}
                        />
                      </div>
                      <span className={`text-xs ${isToday ? "font-semibold text-white" : "text-slate-500"}`}>{weekdayShort(d.ts)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category breakdown */}
            <div className={`${card} p-4`}>
              <h2 className="mb-4 font-semibold text-white">แยกตามหมวด</h2>
              {report.byCat.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">ยังไม่มีข้อมูลในช่วงนี้</p>
              ) : (
                <div className="space-y-3">
                  {report.byCat.map(({ cat: c, amount }) => {
                    const pct = report.total > 0 ? (amount / report.total) * 100 : 0;
                    const w = report.maxCat > 0 ? (amount / report.maxCat) * 100 : 0;
                    return (
                      <div key={c.key}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-200">
                            <span>{c.icon}</span>{c.label}
                            <span className="tnum text-xs text-slate-500">{pct.toFixed(0)}%</span>
                          </span>
                          <span className="tnum font-medium text-slate-100">{baht(amount)}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                          <div className={`h-full rounded-full ${c.bar} transition-all duration-500`} style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <p className="pt-2 text-center text-xs text-slate-600">
          ข้อมูลถูกบันทึกในเครื่องนี้เท่านั้น
        </p>
      </div>
    </main>
  );
}
