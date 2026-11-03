"use client";

import {
  CategoryBars,
  CategoryDonut,
  DailyArea,
  MethodBars,
  WeekCompare,
} from "@/components/DashboardCharts";
import { MerchantLogo } from "@/components/MerchantLogo";
import { RequireAuth, useShell } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { deleteTransaction, getBudget, listTransactions } from "@/lib/firestore";
import {
  categoryLabel,
  formatDate,
  formatInr,
  monthKey,
  type PaymentMethod,
  type SpendCategory,
  type Transaction,
} from "@spend-tracker/shared";
import { InfoTip } from "@/components/InfoTip";
import { Lightning, Microphone, Plus, Wallet } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

function daysAgoLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function weekStart(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function HomeInner() {
  const { user } = useAuth();
  const { refreshKey, openAdd } = useShell();
  const uid = user!.uid;
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
  const [weeklyLimit, setWeeklyLimit] = useState<number | null>(null);
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [coachProvider, setCoachProvider] = useState<"gemini" | "local" | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [t, mb, wb] = await Promise.all([
      listTransactions(uid),
      getBudget(uid, "monthly"),
      getBudget(uid, "weekly"),
    ]);
    setTxs(t);
    setMonthlyLimit(mb?.totalLimit ?? null);
    setWeeklyLimit(wb?.totalLimit ?? null);
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const month = monthKey();
  const today = new Date().toISOString().slice(0, 10);

  const monthSpend = useMemo(
    () => txs.filter((t) => t.occurredAt.slice(0, 7) === month).reduce((s, t) => s + t.amount, 0),
    [txs, month],
  );
  const todaySpend = useMemo(
    () => txs.filter((t) => t.occurredAt.slice(0, 10) === today).reduce((s, t) => s + t.amount, 0),
    [txs, today],
  );
  const thisWeekStart = weekStart();
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);

  const weekSpend = useMemo(
    () => txs.filter((t) => new Date(t.occurredAt) >= thisWeekStart).reduce((s, t) => s + t.amount, 0),
    [txs, thisWeekStart],
  );
  const lastWeekSpend = useMemo(
    () =>
      txs
        .filter((t) => {
          const d = new Date(t.occurredAt);
          return d >= lastWeekStart && d < lastWeekEnd;
        })
        .reduce((s, t) => s + t.amount, 0),
    [txs, lastWeekStart, lastWeekEnd],
  );

  const leftMonth = monthlyLimit == null ? null : monthlyLimit - monthSpend;
  const leftTone =
    leftMonth == null ? "" : leftMonth < 0 ? "danger" : leftMonth < (monthlyLimit ?? 0) * 0.15 ? "warn" : "ok";

  const byCategory = useMemo(() => {
    const map = new Map<SpendCategory, number>();
    for (const t of txs.filter((x) => x.occurredAt.slice(0, 7) === month)) {
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [txs, month]);

  const byMethod = useMemo(() => {
    const map = new Map<PaymentMethod | "unknown", number>();
    for (const t of txs.filter((x) => x.occurredAt.slice(0, 7) === month)) {
      const key = t.method ?? "unknown";
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);
  }, [txs, month]);

  const daily = useMemo(() => {
    const rows = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = txs
        .filter((t) => t.occurredAt.slice(0, 10) === key)
        .reduce((s, t) => s + t.amount, 0);
      rows.push({ day: daysAgoLabel(d), total: Math.round(total) });
    }
    return rows;
  }, [txs]);

  const weekCompare = [
    { label: "Last week", total: Math.round(lastWeekSpend) },
    { label: "This week", total: Math.round(weekSpend) },
  ];

  const categorySummary = useMemo(
    () =>
      byCategory
        .slice(0, 5)
        .map((r) => `${categoryLabel(r.category)} ₹${Math.round(r.total)}`)
        .join("; "),
    [byCategory],
  );

  const loadCoach = useCallback(async () => {
    setCoachBusy(true);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: categorySummary || "No spends logged this month yet.",
          monthSpend,
          weekSpend,
          monthlyLimit: monthlyLimit ?? undefined,
          weeklyLimit: weeklyLimit ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coach failed");
      setCoachTip(data.tip ?? null);
      setCoachProvider(data.provider === "gemini" ? "gemini" : "local");
    } catch (e) {
      setCoachTip(e instanceof Error ? e.message : "Could not load coach tip");
      setCoachProvider("local");
    } finally {
      setCoachBusy(false);
    }
  }, [categorySummary, monthSpend, weekSpend, monthlyLimit, weeklyLimit]);

  useEffect(() => {
    void loadCoach();
  }, [loadCoach, refreshKey]);

  return (
    <>
      <div className="hero-row">
        <div>
          <h1 className="title-with-tip">
            Today’s money picture
            <InfoTip title="How to use">
              Tap Add spend (or the mic) → amount &amp; app → Save. Trips and Investments stay in
              their own menus, separate from daily spends.
            </InfoTip>
          </h1>
          <p>Add what you spent. See totals and charts.</p>
        </div>
        <div className="topbar-actions mobile-hint">
          <button type="button" className="icon-btn" onClick={() => openAdd({ voice: true })}>
            <Microphone size={18} weight="bold" />
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openAdd()}>
            <Plus size={16} weight="bold" />
            Add spend
          </button>
        </div>
      </div>

      <section className="panel coach-panel" aria-label="AI coach">
        <div className="coach-head">
          <h2>
            <Lightning size={18} weight="fill" />
            AI coach
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="meta">
              {coachBusy
                ? "Thinking…"
                : coachProvider === "gemini"
                  ? "Gemini"
                  : coachProvider
                    ? "Local tip"
                    : ""}
            </span>
            <button
              type="button"
              className="btn btn-soft"
              disabled={coachBusy}
              onClick={() => void loadCoach()}
            >
              Refresh
            </button>
          </div>
        </div>
        <p className="coach-tip">
          {coachBusy && !coachTip ? "Getting a tip from your month…" : coachTip}
        </p>
      </section>

      <section className="kpi-grid" aria-label="Summary">
        <article className="kpi">
          <p className="label">
            <Wallet size={14} /> Today
          </p>
          <p className="value">{formatInr(todaySpend)}</p>
          <p className="hint">What you spent today</p>
        </article>
        <article className="kpi">
          <p className="label">This week</p>
          <p className="value">{formatInr(weekSpend)}</p>
          <p className="hint">
            {weeklyLimit != null ? `Limit ${formatInr(weeklyLimit)}` : "Monday to Sunday"}
          </p>
        </article>
        <article className="kpi">
          <p className="label">This month</p>
          <p className="value">{formatInr(monthSpend)}</p>
          <p className="hint">{month}</p>
        </article>
        <article className={`kpi ${leftTone}`}>
          <p className="label">Still left</p>
          <p className="value">{leftMonth == null ? "—" : formatInr(Math.max(leftMonth, 0))}</p>
          <p className="hint">
            {monthlyLimit == null
              ? "Set a limit under Monthly budget"
              : leftMonth != null && leftMonth < 0
                ? `Over by ${formatInr(Math.abs(leftMonth))}`
                : `of ${formatInr(monthlyLimit)}`}
          </p>
        </article>
      </section>

      <div className="grid-3">
        <section className="panel">
          <h2>By category</h2>
          <p className="panel-sub">Share of this month</p>
          <CategoryDonut rows={byCategory} />
        </section>
        <section className="panel">
          <h2>Last 14 days</h2>
          <p className="panel-sub">Day-by-day spend</p>
          <DailyArea rows={daily} />
        </section>
        <section className="panel">
          <h2>This week vs last</h2>
          <p className="panel-sub">Quick comparison</p>
          <WeekCompare rows={weekCompare} />
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Biggest categories</h2>
          <p className="panel-sub">Where most money went</p>
          <CategoryBars rows={byCategory} />
        </section>
        <section className="panel">
          <h2>How you paid</h2>
          <p className="panel-sub">UPI, card, cash this month</p>
          <MethodBars rows={byMethod} />
        </section>
      </div>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2>Latest spends</h2>
            <p className="panel-sub" style={{ marginBottom: 0 }}>
              Delete if something looks wrong
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => openAdd()}>
            <Plus size={16} weight="bold" />
            Add spend
          </button>
        </div>
        {txs.length === 0 ? (
          <div className="empty">No spends yet. Tap Add spend or the mic in the top bar.</div>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>App</th>
                <th>When</th>
                <th>Category</th>
                <th>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {txs.slice(0, 8).map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <MerchantLogo name={t.merchant} size={28} />
                      <div>
                        <div>{t.merchant}</div>
                        {t.note ? <div className="meta">{t.note}</div> : null}
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(t.occurredAt)}</td>
                  <td>
                    <span className="chip soft">{categoryLabel(t.category)}</span>
                  </td>
                  <td className="mono">{formatInr(t.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm(`Delete ${t.merchant} ${formatInr(t.amount)}?`)) {
                          void deleteTransaction(uid, t.id).then(refresh);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <HomeInner />
    </RequireAuth>
  );
}
