import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Does not expose the key — only whether server AI is configured. */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    model: process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest",
  });
}
