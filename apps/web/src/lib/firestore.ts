"use client";

import {
  INDIA_MERCHANT_PRESETS,
  monthKey,
  weekKey,
  type Budget,
  type InvestmentPlan,
  type Merchant,
  type SalaryPlan,
  type Transaction,
  type Trip,
  type TripExpense,
} from "@spend-tracker/shared";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import * as demo from "./demo-store";

function userCol(uid: string, name: string) {
  return collection(getDb(), "users", uid, name);
}

export async function listTransactions(uid: string): Promise<Transaction[]> {
  if (!isFirebaseConfigured()) return demo.listTransactions();
  const snap = await getDocs(query(userCol(uid, "transactions"), orderBy("occurredAt", "desc")));
  return snap.docs.map((d) => d.data() as Transaction);
}

export async function saveTransaction(uid: string, tx: Transaction): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.saveTransaction(tx);
    return;
  }
  await setDoc(doc(getDb(), "users", uid, "transactions", tx.id), tx);
}

export async function deleteTransaction(uid: string, id: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.deleteTransaction(id);
    return;
  }
  await deleteDoc(doc(getDb(), "users", uid, "transactions", id));
}

export async function listMerchants(uid: string): Promise<Merchant[]> {
  if (!isFirebaseConfigured()) return demo.listMerchants();
  const snap = await getDocs(userCol(uid, "merchants"));
  const custom = snap.docs.map((d) => d.data() as Merchant);
  if (custom.length === 0) {
    await Promise.all(
      INDIA_MERCHANT_PRESETS.map((m) =>
        setDoc(doc(getDb(), "users", uid, "merchants", m.id), m),
      ),
    );
    return INDIA_MERCHANT_PRESETS;
  }
  const map = new Map<string, Merchant>();
  for (const m of INDIA_MERCHANT_PRESETS) map.set(m.id, m);
  for (const m of custom) map.set(m.id, m);
  return Array.from(map.values());
}

export async function saveMerchant(uid: string, merchant: Merchant): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.saveMerchant(merchant);
    return;
  }
  await setDoc(doc(getDb(), "users", uid, "merchants", merchant.id), merchant);
}

export async function getBudget(
  uid: string,
  period: "weekly" | "monthly",
  key?: string,
): Promise<Budget | null> {
  if (!isFirebaseConfigured()) return demo.getBudget(period, key);
  const periodKey = key ?? (period === "monthly" ? monthKey() : weekKey());
  const id = `${period}_${periodKey}`;
  const snap = await getDoc(doc(getDb(), "users", uid, "budgets", id));
  return snap.exists() ? (snap.data() as Budget) : null;
}

export async function upsertBudget(uid: string, budget: Budget): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.upsertBudget(budget);
    return;
  }
  const id = `${budget.period}_${budget.periodKey}`;
  await setDoc(doc(getDb(), "users", uid, "budgets", id), { ...budget, id });
}

export async function listTrips(uid: string): Promise<Trip[]> {
  if (!isFirebaseConfigured()) return demo.listTrips();
  const snap = await getDocs(query(userCol(uid, "trips"), orderBy("startDate", "desc")));
  return snap.docs.map((d) => d.data() as Trip);
}

export async function getTrip(uid: string, id: string): Promise<Trip | null> {
  if (!isFirebaseConfigured()) return demo.getTrip(id);
  const snap = await getDoc(doc(getDb(), "users", uid, "trips", id));
  return snap.exists() ? (snap.data() as Trip) : null;
}

export async function saveTrip(uid: string, trip: Trip): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.saveTrip(trip);
    return;
  }
  await setDoc(doc(getDb(), "users", uid, "trips", trip.id), trip);
}

export async function deleteTrip(uid: string, id: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.deleteTrip(id);
    return;
  }
  await deleteDoc(doc(getDb(), "users", uid, "trips", id));
}

export async function listTripExpenses(uid: string, tripId: string): Promise<TripExpense[]> {
  if (!isFirebaseConfigured()) return demo.listTripExpenses(tripId);
  const snap = await getDocs(
    query(userCol(uid, "tripExpenses"), orderBy("occurredAt", "desc")),
  );
  return snap.docs
    .map((d) => d.data() as TripExpense)
    .filter((e) => e.tripId === tripId);
}

export async function saveTripExpense(uid: string, exp: TripExpense): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.saveTripExpense(exp);
    return;
  }
  await setDoc(doc(getDb(), "users", uid, "tripExpenses", exp.id), exp);
}

export async function deleteTripExpense(uid: string, id: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.deleteTripExpense(id);
    return;
  }
  await deleteDoc(doc(getDb(), "users", uid, "tripExpenses", id));
}

export async function listInvestmentPlans(uid: string): Promise<InvestmentPlan[]> {
  if (!isFirebaseConfigured()) return demo.listInvestmentPlans();
  const snap = await getDocs(userCol(uid, "investments"));
  return snap.docs
    .map((d) => d.data() as InvestmentPlan)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveInvestmentPlan(uid: string, plan: InvestmentPlan): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.saveInvestmentPlan(plan);
    return;
  }
  await setDoc(doc(getDb(), "users", uid, "investments", plan.id), plan);
}

export async function deleteInvestmentPlan(uid: string, id: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.deleteInvestmentPlan(id);
    return;
  }
  await deleteDoc(doc(getDb(), "users", uid, "investments", id));
}

export async function getSalaryPlan(uid: string): Promise<SalaryPlan | null> {
  if (!isFirebaseConfigured()) return demo.getSalaryPlan();
  const snap = await getDoc(doc(getDb(), "users", uid, "salaryPlans", "default"));
  return snap.exists() ? (snap.data() as SalaryPlan) : null;
}

export async function saveSalaryPlan(uid: string, plan: SalaryPlan): Promise<void> {
  if (!isFirebaseConfigured()) {
    demo.saveSalaryPlan(plan);
    return;
  }
  await setDoc(doc(getDb(), "users", uid, "salaryPlans", plan.id), plan);
}

export { newId } from "./demo-store";
