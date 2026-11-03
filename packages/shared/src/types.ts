export type PaymentMethod =
  | "upi"
  | "card"
  | "credit_bill"
  | "cash"
  | "net_banking"
  | "apple_pay"
  | "wallet"
  | "other";

export type SpendCategory =
  | "food_delivery"
  | "dining"
  | "groceries"
  | "shopping"
  | "subscriptions"
  | "entertainment"
  | "travel"
  | "utilities"
  | "rent"
  | "education"
  | "health"
  | "credit_bill"
  | "loan_emi"
  | "investment"
  | "transfer"
  | "other";

export type SpendSource = "voice" | "manual" | "text";

export type Transaction = {
  id: string;
  amount: number;
  currency: "INR";
  method: PaymentMethod | null;
  merchant: string;
  category: SpendCategory;
  note: string;
  source: SpendSource;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Merchant = {
  id: string;
  name: string;
  categoryHint?: SpendCategory;
  favorite?: boolean;
  preset?: boolean;
};

export type BudgetPeriod = "weekly" | "monthly";

export type Budget = {
  id: string;
  period: BudgetPeriod;
  /** YYYY-MM for monthly, YYYY-Www for weekly */
  periodKey: string;
  totalLimit: number;
  categoryLimits: Partial<Record<SpendCategory, number>>;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  preferredLocale: "en-IN" | "hi-IN";
  createdAt: string;
};

export type ParsedSpendDraft = {
  amount: number | null;
  currency: "INR";
  merchant: string | null;
  category: SpendCategory | null;
  method: PaymentMethod | null;
  note: string | null;
  confidence: number;
  rawTranscript: string;
};

export type ParseSpendRequest = {
  transcript: string;
  merchants?: string[];
};

export type ParseSpendResponse = {
  draft: ParsedSpendDraft;
};

export type TripCategory =
  | "stay"
  | "travel"
  | "food"
  | "local_transport"
  | "activities"
  | "shopping"
  | "misc";

export type TripPlanLine = {
  category: TripCategory;
  label: string;
  planned: number;
};

export type Trip = {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  plan: TripPlanLine[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TripExpense = {
  id: string;
  tripId: string;
  amount: number;
  category: TripCategory;
  title: string;
  note: string;
  paidWith: PaymentMethod | null;
  occurredAt: string;
  createdAt: string;
};

export type InvestmentBucket =
  | "emergency"
  | "sip"
  | "stocks"
  | "fd_rd"
  | "gold"
  | "ppf_epf"
  | "other";

export type InvestmentPlan = {
  id: string;
  name: string;
  monthlyIncome: number;
  monthlyInvestTarget: number;
  buckets: { bucket: InvestmentBucket; amount: number; note: string }[];
  goalName: string;
  goalAmount: number;
  goalMonths: number;
  createdAt: string;
  updatedAt: string;
};

/** Fixed monthly outflow used in the salary → leftover calculator */
export type SalaryFixedLine = {
  id: string;
  label: string;
  amount: number;
  /** true = repeats every month (EMI, rent, etc.) */
  everyMonth: boolean;
};

/** Salary in − fixed EMIs/bills = leftover for daily spends */
export type SalaryPlan = {
  id: string;
  salary: number;
  lines: SalaryFixedLine[];
  createdAt: string;
  updatedAt: string;
};
