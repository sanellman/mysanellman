"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ── Shared styles ──────────────────────────────────────── */
const card =
  "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]";
const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/25";
const ghostBtn =
  "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white";

/* ── Number input helper ────────────────────────────────── */
function NumInput({
  value, onChange, min = 0, className, placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  className?: string;
  placeholder?: string;
}) {
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    // sync if parent changes value from outside (e.g. reset)
    setRaw(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <input
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

/* ── Types ─────────────────────────────────────────────── */
type Kind = "regular" | "install" | "credit";

interface Expense {
  id: number;
  name: string;
  amount: number;
  kind: Kind;
  paid: number;   // งวดที่ผ่อนแล้ว (ใช้เฉพาะ install)
  total: number;  // งวดทั้งหมด (ใช้เฉพาะ install)
}

const TABS: { key: Kind; label: string; icon: string; addLabel: string }[] = [
  { key: "regular", label: "รายเดือน",   icon: "🧾", addLabel: "รายจ่ายรายเดือน" },
  { key: "install", label: "ผ่อนชำระ",   icon: "🏦", addLabel: "รายการผ่อน" },
  { key: "credit",  label: "บัตรเครดิต", icon: "💳", addLabel: "รายการบัตร" },
];

/* ── Helpers ────────────────────────────────────────────── */
const KEY = "my-expenses-v1";

const EXAMPLES: Expense[] = [
  { id: 1, name: "ค่าเช่าห้อง",     amount: 7500, kind: "regular", paid: 0,  total: 0 },
  { id: 2, name: "ค่างวดรถ",        amount: 8200, kind: "install", paid: 10, total: 48 },
  { id: 3, name: "บัตรเครดิต (ผ่อน)", amount: 3000, kind: "install", paid: 2,  total: 10 },
  { id: 4, name: "ช้อปปิ้ง/กินข้าว", amount: 4500, kind: "credit",  paid: 0,  total: 0 },
];

const baht = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency", currency: "THB", minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n);

/* วันที่ = วันนี้ + n เดือน (ตั้งเป็นวันที่ 1 ของเดือนนั้น) */
const addMonths = (base: Date, n: number) =>
  new Date(base.getFullYear(), base.getMonth() + n, 1);

/* "ก.ค. 2570" (พ.ศ.) */
const monthLabel = (d: Date) =>
  new Intl.DateTimeFormat("th-TH", { month: "short", year: "numeric" }).format(d);

/* แปลง object แปลกปลอม (จากไฟล์ import หรือข้อมูลเวอร์ชันเก่า) ให้เป็น Expense ที่ปลอดภัย */
function sanitizeExpense(o: unknown, fallbackId: number): Expense | null {
  if (typeof o !== "object" || o === null) return null;
  const r = o as Record<string, unknown>;
  const num = (v: unknown, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);

  // รองรับข้อมูลเก่าที่ใช้ installment: boolean
  const kind: Kind =
    r.kind === "install" || r.kind === "credit" || r.kind === "regular"
      ? r.kind
      : r.installment ? "install" : "regular";

  const isInstall = kind === "install";
  const total = isInstall ? Math.max(1, Math.round(num(r.total, 1))) : 0;
  const paid = isInstall ? Math.min(total, Math.max(1, Math.round(num(r.paid, 1)))) : 0;
  return {
    id: typeof r.id === "number" ? r.id : fallbackId,
    name: typeof r.name === "string" ? r.name : "",
    amount: Math.max(0, num(r.amount, 0)),
    kind,
    paid,
    total,
  };
}

/* ── Page ───────────────────────────────────────────────── */
export default function Page() {
  const [salary,   setSalary]   = useState(35000);
  const [expenses, setExpenses] = useState<Expense[]>(EXAMPLES);
  const [uid,      setUid]      = useState(EXAMPLES.length + 1);
  const [tab,      setTab]      = useState<Kind>("regular");
  const newItemRef = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  /* load จาก localStorage */
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      setSalary(d.salary ?? 35000);
      if (Array.isArray(d.expenses)) {
        const list = d.expenses
          .map((e: unknown, i: number) => sanitizeExpense(e, i + 1))
          .filter((e: Expense | null): e is Expense => e !== null);
        setExpenses(list);
        const nextUid = list.reduce((m: number, e: Expense) => Math.max(m, e.id), 0) + 1;
        setUid(Math.max(d.uid ?? 0, nextUid));
      }
    } catch { /* ข้ามถ้า parse ไม่ได้ */ }
  }, []);

  /* save ทุกครั้งที่เปลี่ยน */
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, salary, expenses, uid }));
  }, [salary, expenses, uid]);

  /* ── คำนวณ ────────────────────────────────────────────── */
  const monthlyCash = useMemo(
    () => expenses.filter((e) => e.kind !== "credit").reduce((s, e) => s + e.amount, 0),
    [expenses],
  );
  const creditTotal = useMemo(
    () => expenses.filter((e) => e.kind === "credit").reduce((s, e) => s + e.amount, 0),
    [expenses],
  );

  const balance          = salary - monthlyCash;               // คงเหลือเดือนนี้ (เงินสด)
  const nextMonthBalance = salary - monthlyCash - creditTotal;  // เดือนหน้า (บิลบัตรมาถึง)
  const ratio            = salary > 0 ? Math.min((monthlyCash / salary) * 100, 100) : 0;

  /* ── คำนวณหนี้ (ผ่อนชำระ) ─────────────────────────────── */
  const debt = useMemo(() => {
    const now = new Date();
    const items = expenses
      .filter((e) => e.kind === "install" && e.total > 0)
      .map((e) => {
        const left = Math.max(0, e.total - e.paid);          // งวดที่เหลือ
        const remaining = e.amount * left;                    // เงินที่ยังต้องจ่าย
        const payoff = addMonths(now, left);                  // เดือนที่ผ่อนหมด
        return { ...e, left, remaining, payoff };
      });

    const totalRemaining = items.reduce((s, e) => s + e.remaining, 0);
    const monthlyInstall = items.reduce((s, e) => s + e.amount, 0);
    const maxLeft        = items.reduce((m, e) => Math.max(m, e.left), 0);
    const freedomDate    = maxLeft > 0 ? addMonths(now, maxLeft) : null;
    const plan = [...items].filter((e) => e.left > 0).sort((a, b) => a.left - b.left);

    return { items, totalRemaining, monthlyInstall, maxLeft, freedomDate, plan };
  }, [expenses]);

  /* handlers */
  const add = () => {
    const isInstall = tab === "install";
    setExpenses((p) => [
      ...p,
      { id: uid, name: "", amount: 0, kind: tab, paid: isInstall ? 1 : 0, total: isInstall ? 10 : 0 },
    ]);
    setUid((n) => n + 1);
    setTimeout(() => newItemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const remove = (id: number) =>
    setExpenses((p) => p.filter((e) => e.id !== id));

  const update = (id: number, patch: Partial<Expense>) =>
    setExpenses((p) =>
      p.map((e) => {
        if (e.id !== id) return e;
        const next = { ...e, ...patch };
        if (next.kind === "install") {
          next.total = Math.max(1, next.total || 1);
          next.paid  = Math.min(next.total, Math.max(1, next.paid || 1));
        }
        return next;
      }),
    );

  const reset = () => {
    if (!confirm("ล้างข้อมูลทั้งหมด?")) return;
    localStorage.removeItem(KEY);
    setSalary(35000);
    setExpenses(EXAMPLES);
    setUid(EXAMPLES.length + 1);
  };

  /* ── Export / Import ──────────────────────────────────── */
  const exportData = () => {
    const payload = JSON.stringify({ version: 2, salary, expenses, uid }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `รายจ่าย-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result));
        const rawList = Array.isArray(d.expenses) ? d.expenses : [];
        const cleaned = rawList
          .map((o: unknown, i: number) => sanitizeExpense(o, i + 1))
          .filter((e: Expense | null): e is Expense => e !== null);
        if (cleaned.length === 0 && rawList.length > 0) {
          alert("ไฟล์ไม่มีรายการที่ถูกต้อง");
          return;
        }
        // กันไม่ให้ id ซ้ำ
        const nextUid = cleaned.reduce((m: number, e: Expense) => Math.max(m, e.id), 0) + 1;
        setSalary(typeof d.salary === "number" && isFinite(d.salary) ? d.salary : 0);
        setExpenses(cleaned);
        setUid(nextUid);
      } catch {
        alert("อ่านไฟล์ไม่สำเร็จ — ต้องเป็นไฟล์ JSON ที่ export จากแอปนี้");
      }
    };
    reader.readAsText(file);
  };

  const barColor =
    ratio < 60 ? "from-emerald-400 to-teal-400"
    : ratio < 80 ? "from-amber-400 to-orange-400"
    : "from-rose-500 to-red-500";

  const activeTab = TABS.find((t) => t.key === tab)!;

  /* ── UI ─────────────────────────────────────────────────── */
  return (
    <main className="min-h-screen px-4 py-6 text-slate-200 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-2xl shadow-lg shadow-violet-500/30">
              💰
            </div>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">รายจ่ายรายเดือน</h1>
              <p className="text-xs text-slate-400">วางแผนการเงิน &amp; ติดตามหนี้</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportData} className={ghostBtn}>⬇ Export</button>
            <button onClick={() => fileRef.current?.click()} className={ghostBtn}>⬆ Import</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                if (f) importData(f);
                ev.target.value = ""; // ให้เลือกไฟล์เดิมซ้ำได้
              }}
            />
            <button
              onClick={reset}
              className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 transition hover:bg-rose-500/20"
            >
              รีเซ็ต
            </button>
          </div>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Card label="เงินเดือน"       value={baht(salary)}       tone="text-white"     icon="💵" />
          <Card label="รายจ่าย/เดือน"   value={baht(monthlyCash)}  tone="text-rose-400"  icon="📉" />
          <Card label="ยอดบัตรเดือนนี้" value={baht(creditTotal)}  tone="text-amber-300" icon="💳" />
          <Card label="คงเหลือเดือนนี้" value={baht(balance)}      tone={balance >= 0 ? "text-emerald-400" : "text-rose-400"} icon={balance >= 0 ? "✅" : "⚠️"} />
        </div>

        {/* Progress */}
        <div className={`${card} p-4`}>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-400">สัดส่วนรายจ่ายประจำ (รายเดือน + ผ่อน)</span>
            <span className="tnum font-semibold text-white">{ratio.toFixed(0)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
              style={{ width: `${ratio}%` }}
            />
          </div>
        </div>

        {/* Projection — เดือนหน้า */}
        <div className="animate-float-in rounded-2xl border border-indigo-400/20 bg-indigo-400/[0.06] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">🔮</span>
            <h2 className="font-semibold text-indigo-200">ประมาณการเดือนหน้า</h2>
          </div>
          <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xs text-slate-400">คงเหลือเดือนนี้</p>
              <p className={`tnum mt-1 text-lg font-bold ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {baht(balance)}
              </p>
            </div>
            <div className="hidden text-center text-xl text-slate-500 sm:block">−</div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xs text-slate-400">ยอดบัตรที่ต้องจ่าย</p>
              <p className="tnum mt-1 text-lg font-bold text-amber-300">{baht(creditTotal)}</p>
            </div>
            <div className="hidden text-center text-xl text-slate-500 sm:block">=</div>
            <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/15 p-3">
              <p className="text-xs text-indigo-200/80">คาดว่าเดือนหน้าเหลือ</p>
              <p className={`tnum mt-1 text-2xl font-bold ${nextMonthBalance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {baht(nextMonthBalance)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            * สมมติรายรับและรายจ่ายประจำเท่าเดิม และจ่ายยอดบัตรเต็มจำนวนในเดือนหน้า
          </p>
        </div>

        {/* Debt summary — แสดงเมื่อมีรายการผ่อน */}
        {debt.items.length > 0 && (
          <div className="animate-float-in rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">🏦</span>
              <h2 className="font-semibold text-amber-200">สรุปหนี้ผ่อนชำระ</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-amber-200/70">ยอดหนี้คงเหลือรวม</p>
                <p className="tnum mt-1 text-2xl font-bold text-amber-100">{baht(debt.totalRemaining)}</p>
              </div>
              <div>
                <p className="text-xs text-amber-200/70">ผ่อนต่อเดือนรวม</p>
                <p className="tnum mt-1 text-2xl font-bold text-amber-100">{baht(debt.monthlyInstall)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-amber-200/70">ปลอดหนี้ 🎉</p>
                <p className="mt-1 text-2xl font-bold text-amber-100">
                  {debt.freedomDate ? monthLabel(debt.freedomDate) : "—"}
                </p>
                {debt.maxLeft > 0 && (
                  <p className="text-xs text-amber-200/70">อีก {debt.maxLeft} เดือน</p>
                )}
              </div>
            </div>

            {/* แผนปลดหนี้ */}
            {debt.plan.length > 0 && (
              <div className="mt-4 border-t border-amber-400/15 pt-4">
                <p className="mb-3 text-xs font-medium text-amber-200/80">แผนปลดหนี้ (เรียงตามที่ผ่อนหมดก่อน)</p>
                <div className="space-y-2">
                  {debt.plan.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <span className="text-amber-50">{e.name || "—"}</span>
                      <span className="flex items-center gap-2">
                        <span className="tnum text-xs text-amber-200/70">เหลือ {baht(e.remaining)}</span>
                        <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                          {monthLabel(e.payoff)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* Left */}
          <div className="space-y-4">

            {/* เงินเดือน */}
            <div className={`${card} p-4`}>
              <label className="block text-sm font-medium text-slate-300">
                เงินเดือน (บาท)
              </label>
              <NumInput
                value={salary}
                onChange={setSalary}
                className={`${field} mt-2 text-lg`}
              />
            </div>

            {/* รายการ — Tabs */}
            <div className={card}>
              {/* Tab bar */}
              <div className="flex gap-1 p-1.5">
                {TABS.map((t) => {
                  const count = expenses.filter((e) => e.kind === t.key).length;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition ${
                        active
                          ? "bg-gradient-to-r from-violet-500/90 to-indigo-500/90 text-white shadow-lg shadow-violet-500/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span className="hidden sm:inline">{t.label}</span>
                      <span className={`tnum rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-white/10 p-4">
                {(() => {
                  const visible = expenses.filter((e) => e.kind === tab);
                  return (
                    <>
                      {tab === "credit" && (
                        <p className="mb-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-xs text-amber-200/80">
                          💳 ยอดที่รูดในเดือนนี้ จะไปเป็นบิลที่ต้องจ่าย <b>เดือนหน้า</b> (ดูผลที่การ์ด “ประมาณการเดือนหน้า”)
                        </p>
                      )}

                      {visible.length === 0 && (
                        <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีรายการ</p>
                      )}

                      <div className="space-y-3">
                        {visible.map((e, i) => {
                          const isLast = i === visible.length - 1;
                          return (
                            <div
                              key={e.id}
                              ref={isLast ? newItemRef : undefined}
                              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs text-slate-500">รายการที่ {i + 1}</span>
                                <button
                                  onClick={() => remove(e.id)}
                                  className="rounded-lg border border-rose-400/20 px-2 py-0.5 text-xs text-rose-300 transition hover:bg-rose-500/15"
                                >
                                  ลบ
                                </button>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs text-slate-400">ชื่อรายการ</label>
                                  <input
                                    type="text"
                                    value={e.name}
                                    onChange={(ev) => update(e.id, { name: ev.target.value })}
                                    placeholder={tab === "credit" ? "เช่น ช้อปปิ้ง ร้านอาหาร" : "เช่น ค่าน้ำ ค่าไฟ"}
                                    className={`${field} text-sm`}
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs text-slate-400">
                                    {tab === "install" ? "ยอดผ่อน/งวด (บาท)" : tab === "credit" ? "ยอดที่รูด (บาท)" : "จำนวน (บาท/เดือน)"}
                                  </label>
                                  <NumInput
                                    value={e.amount}
                                    onChange={(v) => update(e.id, { amount: v })}
                                    className={`${field} text-sm`}
                                  />
                                </div>

                                {tab === "install" && (
                                  <div className="flex gap-2 sm:col-span-2">
                                    <div className="flex-1">
                                      <label className="mb-1 block text-xs text-slate-400">ผ่อนแล้ว (งวด)</label>
                                      <NumInput
                                        value={e.paid}
                                        min={1}
                                        onChange={(v) => update(e.id, { paid: v })}
                                        className={`${field} text-sm`}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="mb-1 block text-xs text-slate-400">ทั้งหมด (งวด)</label>
                                      <NumInput
                                        value={e.total}
                                        min={1}
                                        onChange={(v) => update(e.id, { total: v })}
                                        className={`${field} text-sm`}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {tab === "install" && e.total > 0 && (() => {
                                const left = Math.max(0, e.total - e.paid);
                                return (
                                  <div className="mt-3">
                                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                                      <span>ผ่อนไปแล้ว {e.paid}/{e.total} งวด</span>
                                      <span className="text-amber-300">เหลืออีก {left} งวด</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 transition-all duration-500"
                                        style={{ width: `${Math.min(100, (e.paid / e.total) * 100)}%` }}
                                      />
                                    </div>
                                    <div className="tnum mt-1.5 flex justify-between text-xs text-slate-500">
                                      <span>เหลืออีก {baht(e.amount * left)}</span>
                                      {left > 0 && (
                                        <span>ผ่อนหมด {monthLabel(addMonths(new Date(), left))}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={add}
                        className="mt-3 w-full rounded-xl border-2 border-dashed border-white/15 py-3 text-sm font-medium text-slate-400 transition hover:border-violet-400/40 hover:text-violet-300"
                      >
                        + เพิ่ม{activeTab.addLabel}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right — summary */}
          <div className="space-y-4">
            <div className={`${card} p-4`}>
              <h2 className="mb-3 font-semibold text-white">สรุป</h2>
              <div className="space-y-2 text-sm">
                <Row label="รายรับ"          value={baht(salary)} />
                <Row label="รายจ่ายประจำ"    value={baht(monthlyCash)} red />
                <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="font-semibold text-slate-200">คงเหลือเดือนนี้</span>
                  <span className={`tnum text-xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {baht(balance)}
                  </span>
                </div>
                <Row label="ยอดบัตร (จ่ายเดือนหน้า)" value={baht(creditTotal)} red />
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="font-semibold text-indigo-200">คาดว่าเดือนหน้าเหลือ</span>
                  <span className={`tnum text-lg font-bold ${nextMonthBalance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {baht(nextMonthBalance)}
                  </span>
                </div>
              </div>
            </div>

            <div className={`${card} p-4`}>
              <h2 className="mb-3 font-semibold text-white">รายการทั้งหมด</h2>
              <div className="space-y-2">
                {expenses.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-500">ยังไม่มีรายการ</p>
                )}
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-100">{e.name || "—"}</p>
                      <p className="text-xs text-slate-500">
                        {e.kind === "install" ? `งวด ${e.paid}/${e.total}` : e.kind === "credit" ? "บัตรเครดิต" : "รายเดือน"}
                      </p>
                    </div>
                    <span className="tnum font-semibold text-slate-100">{baht(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        <p className="pt-2 text-center text-xs text-slate-600">
          ข้อมูลถูกบันทึกในเครื่องนี้เท่านั้น · กด Export เพื่อสำรองไว้
        </p>
      </div>
    </main>
  );
}

/* ── Sub-components ─────────────────────────────────────── */
function Card({ label, value, tone, icon }: { label: string; value: string; tone: string; icon?: string }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        {icon && <span className="text-sm opacity-80">{icon}</span>}
      </div>
      <p className={`tnum mt-2 text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`tnum font-medium ${red ? "text-rose-400" : "text-slate-200"}`}>{value}</span>
    </div>
  );
}
