"use client";

import { InfoTip } from "@/components/InfoTip";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import {
  getBudget,
  getSalaryPlan,
  listTransactions,
  newId,
  saveSalaryPlan,
  upsertBudget,
} from "@/lib/firestore";
import {
  SALARY_FIXED_PRESETS,
  formatInr,
  monthKey,
  weekKey,
  type Budget,
  type SalaryFixedLine,
  type SalaryPlan,
  type Transaction,
} from "@spend-tracker/shared";
import { Calculator, CalendarBlank, Plus, Trash, Wallet } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

function BudgetsInner() {
  const { user } = useAuth();
  const uid = user!.uid;
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [monthly, setMonthly] = useState<Budget | null>(null);
  const [weekly, setWeekly] = useState<Budget | null>(null);
  const [monthInput, setMonthInput] = useState("20000");
  const [weekInput, setWeekInput] = useState("5000");
  const [msg, setMsg] = useState<string | null>(null);

  const [salary, setSalary] = useState("80000");
  const [lines, setLines] = useState<SalaryFixedLine[]>([]);
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [planMeta, setPlanMeta] = useState<{ id: string; createdAt: string } | null>(null);

  const refresh = useCallback(async () => {
    const [t, m, w, plan] = await Promise.all([
      listTransactions(uid),
      getBudget(uid, "monthly"),
      getBudget(uid, "weekly"),
      getSalaryPlan(uid),
    ]);
    setTxs(t);
    setMonthly(m);
    setWeekly(w);
    if (m) setMonthInput(String(m.totalLimit));
    if (w) setWeekInput(String(w.totalLimit));
    if (plan) {
      setSalary(String(plan.salary || ""));
      setLines(plan.lines ?? []);
      setPlanMeta({ id: plan.id, createdAt: plan.createdAt });
    }
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const monthSpend = useMemo(
    () =>
      txs
        .filter((t) => t.occurredAt.slice(0, 7) === monthKey())
        .reduce((s, t) => s + t.amount, 0),
    [txs],
  );

  const weekSpend = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return txs.filter((t) => new Date(t.occurredAt) >= start).reduce((s, t) => s + t.amount, 0);
  }, [txs]);

  const salaryNum = Number(salary) || 0;
  const fixedTotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [lines],
  );
  const leftover = salaryNum - fixedTotal;

  function addPreset(label: string, amount: number) {
    if (lines.some((l) => l.label.toLowerCase() === label.toLowerCase())) {
      setMsg(`${label} is already in the list — edit the amount`);
      return;
    }
    setLines((prev) => [
      ...prev,
      { id: newId("fix"), label, amount, everyMonth: true },
    ]);
  }

  function addCustom() {
    const label = customLabel.trim();
    const amount = Number(customAmount);
    if (!label || !amount) {
      setMsg("Add a name and amount for the fixed cost");
      return;
    }
    addPreset(label, amount);
    setCustomLabel("");
    setCustomAmount("");
  }

  function updateLine(id: string, patch: Partial<SalaryFixedLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function persistPlan(): Promise<SalaryPlan> {
    const now = new Date().toISOString();
    const plan: SalaryPlan = {
      id: planMeta?.id ?? "default",
      salary: salaryNum,
      lines,
      createdAt: planMeta?.createdAt ?? now,
      updatedAt: now,
    };
    await saveSalaryPlan(uid, plan);
    setPlanMeta({ id: plan.id, createdAt: plan.createdAt });
    return plan;
  }

  async function savePlanOnly() {
    await persistPlan();
    setMsg("Salary plan saved — EMIs stay for next months");
  }

  async function useLeftoverAsBudget() {
    if (leftover <= 0) {
      setMsg("Leftover is zero or negative — adjust salary or EMIs first");
      return;
    }
    await persistPlan();
    const now = new Date().toISOString();
    const budget: Budget = {
      id: monthly?.id ?? newId("budget"),
      period: "monthly",
      periodKey: monthKey(),
      totalLimit: Math.round(leftover),
      categoryLimits: monthly?.categoryLimits ?? {},
      createdAt: monthly?.createdAt ?? now,
      updatedAt: now,
    };
    await upsertBudget(uid, budget);
    setMonthInput(String(Math.round(leftover)));
    setMsg(`Monthly spend limit set to ${formatInr(Math.round(leftover))} (salary − fixed)`);
    await refresh();
  }

  async function saveMonthly() {
    const now = new Date().toISOString();
    const budget: Budget = {
      id: monthly?.id ?? newId("budget"),
      period: "monthly",
      periodKey: monthKey(),
      totalLimit: Number(monthInput),
      categoryLimits: monthly?.categoryLimits ?? {},
      createdAt: monthly?.createdAt ?? now,
      updatedAt: now,
    };
    await upsertBudget(uid, budget);
    setMsg("Monthly limit saved");
    await refresh();
  }

  async function saveWeekly() {
    const now = new Date().toISOString();
    const budget: Budget = {
      id: weekly?.id ?? newId("budget"),
      period: "weekly",
      periodKey: weekKey(),
      totalLimit: Number(weekInput),
      categoryLimits: weekly?.categoryLimits ?? {},
      createdAt: weekly?.createdAt ?? now,
      updatedAt: now,
    };
    await upsertBudget(uid, budget);
    setMsg("Weekly limit saved");
    await refresh();
  }

  function pct(spent: number, limit?: number | null) {
    if (!limit) return 0;
    return Math.min(100, (spent / Math.max(limit, 1)) * 100);
  }

  return (
    <>
      <div className="hero-row">
        <div>
          <h1 className="title-with-tip">
            Monthly budget
            <InfoTip title="How this works">
              Start with salary → subtract EMIs/rent/bills that repeat every month → leftover becomes
              your spendable budget. Fixed lines are saved so you don’t retype them.
            </InfoTip>
          </h1>
          <p>Salary calculator first, then set your spend limits.</p>
        </div>
      </div>

      {msg ? <div className="banner ok">{msg}</div> : null}

      <section className="panel salary-calc" style={{ marginBottom: 14 }}>
        <h2>
          <Calculator size={18} weight="duotone" style={{ verticalAlign: -3, marginRight: 6 }} />
          Salary calculator
        </h2>
        <p className="panel-sub">
          What comes in − what is already locked (EMI, loan, bills) = what you can spend.
        </p>

        <label className="field" style={{ maxWidth: 320, marginBottom: 16 }}>
          <span>Monthly salary (₹)</span>
          <input
            className="amount-input"
            type="number"
            inputMode="numeric"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="80000"
          />
        </label>

        <div className="salary-math">
          <div>
            <p className="meta">Salary</p>
            <p className="mono salary-figure">{formatInr(salaryNum)}</p>
          </div>
          <span className="salary-op">−</span>
          <div>
            <p className="meta">Fixed every month</p>
            <p className="mono salary-figure">{formatInr(fixedTotal)}</p>
          </div>
          <span className="salary-op">=</span>
          <div>
            <p className="meta">Left for spends</p>
            <p className={`mono salary-figure leftover ${leftover < 0 ? "neg" : ""}`}>
              {formatInr(leftover)}
            </p>
          </div>
        </div>

        <h3 className="salary-subhead">Fixed costs (saved for every month)</h3>
        <div className="chips" style={{ marginBottom: 12 }}>
          {SALARY_FIXED_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip soft"
              onClick={() => addPreset(p.label, p.amount)}
            >
              <Plus size={12} weight="bold" />
              {p.label}
            </button>
          ))}
        </div>

        {lines.length === 0 ? (
          <div className="empty" style={{ padding: "16px 8px" }}>
            Tap a chip above — e.g. Car EMI 23K, Home loan 10K — or add your own below.
          </div>
        ) : (
          <div className="salary-lines">
            {lines.map((line) => (
              <div key={line.id} className="salary-line">
                <input
                  className="salary-line-label"
                  value={line.label}
                  onChange={(e) => updateLine(line.id, { label: e.target.value })}
                  aria-label="Cost name"
                />
                <input
                  className="salary-line-amt"
                  type="number"
                  inputMode="numeric"
                  value={line.amount}
                  onChange={(e) =>
                    updateLine(line.id, { amount: Number(e.target.value) || 0 })
                  }
                  aria-label="Amount"
                />
                <span className="chip soft" title="Repeats every month">
                  Every month
                </span>
                <button
                  type="button"
                  className="btn btn-danger"
                  aria-label={`Remove ${line.label}`}
                  onClick={() => removeLine(line.id)}
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="form-grid" style={{ marginTop: 14, marginBottom: 4 }}>
          <label className="field">
            <span>Custom fixed cost</span>
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Bike EMI, maid…"
            />
          </label>
          <label className="field">
            <span>Amount (₹)</span>
            <input
              type="number"
              inputMode="numeric"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="5000"
            />
          </label>
        </div>
        <div className="sheet-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn" onClick={addCustom}>
            <Plus size={14} weight="bold" />
            Add line
          </button>
          <button type="button" className="btn" onClick={() => void savePlanOnly()}>
            Save plan
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void useLeftoverAsBudget()}
          >
            Use leftover as monthly budget
          </button>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>
            <Wallet size={18} weight="duotone" style={{ verticalAlign: -3, marginRight: 6 }} />
            Spend limit · {monthKey()}
          </h2>
          <p className="panel-sub">
            Spent {formatInr(monthSpend)}
            {monthly ? ` of ${formatInr(monthly.totalLimit)}` : " — set from calculator or below"}
          </p>
          <div className="progress-track" style={{ marginBottom: 14 }}>
            <div
              className="progress-fill"
              style={{ width: `${pct(monthSpend, monthly?.totalLimit)}%` }}
            />
          </div>
          <label className="field">
            <span>Monthly spend limit (₹)</span>
            <input
              value={monthInput}
              onChange={(e) => setMonthInput(e.target.value)}
              type="number"
              inputMode="numeric"
            />
          </label>
          <div className="sheet-actions">
            <button type="button" className="btn btn-primary" onClick={() => void saveMonthly()}>
              Save monthly limit
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>
            <CalendarBlank size={18} weight="duotone" style={{ verticalAlign: -3, marginRight: 6 }} />
            This week · {weekKey()}
          </h2>
          <p className="panel-sub">
            Spent {formatInr(weekSpend)}
            {weekly ? ` of ${formatInr(weekly.totalLimit)}` : " — optional soft limit"}
          </p>
          <div className="progress-track" style={{ marginBottom: 14 }}>
            <div
              className="progress-fill"
              style={{ width: `${pct(weekSpend, weekly?.totalLimit)}%` }}
            />
          </div>
          <label className="field">
            <span>Weekly limit (₹)</span>
            <input
              value={weekInput}
              onChange={(e) => setWeekInput(e.target.value)}
              type="number"
              inputMode="numeric"
            />
          </label>
          <div className="sheet-actions">
            <button type="button" className="btn btn-primary" onClick={() => void saveWeekly()}>
              Save weekly limit
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

export default function BudgetsPage() {
  return (
    <RequireAuth>
      <BudgetsInner />
    </RequireAuth>
  );
}
