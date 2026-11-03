import type { Merchant, PaymentMethod, SpendCategory } from "./types";

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
  { id: "credit_bill", label: "Credit bill" },
  { id: "cash", label: "Cash" },
  { id: "net_banking", label: "Net banking" },
  { id: "apple_pay", label: "Apple Pay" },
  { id: "wallet", label: "Wallet" },
  { id: "other", label: "Other" },
];

export const CATEGORIES: { id: SpendCategory; label: string }[] = [
  { id: "food_delivery", label: "Food delivery" },
  { id: "dining", label: "Dining" },
  { id: "groceries", label: "Groceries" },
  { id: "shopping", label: "Shopping" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "entertainment", label: "Entertainment" },
  { id: "travel", label: "Travel" },
  { id: "utilities", label: "Utilities" },
  { id: "rent", label: "Rent" },
  { id: "education", label: "Education" },
  { id: "health", label: "Health" },
  { id: "credit_bill", label: "Credit bill" },
  { id: "loan_emi", label: "Loan EMI" },
  { id: "investment", label: "Investment" },
  { id: "transfer", label: "Transfer" },
  { id: "other", label: "Other" },
];

export const INDIA_MERCHANT_PRESETS: Merchant[] = [
  { id: "swiggy", name: "Swiggy", categoryHint: "food_delivery", preset: true, favorite: true },
  { id: "zomato", name: "Zomato", categoryHint: "food_delivery", preset: true, favorite: true },
  { id: "blinkit", name: "Blinkit", categoryHint: "groceries", preset: true, favorite: true },
  { id: "zepto", name: "Zepto", categoryHint: "groceries", preset: true, favorite: true },
  { id: "instamart", name: "Instamart", categoryHint: "groceries", preset: true },
  { id: "bigbasket", name: "BigBasket", categoryHint: "groceries", preset: true },
  { id: "bookmyshow", name: "BookMyShow", categoryHint: "entertainment", preset: true },
  { id: "makemytrip", name: "MakeMyTrip", categoryHint: "travel", preset: true },
  { id: "redbus", name: "RedBus", categoryHint: "travel", preset: true },
  { id: "amazon", name: "Amazon", categoryHint: "shopping", preset: true, favorite: true },
  { id: "flipkart", name: "Flipkart", categoryHint: "shopping", preset: true },
  { id: "uber", name: "Uber", categoryHint: "travel", preset: true },
  { id: "ola", name: "Ola", categoryHint: "travel", preset: true },
  { id: "netflix", name: "Netflix", categoryHint: "subscriptions", preset: true },
  { id: "spotify", name: "Spotify", categoryHint: "subscriptions", preset: true },
  { id: "swiggy-dine", name: "Swiggy Dineout", categoryHint: "dining", preset: true },
];

export function categoryLabel(id: SpendCategory): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function methodLabel(id: PaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;
}

/** Distinct chart colors per spend category (not brand accent). */
export const CATEGORY_COLORS: Record<SpendCategory, string> = {
  food_delivery: "#E85D4C",
  dining: "#F08A5D",
  groceries: "#3D9B6E",
  shopping: "#7B6CF0",
  subscriptions: "#5B8DEF",
  entertainment: "#D45BA8",
  travel: "#2E9BB5",
  utilities: "#C4A035",
  rent: "#6B7280",
  education: "#4F8FCF",
  health: "#E05A7A",
  credit_bill: "#B45309",
  loan_emi: "#7C5C3B",
  investment: "#0F7A5A",
  transfer: "#64748B",
  other: "#94A3B8",
};

/** Distinct chart colors per payment method. */
export const METHOD_COLORS: Record<PaymentMethod | "unknown", string> = {
  upi: "#5B8DEF",
  card: "#7B6CF0",
  credit_bill: "#B45309",
  cash: "#3D9B6E",
  net_banking: "#2E9BB5",
  apple_pay: "#64748B",
  wallet: "#D45BA8",
  other: "#94A3B8",
  unknown: "#94A3B8",
};

export function categoryColor(id: SpendCategory): string {
  return CATEGORY_COLORS[id] ?? CATEGORY_COLORS.other;
}

export function methodColor(id: PaymentMethod | "unknown"): string {
  return METHOD_COLORS[id] ?? METHOD_COLORS.unknown;
}

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function weekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
