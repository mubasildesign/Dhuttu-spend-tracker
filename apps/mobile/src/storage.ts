import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  INDIA_MERCHANT_PRESETS,
  monthKey,
  weekKey,
  type Budget,
  type InvestmentPlan,
  type Merchant,
  type Transaction,
  type Trip,
  type TripExpense,
} from "@spend-tracker/shared";

const TX_KEY = "spend-tracker:transactions";
const BUDGET_KEY = "spend-tracker:budgets";
const MERCHANT_KEY = "spend-tracker:merchants";
const TRIP_KEY = "spend-tracker:trips";
const TRIP_EXP_KEY = "spend-tracker:trip-expenses";
const INVEST_KEY = "spend-tracker:investments";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export async function listTransactions(): Promise<Transaction[]> {
  const rows = await readJson<Transaction[]>(TX_KEY, []);
  return rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function saveTransaction(tx: Transaction) {
  const all = (await listTransactions()).filter((t) => t.id !== tx.id);
  all.unshift(tx);
  await writeJson(TX_KEY, all);
}

export async function deleteTransaction(id: string) {
  await writeJson(
    TX_KEY,
    (await listTransactions()).filter((t) => t.id !== id),
  );
}

export async function listMerchants(): Promise<Merchant[]> {
  const custom = await readJson<Merchant[]>(MERCHANT_KEY, []);
  const map = new Map<string, Merchant>();
  for (const m of INDIA_MERCHANT_PRESETS) map.set(m.id, m);
  for (const m of custom) map.set(m.id, m);
  return Array.from(map.values());
}

export async function listBudgets(): Promise<Budget[]> {
  return readJson<Budget[]>(BUDGET_KEY, []);
}

export async function upsertBudget(budget: Budget) {
  const all = (await listBudgets()).filter(
    (b) => !(b.period === budget.period && b.periodKey === budget.periodKey),
  );
  all.push(budget);
  await writeJson(BUDGET_KEY, all);
}

export async function getBudget(period: "weekly" | "monthly"): Promise<Budget | null> {
  const periodKey = period === "monthly" ? monthKey() : weekKey();
  return (await listBudgets()).find((b) => b.period === period && b.periodKey === periodKey) ?? null;
}

export async function listTrips(): Promise<Trip[]> {
  const rows = await readJson<Trip[]>(TRIP_KEY, []);
  return rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function saveTrip(trip: Trip) {
  const all = (await listTrips()).filter((t) => t.id !== trip.id);
  all.unshift(trip);
  await writeJson(TRIP_KEY, all);
}

export async function deleteTrip(id: string) {
  await writeJson(
    TRIP_KEY,
    (await listTrips()).filter((t) => t.id !== id),
  );
  await writeJson(
    TRIP_EXP_KEY,
    (await listTripExpenses()).filter((e) => e.tripId !== id),
  );
}

export async function listTripExpenses(tripId?: string): Promise<TripExpense[]> {
  const rows = await readJson<TripExpense[]>(TRIP_EXP_KEY, []);
  const filtered = tripId ? rows.filter((e) => e.tripId === tripId) : rows;
  return filtered.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function saveTripExpense(exp: TripExpense) {
  const all = (await listTripExpenses()).filter((e) => e.id !== exp.id);
  all.unshift(exp);
  await writeJson(TRIP_EXP_KEY, all);
}

export async function deleteTripExpense(id: string) {
  await writeJson(
    TRIP_EXP_KEY,
    (await listTripExpenses()).filter((e) => e.id !== id),
  );
}

export async function listInvestmentPlans(): Promise<InvestmentPlan[]> {
  return readJson<InvestmentPlan[]>(INVEST_KEY, []);
}

export async function saveInvestmentPlan(plan: InvestmentPlan) {
  const all = (await listInvestmentPlans()).filter((p) => p.id !== plan.id);
  all.unshift(plan);
  await writeJson(INVEST_KEY, all);
}

export async function deleteInvestmentPlan(id: string) {
  await writeJson(
    INVEST_KEY,
    (await listInvestmentPlans()).filter((p) => p.id !== id),
  );
}
