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

const TX_KEY = "spend-tracker:transactions";
const MERCHANT_KEY = "spend-tracker:merchants";
const BUDGET_KEY = "spend-tracker:budgets";
const TRIP_KEY = "spend-tracker:trips";
const TRIP_EXP_KEY = "spend-tracker:trip-expenses";
const INVEST_KEY = "spend-tracker:investments";
const SALARY_KEY = "spend-tracker:salary-plan";
const USER_KEY = "spend-tracker:demo-user";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export type DemoUser = { uid: string; email: string; displayName: string };

export function getDemoUser(): DemoUser | null {
  return readJson<DemoUser | null>(USER_KEY, null);
}

export function setDemoUser(user: DemoUser | null) {
  if (!user) localStorage.removeItem(USER_KEY);
  else writeJson(USER_KEY, user);
}

export function listTransactions(): Transaction[] {
  return readJson<Transaction[]>(TX_KEY, []).sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  );
}

export function saveTransaction(tx: Transaction) {
  const all = listTransactions().filter((t) => t.id !== tx.id);
  all.unshift(tx);
  writeJson(TX_KEY, all);
}

export function deleteTransaction(id: string) {
  writeJson(
    TX_KEY,
    listTransactions().filter((t) => t.id !== id),
  );
}

export function listMerchants(): Merchant[] {
  const custom = readJson<Merchant[]>(MERCHANT_KEY, []);
  const map = new Map<string, Merchant>();
  for (const m of INDIA_MERCHANT_PRESETS) map.set(m.id, m);
  for (const m of custom) map.set(m.id, m);
  return Array.from(map.values());
}

export function saveMerchant(merchant: Merchant) {
  const custom = readJson<Merchant[]>(MERCHANT_KEY, []).filter((m) => m.id !== merchant.id);
  custom.push(merchant);
  writeJson(MERCHANT_KEY, custom);
}

export function listBudgets(): Budget[] {
  return readJson<Budget[]>(BUDGET_KEY, []);
}

export function upsertBudget(budget: Budget) {
  const all = listBudgets().filter(
    (b) => !(b.period === budget.period && b.periodKey === budget.periodKey),
  );
  all.push(budget);
  writeJson(BUDGET_KEY, all);
}

export function getBudget(period: "weekly" | "monthly", key?: string): Budget | null {
  const periodKey = key ?? (period === "monthly" ? monthKey() : weekKey());
  return listBudgets().find((b) => b.period === period && b.periodKey === periodKey) ?? null;
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function listTrips(): Trip[] {
  return readJson<Trip[]>(TRIP_KEY, []).sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function getTrip(id: string): Trip | null {
  return listTrips().find((t) => t.id === id) ?? null;
}

export function saveTrip(trip: Trip) {
  const all = listTrips().filter((t) => t.id !== trip.id);
  all.unshift(trip);
  writeJson(TRIP_KEY, all);
}

export function deleteTrip(id: string) {
  writeJson(
    TRIP_KEY,
    listTrips().filter((t) => t.id !== id),
  );
  writeJson(
    TRIP_EXP_KEY,
    listTripExpenses().filter((e) => e.tripId !== id),
  );
}

export function listTripExpenses(tripId?: string): TripExpense[] {
  const all = readJson<TripExpense[]>(TRIP_EXP_KEY, []).sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  );
  return tripId ? all.filter((e) => e.tripId === tripId) : all;
}

export function saveTripExpense(exp: TripExpense) {
  const all = listTripExpenses().filter((e) => e.id !== exp.id);
  all.unshift(exp);
  writeJson(TRIP_EXP_KEY, all);
}

export function deleteTripExpense(id: string) {
  writeJson(
    TRIP_EXP_KEY,
    listTripExpenses().filter((e) => e.id !== id),
  );
}

export function listInvestmentPlans(): InvestmentPlan[] {
  return readJson<InvestmentPlan[]>(INVEST_KEY, []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function saveInvestmentPlan(plan: InvestmentPlan) {
  const all = listInvestmentPlans().filter((p) => p.id !== plan.id);
  all.unshift(plan);
  writeJson(INVEST_KEY, all);
}

export function deleteInvestmentPlan(id: string) {
  writeJson(
    INVEST_KEY,
    listInvestmentPlans().filter((p) => p.id !== id),
  );
}

export function getSalaryPlan(): SalaryPlan | null {
  return readJson<SalaryPlan | null>(SALARY_KEY, null);
}

export function saveSalaryPlan(plan: SalaryPlan) {
  writeJson(SALARY_KEY, plan);
}
