"use client";

import { RequireAuth, useShell } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import {
  deleteTripExpense,
  getTrip,
  listTripExpenses,
  newId,
  saveTrip,
  saveTripExpense,
} from "@/lib/firestore";
import {
  PAYMENT_METHODS,
  TRIP_CATEGORIES,
  formatInr,
  tripCategoryLabel,
  type Trip,
  type TripCategory,
  type TripExpense,
  type TripPlanLine,
} from "@spend-tracker/shared";
import { InfoTip } from "@/components/InfoTip";
import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PaymentMethod } from "@spend-tracker/shared";

function TripDetailInner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { bumpRefresh } = useShell();
  const uid = user!.uid;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TripCategory>("food");
  const [paidWith, setPaidWith] = useState<PaymentMethod>("upi");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const t = await getTrip(uid, id);
    setTrip(t);
    if (t) setExpenses(await listTripExpenses(uid, t.id));
  }, [uid, id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const spent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const byCat = useMemo(() => {
    const map = new Map<TripCategory, number>();
    for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return map;
  }, [expenses]);

  async function updatePlanLine(line: TripPlanLine, planned: number) {
    if (!trip) return;
    const plan = trip.plan.map((p) => (p.category === line.category ? { ...p, planned } : p));
    const next = {
      ...trip,
      plan,
      totalBudget: plan.reduce((s, p) => s + p.planned, 0),
      updatedAt: new Date().toISOString(),
    };
    await saveTrip(uid, next);
    setTrip(next);
    bumpRefresh();
  }

  async function addExpense() {
    if (!trip) return;
    const value = Number(amount);
    if (!value || !title.trim()) {
      setError("Enter amount and what you paid for.");
      return;
    }
    const now = new Date().toISOString();
    await saveTripExpense(uid, {
      id: newId("texp"),
      tripId: trip.id,
      amount: value,
      category,
      title: title.trim(),
      note: note.trim(),
      paidWith,
      occurredAt: now,
      createdAt: now,
    });
    setOpen(false);
    setAmount("");
    setTitle("");
    setNote("");
    setError(null);
    await refresh();
    bumpRefresh();
  }

  if (!trip) {
    return (
      <div className="panel">
        <p className="meta">Loading trip…</p>
        <Link href="/trips" className="btn" style={{ marginTop: 12 }}>
          Back to trips
        </Link>
      </div>
    );
  }

  const left = trip.totalBudget - spent;

  return (
    <>
      <div className="hero-row">
        <div>
          <Link href="/trips" className="btn btn-ghost" style={{ marginBottom: 8, minHeight: 36 }}>
            <ArrowLeft size={16} />
            All trips
          </Link>
          <h1 className="title-with-tip">
            {trip.name}
            <InfoTip title="Trip-only ledger">
              Daily spends stay on Home. Here you log hotel, cab, food for this trip — against the
              trip budget.
            </InfoTip>
          </h1>
          <p>
            {trip.destination} · {trip.startDate} → {trip.endDate}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} weight="bold" />
          Add trip spend
        </button>
      </div>

      <section className="kpi-grid">
        <article className="kpi">
          <p className="label">Trip budget</p>
          <p className="value">{formatInr(trip.totalBudget)}</p>
        </article>
        <article className="kpi">
          <p className="label">Spent so far</p>
          <p className="value">{formatInr(spent)}</p>
        </article>
        <article className={`kpi ${left < 0 ? "danger" : left < trip.totalBudget * 0.15 ? "warn" : "ok"}`}>
          <p className="label">Left</p>
          <p className="value">{formatInr(Math.max(left, 0))}</p>
          <p className="hint">{left < 0 ? `Over by ${formatInr(Math.abs(left))}` : "Still available"}</p>
        </article>
        <article className="kpi">
          <p className="label">Entries</p>
          <p className="value">{expenses.length}</p>
        </article>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>Budget plan</h2>
          <p className="panel-sub">Edit the split. Total updates automatically.</p>
          {trip.plan.map((line) => {
            const used = byCat.get(line.category) ?? 0;
            const barPct = line.planned > 0 ? Math.min(100, (used / line.planned) * 100) : 0;
            return (
              <div key={line.category} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{line.label}</strong>
                  <span className="meta">
                    {formatInr(used)} of {formatInr(line.planned)}
                  </span>
                </div>
                <div className="progress-track" style={{ margin: "6px 0 8px" }}>
                  <div className="progress-fill" style={{ width: `${barPct}%` }} />
                </div>
                <label className="field">
                  <span>Planned (₹)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={line.planned}
                    onChange={(e) => void updatePlanLine(line, Number(e.target.value) || 0)}
                  />
                </label>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <h2>Trip spends</h2>
          <p className="panel-sub">Only money spent on this trip — not daily Home spends</p>
          {expenses.length === 0 ? (
            <div className="empty">No trip spends yet. Add hotel, cab, or dinner.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>What</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.title}
                      {e.note ? <div className="meta">{e.note}</div> : null}
                    </td>
                    <td>
                      <span className="chip soft">{tripCategoryLabel(e.category)}</span>
                    </td>
                    <td className="mono">{formatInr(e.amount)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() =>
                          void deleteTripExpense(uid, e.id).then(() => {
                            bumpRefresh();
                            return refresh();
                          })
                        }
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {open ? (
        <div className="sheet-backdrop" role="dialog" aria-modal="true">
          <div className="sheet">
            <div className="sheet-head">
              <h3>Add trip spend</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Amount (₹)</span>
                <input
                  className="amount-input"
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1200"
                />
              </label>
              <label className="field">
                <span>What for?</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hotel night 1" />
              </label>
              <label className="field span-2">
                <span>Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value as TripCategory)}>
                  {TRIP_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Paid with</span>
                <select
                  value={paidWith}
                  onChange={(e) => setPaidWith(e.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Note</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
              </label>
            </div>
            {error ? <div className="banner error">{error}</div> : null}
            <div className="sheet-actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void addExpense()}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function TripDetailPage() {
  return (
    <RequireAuth>
      <TripDetailInner />
    </RequireAuth>
  );
}
