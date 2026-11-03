"use client";

import { RequireAuth, useShell } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import {
  deleteInvestmentPlan,
  listInvestmentPlans,
  newId,
  saveInvestmentPlan,
} from "@/lib/firestore";
import {
  INVESTMENT_BUCKETS,
  formatInr,
  investmentBucketLabel,
  monthlyForGoal,
  type InvestmentBucket,
  type InvestmentPlan,
} from "@spend-tracker/shared";
import { InfoTip } from "@/components/InfoTip";
import { Plus, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

function emptyBuckets() {
  return INVESTMENT_BUCKETS.map((b) => ({
    bucket: b.id,
    amount: b.id === "sip" ? 5000 : b.id === "emergency" ? 3000 : 0,
    note: "",
  }));
}

function InvestmentsInner() {
  const { user } = useAuth();
  const { refreshKey, bumpRefresh } = useShell();
  const uid = user!.uid;
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [editing, setEditing] = useState<InvestmentPlan | null>(null);
  const [name, setName] = useState("My invest plan");
  const [income, setIncome] = useState("80000");
  const [target, setTarget] = useState("15000");
  const [goalName, setGoalName] = useState("House down payment");
  const [goalAmount, setGoalAmount] = useState("500000");
  const [goalMonths, setGoalMonths] = useState("24");
  const [buckets, setBuckets] = useState(emptyBuckets());
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPlans(await listInvestmentPlans(uid));
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const bucketTotal = useMemo(
    () => buckets.reduce((s, b) => s + (Number(b.amount) || 0), 0),
    [buckets],
  );
  const neededMonthly = monthlyForGoal(Number(goalAmount) || 0, Number(goalMonths) || 1);
  const investPct =
    Number(income) > 0 ? Math.round(((Number(target) || 0) / Number(income)) * 100) : 0;

  function loadPlan(plan: InvestmentPlan) {
    setEditing(plan);
    setName(plan.name);
    setIncome(String(plan.monthlyIncome));
    setTarget(String(plan.monthlyInvestTarget));
    setGoalName(plan.goalName);
    setGoalAmount(String(plan.goalAmount));
    setGoalMonths(String(plan.goalMonths));
    setBuckets(
      INVESTMENT_BUCKETS.map((b) => {
        const found = plan.buckets.find((x) => x.bucket === b.id);
        return { bucket: b.id, amount: found?.amount ?? 0, note: found?.note ?? "" };
      }),
    );
  }

  async function save() {
    const now = new Date().toISOString();
    const plan: InvestmentPlan = {
      id: editing?.id ?? newId("invest"),
      name: name.trim() || "Invest plan",
      monthlyIncome: Number(income) || 0,
      monthlyInvestTarget: Number(target) || 0,
      buckets: buckets.map((b) => ({
        bucket: b.bucket as InvestmentBucket,
        amount: Number(b.amount) || 0,
        note: b.note,
      })),
      goalName: goalName.trim(),
      goalAmount: Number(goalAmount) || 0,
      goalMonths: Number(goalMonths) || 1,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };
    await saveInvestmentPlan(uid, plan);
    setMsg("Investment plan saved");
    setEditing(plan);
    bumpRefresh();
    await refresh();
  }

  return (
    <>
      <div className="hero-row">
        <div>
          <h1 className="title-with-tip">
            Investment planner
            <InfoTip title="Keep it simple">
              Set income → monthly invest target → split across SIP, emergency, FD. Goal check tells
              you if the monthly amount is enough. Separate from daily spends and trips.
            </InfoTip>
          </h1>
          <p>Decide how much to invest each month.</p>
        </div>
        <button
          type="button"
          className="btn btn-soft"
          onClick={() => {
            setEditing(null);
            setBuckets(emptyBuckets());
            setMsg(null);
          }}
        >
          <Plus size={16} />
          New blank plan
        </button>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Build your plan</h2>
          <p className="panel-sub">Numbers you can actually stick to</p>
          <div className="form-grid">
            <label className="field span-2">
              <span>Plan name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Monthly income (₹)</span>
              <input type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
            </label>
            <label className="field">
              <span>Invest every month (₹)</span>
              <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
          </div>
          <p className="meta" style={{ marginTop: 8 }}>
            That is about <strong>{investPct}%</strong> of income.
            {investPct < 10
              ? " Try to grow toward 15–20% over time."
              : investPct > 40
                ? " High — make sure rent and EMIs are covered first."
                : " Solid starting range for many salaried folks."}
          </p>

          <h2 style={{ marginTop: 18 }}>Split the monthly invest</h2>
          <p className="panel-sub">
            Bucket total now: <span className="mono">{formatInr(bucketTotal)}</span>
            {bucketTotal !== Number(target) ? " (adjust to match your target)" : " ✓ matches target"}
          </p>
          {buckets.map((b, idx) => (
            <div key={b.bucket} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{investmentBucketLabel(b.bucket)}</strong>
                <span className="meta">
                  {INVESTMENT_BUCKETS.find((x) => x.id === b.bucket)?.hint}
                </span>
              </div>
              <input
                type="number"
                value={b.amount}
                onChange={(e) => {
                  const next = [...buckets];
                  next[idx] = { ...b, amount: Number(e.target.value) || 0 };
                  setBuckets(next);
                }}
                style={{
                  marginTop: 6,
                  width: "100%",
                  minHeight: 40,
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--ink)",
                  padding: "8px 10px",
                }}
              />
            </div>
          ))}

          <h2 style={{ marginTop: 10 }}>Goal check</h2>
          <div className="form-grid">
            <label className="field span-2">
              <span>Goal name</span>
              <input value={goalName} onChange={(e) => setGoalName(e.target.value)} />
            </label>
            <label className="field">
              <span>Goal amount (₹)</span>
              <input
                type="number"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Months to goal</span>
              <input
                type="number"
                value={goalMonths}
                onChange={(e) => setGoalMonths(e.target.value)}
              />
            </label>
          </div>
          <div className="banner ok" style={{ marginTop: 12 }}>
            You need about <strong>{formatInr(neededMonthly)}</strong> / month for “{goalName || "goal"}”.
            Your invest target is <strong>{formatInr(Number(target) || 0)}</strong>.
            {Number(target) >= neededMonthly
              ? " You are on track if you stay consistent."
              : " Raise SIPs a bit, or extend the timeline."}
          </div>

          {msg ? <div className="banner ok">{msg}</div> : null}
          <div className="sheet-actions">
            <button type="button" className="btn btn-primary" onClick={() => void save()}>
              Save investment plan
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Saved plans</h2>
          <p className="panel-sub">Open one to edit</p>
          {plans.length === 0 ? (
            <div className="empty">No plans yet. Fill the form and save.</div>
          ) : (
            <div className="settings-list">
              {plans.map((p) => (
                <div key={p.id} className="settings-item">
                  <div>
                    <strong>{p.name}</strong>
                    <div className="meta">
                      Invest {formatInr(p.monthlyInvestTarget)} / mo · Goal {p.goalName}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn" onClick={() => loadPlan(p)}>
                      Open
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        void deleteInvestmentPlan(uid, p.id).then(() => {
                          bumpRefresh();
                          void refresh();
                        })
                      }
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default function InvestmentsPage() {
  return (
    <RequireAuth>
      <InvestmentsInner />
    </RequireAuth>
  );
}
