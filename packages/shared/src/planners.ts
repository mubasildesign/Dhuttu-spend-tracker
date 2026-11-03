import type { InvestmentBucket, TripCategory } from "./types";

/** Quick chips for the salary / EMI calculator */
export const SALARY_FIXED_PRESETS: { label: string; amount: number }[] = [
  { label: "Car EMI", amount: 23000 },
  { label: "Home loan", amount: 10000 },
  { label: "Credit card bill", amount: 10000 },
  { label: "Rent", amount: 15000 },
  { label: "SIP / invest", amount: 5000 },
  { label: "Insurance", amount: 2000 },
  { label: "School fees", amount: 5000 },
  { label: "Mobile / wifi", amount: 1000 },
];

export const TRIP_CATEGORIES: { id: TripCategory; label: string; hint: string }[] = [
  { id: "stay", label: "Stay / hotel", hint: "Hotel, Airbnb, homestay" },
  { id: "travel", label: "Tickets", hint: "Flight, train, bus" },
  { id: "food", label: "Food", hint: "Meals & cafes on trip" },
  { id: "local_transport", label: "Local travel", hint: "Cab, metro, auto" },
  { id: "activities", label: "Activities", hint: "Tickets, tours, entry fees" },
  { id: "shopping", label: "Shopping", hint: "Souvenirs, clothes" },
  { id: "misc", label: "Other", hint: "SIM, tips, buffer" },
];

export const INVESTMENT_BUCKETS: { id: InvestmentBucket; label: string; hint: string }[] = [
  { id: "emergency", label: "Emergency fund", hint: "3–6 months of expenses" },
  { id: "sip", label: "Mutual fund SIP", hint: "Monthly SIPs" },
  { id: "stocks", label: "Stocks / ETF", hint: "Direct equity" },
  { id: "fd_rd", label: "FD / RD", hint: "Fixed or recurring deposit" },
  { id: "gold", label: "Gold", hint: "SGB, gold ETF, jewellery" },
  { id: "ppf_epf", label: "PPF / EPF", hint: "Long-term retirement" },
  { id: "other", label: "Other", hint: "Crypto, NPS, etc." },
];

export function tripCategoryLabel(id: TripCategory): string {
  return TRIP_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function investmentBucketLabel(id: InvestmentBucket): string {
  return INVESTMENT_BUCKETS.find((b) => b.id === id)?.label ?? id;
}

/** Simple monthly savings needed for a goal */
export function monthlyForGoal(goalAmount: number, months: number): number {
  if (months <= 0) return goalAmount;
  return Math.ceil(goalAmount / months);
}
