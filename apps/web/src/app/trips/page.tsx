"use client";

import { RequireAuth, useShell } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { deleteTrip, listTripExpenses, listTrips, newId, saveTrip } from "@/lib/firestore";
import {
  TRIP_CATEGORIES,
  formatInr,
  type Trip,
  type TripPlanLine,
} from "@spend-tracker/shared";
import { InfoTip } from "@/components/InfoTip";
import { AirplaneTilt, Plus, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function defaultPlan(total: number): TripPlanLine[] {
  const weights: Record<string, number> = {
    stay: 0.35,
    travel: 0.25,
    food: 0.2,
    local_transport: 0.08,
    activities: 0.07,
    shopping: 0.03,
    misc: 0.02,
  };
  return TRIP_CATEGORIES.map((c) => ({
    category: c.id,
    label: c.label,
    planned: Math.round(total * (weights[c.id] ?? 0.05)),
  }));
}

function TripsInner() {
  const { user } = useAuth();
  const { refreshKey, bumpRefresh } = useShell();
  const uid = user!.uid;
  const [trips, setTrips] = useState<Trip[]>([]);
  const [spentMap, setSpentMap] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalBudget, setTotalBudget] = useState("30000");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await listTrips(uid);
    setTrips(list);
    const spent: Record<string, number> = {};
    await Promise.all(
      list.map(async (t) => {
        const exps = await listTripExpenses(uid, t.id);
        spent[t.id] = exps.reduce((s, e) => s + e.amount, 0);
      }),
    );
    setSpentMap(spent);
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const plannedTotal = useMemo(() => Number(totalBudget) || 0, [totalBudget]);

  async function createTrip() {
    if (!name.trim() || !destination.trim() || !startDate || !endDate) {
      setError("Fill trip name, place, and dates.");
      return;
    }
    const now = new Date().toISOString();
    const budget = Number(totalBudget) || 0;
    const trip: Trip = {
      id: newId("trip"),
      name: name.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      totalBudget: budget,
      plan: defaultPlan(budget),
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };
    await saveTrip(uid, trip);
    setOpen(false);
    setName("");
    setDestination("");
    setNotes("");
    setError(null);
    bumpRefresh();
    await refresh();
  }

  return (
    <>
      <div className="hero-row">
        <div>
          <h1 className="title-with-tip">
            Trip planner
            <InfoTip title="How it works">
              Create a trip with a total budget. We split stay, tickets, food, etc. Open the trip to
              log spends only for that trip — separate from daily life.
            </InfoTip>
          </h1>
          <p>Plan the budget. Track trip spends separately.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} weight="bold" />
          New trip
        </button>
      </div>

      {trips.length === 0 ? (
        <section className="panel">
          <div className="empty">No trips yet. Tap “New trip” to plan Goa, Manali, or a weekend.</div>
        </section>
      ) : (
        <div className="grid-2">
          {trips.map((t) => {
            const spent = spentMap[t.id] ?? 0;
            const left = t.totalBudget - spent;
            const pct = t.totalBudget > 0 ? Math.min(100, (spent / t.totalBudget) * 100) : 0;
            return (
              <Link key={t.id} href={`/trips/${t.id}`} className="tool-card">
                <div className="icon-wrap">
                  <AirplaneTilt size={20} weight="fill" />
                </div>
                <div>
                  <strong style={{ fontSize: "1.05rem" }}>{t.name}</strong>
                  <div className="meta">
                    {t.destination} · {t.startDate} → {t.endDate}
                  </div>
                </div>
                <div className="mono">{formatInr(spent)} / {formatInr(t.totalBudget)}</div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="meta">
                  {left >= 0 ? `${formatInr(left)} left` : `Over by ${formatInr(Math.abs(left))}`}
                </div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.confirm(`Delete trip “${t.name}”?`)) {
                      void deleteTrip(uid, t.id).then(() => {
                        bumpRefresh();
                        void refresh();
                      });
                    }
                  }}
                >
                  <Trash size={14} />
                  Delete
                </button>
              </Link>
            );
          })}
        </div>
      )}

      {open ? (
        <div className="sheet-backdrop" role="dialog" aria-modal="true">
          <div className="sheet">
            <div className="sheet-head">
              <h3>Plan a new trip</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Trip name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa with friends" />
              </label>
              <label className="field">
                <span>Destination</span>
                <input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Goa"
                />
              </label>
              <label className="field">
                <span>Start date</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="field">
                <span>End date</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
              <label className="field span-2">
                <span>Total trip budget (₹)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                />
              </label>
              <label className="field span-2">
                <span>Notes</span>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="4 people, flights already booked…"
                />
              </label>
            </div>
            <p className="meta" style={{ marginTop: 10 }}>
              We’ll auto-split ~{formatInr(plannedTotal)} across stay, tickets, food, and more. You
              can edit the split inside the trip.
            </p>
            {error ? <div className="banner error">{error}</div> : null}
            <div className="sheet-actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void createTrip()}>
                Create trip
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function TripsPage() {
  return (
    <RequireAuth>
      <TripsInner />
    </RequireAuth>
  );
}
