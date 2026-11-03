"use client";

import { isSpeechSupported, startListening } from "@/lib/speech";
import type { ParsedSpendDraft } from "@spend-tracker/shared";
import { Microphone, Stop } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

type Props = {
  merchants: string[];
  locale?: string;
  onDraft: (draft: ParsedSpendDraft, source: "voice" | "text") => void;
};

export function VoiceCapture({ merchants, locale = "en-IN", onDraft }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const supported = isSpeechSupported();

  useEffect(() => () => stopRef.current?.(), []);

  async function parseTranscript(value: string, source: "voice" | "text") {
    const trimmed = value.trim();
    if (!trimmed) return;
    setParsing(true);
    setError(null);
    try {
      const { geminiAuthHeaders } = await import("@/lib/gemini-client");
      const res = await fetch("/api/ai/parse-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...geminiAuthHeaders() },
        body: JSON.stringify({ transcript: trimmed, merchants }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      onDraft(data.draft as ParsedSpendDraft, source);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not understand that spend");
    } finally {
      setParsing(false);
    }
  }

  function toggleMic() {
    if (listening) {
      stopRef.current?.();
      stopRef.current = null;
      setListening(false);
      return;
    }
    if (!supported) {
      setError("Voice needs Chrome on desktop or Android. You can type below instead.");
      return;
    }
    setError(null);
    setTranscript("");
    setListening(true);
    const handle = startListening(locale, {
      onResult: (t, isFinal) => {
        setTranscript(t);
        if (isFinal && t) {
          setListening(false);
          stopRef.current = null;
          void parseTranscript(t, "voice");
        }
      },
      onError: (message) => {
        setError(message);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    stopRef.current = handle.stop;
  }

  return (
    <div>
      <button
        type="button"
        className={`btn ${listening ? "btn-primary" : ""}`}
        style={{ width: "100%", minHeight: 52 }}
        onClick={toggleMic}
        aria-pressed={listening}
      >
        {listening ? <Stop size={18} weight="bold" /> : <Microphone size={18} weight="bold" />}
        {listening ? "Listening — tap to stop" : "Start listening"}
      </button>

      {(transcript || parsing) && (
        <p className="meta" style={{ marginTop: 10, textAlign: "center" }}>
          {parsing ? "Understanding…" : transcript}
        </p>
      )}

      <p className="meta" style={{ margin: "14px 0 8px", textAlign: "center" }}>
        or type a sentence
      </p>

      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          void parseTranscript(text, "text");
        }}
      >
        <label className="field" style={{ flex: 1, minWidth: 180 }}>
          <span className="sr-only">Spend sentence</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="450 swiggy upi lunch"
            aria-label="Spend sentence"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={parsing || !text.trim()}>
          Parse
        </button>
      </form>

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
