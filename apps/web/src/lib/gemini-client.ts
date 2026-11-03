const STORAGE_KEY = "dhuttu.geminiApiKey";

export function getLocalGeminiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setLocalGeminiKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, trimmed);
}

export function geminiAuthHeaders(): HeadersInit {
  const key = getLocalGeminiKey();
  return key ? { "x-gemini-api-key": key } : {};
}
