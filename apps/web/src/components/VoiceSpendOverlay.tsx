"use client";

import { formatInr, type PaymentMethod, type SpendCategory } from "@spend-tracker/shared";
import { CheckCircle, Microphone, X } from "@phosphor-icons/react";
import { isSpeechSupported, startListening } from "@/lib/speech";
import { useEffect, useRef, useState } from "react";
import type { SpendPayload } from "@/components/AddSpendModal";

type Props = {
  open: boolean;
  merchants: string[];
  onClose: () => void;
  onSave: (payload: SpendPayload) => Promise<void> | void;
};

type Phase = "listening" | "parsing" | "saving" | "done" | "error";

function wantsCommit(text: string) {
  return /\b(add|save|done|okay|ok|confirm|submit)\b/i.test(text);
}

function looksComplete(text: string) {
  return /\d/.test(text) && text.trim().split(/\s+/).length >= 2;
}

export function VoiceSpendOverlay({ open, merchants, onClose, onSave }: Props) {
  const [phase, setPhase] = useState<Phase>("listening");
  const [live, setLive] = useState("");
  const [finalText, setFinalText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const handledRef = useRef(false);
  const liveRef = useRef("");

  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  useEffect(() => {
    if (!open) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }

    handledRef.current = false;
    setPhase("listening");
    setLive("");
    setFinalText("");
    setPreview(null);
    setError(null);

    if (!isSpeechSupported()) {
      setPhase("error");
      setError("Voice needs Chrome on desktop or Android.");
      return;
    }

    const handle = startListening(
      "en-IN",
      {
        onResult: (t, isFinal) => {
          setLive(t);
          if (!isFinal) return;
          setFinalText(t);
          if (wantsCommit(t) || looksComplete(t)) {
            stopRef.current?.();
            stopRef.current = null;
            void finish(t);
          }
        },
        onError: (m) => {
          if (m === "aborted" || m === "no-speech") return;
          setPhase("error");
          setError(m);
        },
        onEnd: () => {
          if (handledRef.current) return;
          const text = (liveRef.current || "").trim();
          if (text) void finish(text);
          else {
            setPhase("error");
            setError("Didn’t catch that — tap mic again.");
          }
        },
      },
      { continuous: true },
    );
    stopRef.current = handle.stop;

    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function finish(transcript: string) {
    if (handledRef.current) return;
    handledRef.current = true;
    const cleaned = transcript.replace(/\b(add|save|done|okay|ok|confirm|submit)\b/gi, "").trim();
    const text = cleaned || transcript.trim();
    if (!text) {
      setPhase("error");
      setError("Nothing to add.");
      return;
    }

    setFinalText(text);
    setPhase("parsing");
    try {
      const res = await fetch("/api/ai/parse-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, merchants }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      const d = data.draft as {
        amount: number | null;
        merchant: string | null;
        category: SpendCategory | null;
        method: PaymentMethod | null;
        note: string | null;
      };
      if (!d.amount) {
        setPhase("error");
        setError(`Heard “${text}” but no amount. Try again.`);
        handledRef.current = false;
        return;
      }
      const merchant = (d.merchant || "Other").trim();
      setPreview(`${formatInr(d.amount)} · ${merchant}`);
      setPhase("saving");
      await onSave({
        amount: d.amount,
        merchant,
        category: d.category ?? "other",
        method: d.method ?? "upi",
        note: d.note ?? text,
        source: "voice",
      });
      setPhase("done");
      window.setTimeout(() => onClose(), 1100);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Could not add spend");
      handledRef.current = false;
    }
  }

  if (!open) return null;

  const display = live || finalText;

  return (
    <div className="voice-backdrop" role="dialog" aria-modal="true" aria-label="Voice add spend">
      <div className="voice-sheet">
        <button type="button" className="voice-close" aria-label="Close" onClick={onClose}>
          <X size={18} weight="bold" />
        </button>

        <p className="voice-kicker">
          {phase === "listening"
            ? "Listening…"
            : phase === "parsing"
              ? "AI reading…"
              : phase === "saving"
                ? "Adding…"
                : phase === "done"
                  ? "Added"
                  : "Try again"}
        </p>

        <div className={`voice-orb ${phase === "listening" ? "pulse" : ""} ${phase === "done" ? "ok" : ""}`}>
          {phase === "done" ? (
            <CheckCircle size={42} weight="fill" />
          ) : (
            <Microphone size={40} weight="fill" />
          )}
          {phase === "listening" ? (
            <>
              <span className="voice-ring r1" />
              <span className="voice-ring r2" />
              <span className="voice-ring r3" />
            </>
          ) : null}
        </div>

        <p className="voice-hint">
          {phase === "listening"
            ? "Say amount, app, how paid — e.g. “Swiggy 380 UPI lunch”. Say “add” when done."
            : phase === "done"
              ? preview
              : preview || "Working…"}
        </p>

        <div className="voice-transcript" aria-live="polite">
          {display ? (
            <span className={phase === "listening" && live ? "typing" : ""}>{display}</span>
          ) : (
            <span className="voice-placeholder">Start speaking…</span>
          )}
        </div>

        {error ? <div className="banner error">{error}</div> : null}

        {phase === "error" ? (
          <div className="sheet-actions" style={{ justifyContent: "center" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                handledRef.current = false;
                setError(null);
                setPhase("listening");
                setLive("");
                setFinalText("");
                const handle = startListening(
                  "en-IN",
                  {
                    onResult: (t, isFinal) => {
                      setLive(t);
                      if (isFinal && (wantsCommit(t) || looksComplete(t))) {
                        stopRef.current?.();
                        void finish(t);
                      }
                    },
                    onError: (m) => {
                      if (m === "aborted" || m === "no-speech") return;
                      setPhase("error");
                      setError(m);
                    },
                    onEnd: () => {
                      if (handledRef.current) return;
                      const text = (liveRef.current || "").trim();
                      if (text) void finish(text);
                    },
                  },
                  { continuous: true },
                );
                stopRef.current = handle.stop;
              }}
            >
              Tap to speak again
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
