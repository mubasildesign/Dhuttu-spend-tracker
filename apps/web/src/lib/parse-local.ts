import {
  CATEGORIES,
  INDIA_MERCHANT_PRESETS,
  PAYMENT_METHODS,
  type ParsedSpendDraft,
  type PaymentMethod,
  type SpendCategory,
} from "@spend-tracker/shared";

/** Offline / no-API fallback parser for India-style spend phrases */
export function parseSpendLocally(
  transcript: string,
  merchants: string[] = [],
): ParsedSpendDraft {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  const amountMatch =
    lower.match(
      /(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:₹|rs\.?|rupees?|inr)?/,
    ) ?? lower.match(/([0-9]+(?:\.[0-9]+)?)/);
  const amount = amountMatch
    ? Number(amountMatch[1]!.replace(/,/g, ""))
    : null;

  const allMerchants = [
    ...new Set([
      ...merchants,
      ...INDIA_MERCHANT_PRESETS.map((m) => m.name),
    ]),
  ];
  let merchant: string | null = null;
  for (const name of allMerchants.sort((a, b) => b.length - a.length)) {
    if (lower.includes(name.toLowerCase())) {
      merchant = name;
      break;
    }
  }

  let method: PaymentMethod | null = null;
  for (const m of PAYMENT_METHODS) {
    if (lower.includes(m.label.toLowerCase()) || lower.includes(m.id.replace("_", " "))) {
      method = m.id;
      break;
    }
  }
  if (!method && /\bupi\b/.test(lower)) method = "upi";

  let category: SpendCategory | null = null;
  const preset = INDIA_MERCHANT_PRESETS.find(
    (m) => m.name.toLowerCase() === (merchant ?? "").toLowerCase(),
  );
  if (preset?.categoryHint) category = preset.categoryHint;

  if (!category) {
    if (/\b(lunch|dinner|breakfast|food|swiggy|zomato)\b/.test(lower)) {
      category = "food_delivery";
    } else if (/\b(grocery|groceries|blinkit|zepto|instamart)\b/.test(lower)) {
      category = "groceries";
    } else if (/\b(movie|bookmyshow|ticket)\b/.test(lower)) {
      category = "entertainment";
    } else if (/\b(uber|ola|flight|hotel|train|bus|redbus)\b/.test(lower)) {
      category = "travel";
    } else if (/\b(emi|loan)\b/.test(lower)) {
      category = "loan_emi";
    } else if (/\binvest|sip|mutual\b/.test(lower)) {
      category = "investment";
    } else {
      category = "other";
    }
  }

  // Prefer known category labels in text
  for (const c of CATEGORIES) {
    if (lower.includes(c.label.toLowerCase())) {
      category = c.id;
      break;
    }
  }

  let note: string | null = null;
  const forMatch = lower.match(/\bfor\s+([a-z0-9 &'.,-]{2,40})/);
  if (forMatch) {
    const candidate = forMatch[1]!.trim();
    if (!merchant || !candidate.includes(merchant.toLowerCase())) {
      note = candidate.replace(/\b(using|via|with|by)\b.*$/, "").trim() || null;
    }
  }
  if (/\blunch\b/.test(lower)) note = note ?? "lunch";
  if (/\bdinner\b/.test(lower)) note = note ?? "dinner";
  if (/\bbreakfast\b/.test(lower)) note = note ?? "breakfast";

  let confidence = 0.35;
  if (amount && amount > 0) confidence += 0.35;
  if (merchant) confidence += 0.2;
  if (category && category !== "other") confidence += 0.1;

  return {
    amount: amount && amount > 0 ? amount : null,
    currency: "INR",
    merchant,
    category,
    method,
    note,
    confidence: Math.min(confidence, 0.95),
    rawTranscript: text,
  };
}
