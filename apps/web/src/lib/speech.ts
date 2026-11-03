"use client";

type SpeechHandlers = {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return Boolean(getRecognitionCtor());
}

export function startListening(
  locale: string,
  handlers: SpeechHandlers,
  opts?: { continuous?: boolean },
): { stop: () => void } {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    handlers.onError?.("Speech recognition is not supported in this browser.");
    return { stop: () => undefined };
  }

  const recognition = new Ctor();
  recognition.lang = locale;
  recognition.continuous = Boolean(opts?.continuous);
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = "";
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i]![0].transcript;
      if (event.results[i]!.isFinal) isFinal = true;
    }
    handlers.onResult(transcript.trim(), isFinal);
  };

  recognition.onerror = (ev) => {
    handlers.onError?.(ev.error || "Speech error");
  };

  recognition.onend = () => {
    handlers.onEnd?.();
  };

  recognition.start();
  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
