"use client";

import { useMemo, useState } from "react";

type Expense = {
  id: number;
  name: string;
  amount: number;
  isInstallment: boolean;
  currentMonth: number;
  totalMonths: number;
};

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const initialExpenses: Expense[] = [
  {
    id: 1,
    name: "ค่าเช่าห้อง",
    amount: 7500,
    isInstallment: false,
    currentMonth: 1,
    totalMonths: 1,
  },
  {
    id: 2,
    name: "ค่างวดรถ",
    amount: 8200,
    isInstallment: true,
    currentMonth: 10,
    totalMonths: 48,
  },
  {
    id: 3,
    name: "บัตรเครดิต",
    amount: 3000,
    isInstallment: true,
    currentMonth: 2,
    totalMonths: 10,
  },
];

function sanitizeMonth(value: number, fallback = 1) {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
}

export default function Home() {
  const [salary, setSalary] = useState(35000);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [nextId, setNextId] = useState(initialExpenses.length + 1);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + (item.amount || 0), 0),
    [expenses],
  );

  const remaining = salary - totalExpenses;
  const installmentCount = expenses.filter((item) => item.isInstallment).length;
  const spendingRatio = salary > 0 ? Math.min((totalExpenses / salary) * 100, 100) : 0;

  const updateExpense = (id: number, patch: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const merged = { ...item, ...patch };
        const totalMonths = merged.isInstallment
          ? Math.max(1, sanitizeMonth(merged.totalMonths, item.totalMonths))
          : 1;
        const currentMonth = merged.isInstallment
          ? Math.min(totalMonths, Math.max(1, sanitizeMonth(merged.currentMonth, item.currentMonth)))
          : 1;

        return {
          ...merged,
          totalMonths,
          currentMonth,
        };
      }),
    );
  };

  const addExpense = () => {
    setExpenses((prev) => [
      ...prev,
      {
        id: nextId,
        name: "",
        amount: 0,
        isInstallment: false,
        currentMonth: 1,
        totalMonths: 1,
      },
    ]);
    setNextId((prev) => prev + 1);
  };

  const removeExpense = (id: number) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-linear-to-r from-sky-500 via-cyan-500 to-emerald-500 p-[1px] shadow-2xl shadow-slate-950/30">
          <div className="rounded-[calc(1.5rem-1px)] bg-white/95 p-6 backdrop-blur sm:p-8">
            <p className="mb-2 text-sm font-semibold text-sky-700">Next.js Expense Planner</p>
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              เว็บคำนวณหนี้สินและค่าใช้จ่ายรายเดือน
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              กรอกเงินเดือนปัจจุบัน เพิ่มค่าใช้จ่ายรายเดือน และระบุรายการที่กำลังผ่อน
              เพื่อดูว่าในแต่ละเดือนยังเหลือเงินเท่าไรทันที
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">เงินเดือน</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {currencyFormatter.format(salary || 0)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">ค่าใช้จ่ายรวม</p>
            <p className="mt-2 text-2xl font-bold text-rose-600">
              {currencyFormatter.format(totalExpenses)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">เงินคงเหลือ</p>
            <p
              className={`mt-2 text-2xl font-bold ${
                remaining >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {currencyFormatter.format(remaining)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">รายการที่กำลังผ่อน</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{installmentCount} รายการ</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200 sm:p-6">
            <div className="mb-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">เงินเดือนปัจจุบัน</span>
                <input
                  type="number"
                  min="0"
                  value={salary}
                  onChange={(event) => setSalary(Number(event.currentTarget.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  placeholder="เช่น 35000"
                />
              </label>

              <button
                type="button"
                onClick={addExpense}
                className="h-12 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                + เพิ่มค่าใช้จ่าย
              </button>
            </div>

            <div className="space-y-4">
              {expenses.map((expense, index) => {
                const remainingMonths = Math.max(expense.totalMonths - expense.currentMonth, 0);

                return (
                  <div
                    key={expense.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {expense.name || `รายการที่ ${index + 1}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {expense.isInstallment
                            ? `ผ่อนงวด ${expense.currentMonth}/${expense.totalMonths}`
                            : "ค่าใช้จ่ายรายเดือนปกติ"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeExpense(expense.id)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        ลบรายการ
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">ชื่อรายการ</span>
                        <input
                          type="text"
                          value={expense.name}
                          onChange={(event) =>
                            updateExpense(expense.id, { name: event.currentTarget.value })
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                          placeholder="เช่น ค่าน้ำ ค่าไฟ หรือค่างวดมือถือ"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">จำนวนเงินต่อเดือน</span>
                        <input
                          type="number"
                          min="0"
                          value={expense.amount}
                          onChange={(event) =>
                            updateExpense(expense.id, {
                              amount: Number(event.currentTarget.value) || 0,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                          placeholder="0"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">ประเภทค่าใช้จ่าย</span>
                        <select
                          value={expense.isInstallment ? "installment" : "regular"}
                          onChange={(event) => {
                            const isInstallment = event.currentTarget.value === "installment";
                            updateExpense(expense.id, {
                              isInstallment,
                              currentMonth: isInstallment ? expense.currentMonth : 1,
                              totalMonths: isInstallment ? Math.max(expense.totalMonths, 1) : 1,
                            });
                          }}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        >
                          <option value="regular">ค่าใช้จ่ายปกติ</option>
                          <option value="installment">กำลังผ่อนอยู่</option>
                        </select>
                      </label>

                      {expense.isInstallment ? (
                        <div className="grid gap-4 sm:grid-cols-2 md:col-span-1">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">เดือนที่ผ่อนแล้ว</span>
                            <input
                              type="number"
                              min="1"
                              value={expense.currentMonth}
                              onChange={(event) =>
                                updateExpense(expense.id, {
                                  currentMonth: Number(event.currentTarget.value) || 1,
                                })
                              }
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">ผ่อนทั้งหมด (เดือน)</span>
                            <input
                              type="number"
                              min="1"
                              value={expense.totalMonths}
                              onChange={(event) =>
                                updateExpense(expense.id, {
                                  totalMonths: Number(event.currentTarget.value) || 1,
                                })
                              }
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                          รายการนี้จะถูกนับเป็นค่าใช้จ่ายประจำทุกเดือน
                        </div>
                      )}
                    </div>

                    {expense.isInstallment && (
                      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        เหลือผ่อนอีกประมาณ {remainingMonths} เดือน
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">สรุปรายเดือน</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">รายรับ</span>
                  <span className="font-semibold text-slate-900">
                    {currencyFormatter.format(salary || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">รายจ่ายรวม</span>
                  <span className="font-semibold text-slate-900">
                    {currencyFormatter.format(totalExpenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-500">เงินคงเหลือ</span>
                  <span
                    className={`text-lg font-bold ${
                      remaining >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {currencyFormatter.format(remaining)}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <span>สัดส่วนค่าใช้จ่ายต่อเงินเดือน</span>
                  <span>{spendingRatio.toFixed(0)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      spendingRatio < 60
                        ? "bg-emerald-500"
                        : spendingRatio < 90
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(spendingRatio, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">รายการทั้งหมด</h2>
              <div className="mt-4 space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={`summary-${expense.id}`}
                    className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {expense.name || "ยังไม่ได้ตั้งชื่อ"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {expense.isInstallment
                          ? `ผ่อน ${expense.currentMonth}/${expense.totalMonths} เดือน`
                          : "ค่าใช้จ่ายปกติ"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {currencyFormatter.format(expense.amount || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
