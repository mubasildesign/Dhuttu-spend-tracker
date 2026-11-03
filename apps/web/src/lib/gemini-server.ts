/** Resolve Gemini key: request header (local Settings) or env. */
export function resolveGeminiKey(req: Request): string | null {
  const header = req.headers.get("x-gemini-api-key")?.trim();
  if (header) return header;
  const env = process.env.GEMINI_API_KEY?.trim();
  return env || null;
}

export function geminiModelName() {
  return process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";
}
