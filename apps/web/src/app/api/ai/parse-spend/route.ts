import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CATEGORIES,
  PAYMENT_METHODS,
  type ParseSpendRequest,
  type ParsedSpendDraft,
  type PaymentMethod,
  type SpendCategory,
} from "@spend-tracker/shared";
import { NextResponse } from "next/server";
import { geminiModelName, resolveGeminiKey } from "@/lib/gemini-server";
import { parseSpendLocally } from "@/lib/parse-local";

export const runtime = "nodejs";

function coerceDraft(raw: unknown, transcript: string): ParsedSpendDraft {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const categories = new Set(CATEGORIES.map((c) => c.id));
  const methods = new Set(PAYMENT_METHODS.map((m) => m.id));
  const category =
    typeof obj.category === "string" && categories.has(obj.category as SpendCategory)
      ? (obj.category as SpendCategory)
      : null;
  const method =
    typeof obj.method === "string" && methods.has(obj.method as PaymentMethod)
      ? (obj.method as PaymentMethod)
      : null;
  const amount =
    typeof obj.amount === "number"
      ? obj.amount
      : typeof obj.amount === "string"
        ? Number(obj.amount)
        : null;

  return {
    amount: amount && Number.isFinite(amount) && amount > 0 ? amount : null,
    currency: "INR",
    merchant: typeof obj.merchant === "string" ? obj.merchant : null,
    category,
    method,
    note: typeof obj.note === "string" ? obj.note : null,
    confidence:
      typeof obj.confidence === "number"
        ? Math.max(0, Math.min(1, obj.confidence))
        : 0.6,
    rawTranscript: transcript,
  };
}

export async function POST(req: Request) {
  let transcript = "";
  let merchants: string[] = [];

  try {
    const body = (await req.json()) as ParseSpendRequest;
    transcript = (body.transcript ?? "").trim();
    if (!transcript) {
      return NextResponse.json({ error: "transcript required" }, { status: 400 });
    }

    merchants = body.merchants ?? [];
    const apiKey = resolveGeminiKey(req);

    if (!apiKey) {
      return NextResponse.json({
        draft: parseSpendLocally(transcript, merchants),
        provider: "local",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: geminiModelName(),
    });

    const prompt = `You extract personal spend entries for an India-first expense app.
Return ONLY valid JSON with keys:
amount (number|null), merchant (string|null), category (one of ${CATEGORIES.map((c) => c.id).join(",")}|null),
method (one of ${PAYMENT_METHODS.map((m) => m.id).join(",")}|null), note (string|null), confidence (0-1).
Currency is always INR. Match merchant names to this list when possible: ${merchants.join(", ") || "Swiggy, Zomato, Blinkit, Zepto"}.
Transcript: """${transcript}"""`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const draft = coerceDraft(parsed, transcript);

    const local = parseSpendLocally(transcript, merchants);
    if (draft.amount == null) draft.amount = local.amount;
    if (!draft.merchant) draft.merchant = local.merchant;
    if (!draft.category) draft.category = local.category;
    if (!draft.method) draft.method = local.method;
    if (!draft.note) draft.note = local.note;

    return NextResponse.json({ draft, provider: "gemini" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    if (transcript) {
      return NextResponse.json({
        draft: parseSpendLocally(transcript, merchants),
        provider: "local",
        warning: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
