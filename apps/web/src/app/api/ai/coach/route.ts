import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiModelName, resolveGeminiKey } from "@/lib/gemini-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CoachBody = {
  summary: string;
  monthSpend: number;
  weekSpend: number;
  monthlyLimit?: number;
  weeklyLimit?: number;
};

export async function POST(req: Request) {
  let body: CoachBody | null = null;

  try {
    body = (await req.json()) as CoachBody;

    const apiKey = resolveGeminiKey(req);
    if (!apiKey) {
      const overMonth =
        body.monthlyLimit && body.monthSpend > body.monthlyLimit
          ? `You are over your monthly budget by ₹${Math.round(body.monthSpend - body.monthlyLimit)}.`
          : "You are within your monthly budget so far.";
      return NextResponse.json({
        tip: `${overMonth} This week: ₹${Math.round(body.weekSpend)}. Tip: log spends with voice right after paying — it keeps the ledger honest.`,
        provider: "local",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: geminiModelName(),
    });

    const prompt = `You are a concise India personal finance coach. Give 2-3 short sentences of advice.
Monthly spend: ₹${body.monthSpend}. Weekly spend: ₹${body.weekSpend}.
Monthly limit: ${body.monthlyLimit ?? "not set"}. Weekly limit: ${body.weeklyLimit ?? "not set"}.
Breakdown: ${body.summary}
No markdown, no bullets.`;

    const result = await model.generateContent(prompt);
    return NextResponse.json({ tip: result.response.text().trim(), provider: "gemini" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Coach failed";
    if (body) {
      const overMonth =
        body.monthlyLimit && body.monthSpend > body.monthlyLimit
          ? `You are over your monthly budget by ₹${Math.round(body.monthSpend - body.monthlyLimit)}.`
          : "Stay consistent — log spends the same day.";
      return NextResponse.json({
        tip: `${overMonth} This week: ₹${Math.round(body.weekSpend)}.`,
        provider: "local",
        warning: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
