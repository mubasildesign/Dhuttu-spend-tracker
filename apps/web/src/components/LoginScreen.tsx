"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { AirplaneTilt, PiggyBank, Wallet } from "@phosphor-icons/react";
import { useState } from "react";

export function LoginScreen() {
  const { signInEmail, signUpEmail, signInGoogle, continueDemo, firebaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await signInEmail(email, password);
      else await signUpEmail(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div style={{ position: "fixed", top: 16, right: 16 }}>
        <ThemeToggle />
      </div>
      <div className="login-card">
        <BrandLogo size={48} />
        <h1>Track the dhuttu — where every rupee went.</h1>
        <p className="lead">
          Log daily spends. Plan trip budgets separately. Set a monthly invest target. Straight
          numbers, no fluff.
        </p>

        <div className="chips" style={{ marginBottom: 16 }}>
          <span className="chip soft">
            <Wallet size={14} /> Daily spends
          </span>
          <span className="chip soft">
            <AirplaneTilt size={14} /> Trip budgets
          </span>
          <span className="chip soft">
            <PiggyBank size={14} /> Invest plan
          </span>
        </div>

        {!firebaseReady && (
          <div className="banner ok">Start in demo mode on this browser. No signup needed.</div>
        )}

        {firebaseReady && (
          <>
            <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>
            {error ? <div className="banner error">{error}</div> : null}
            <div className="sheet-actions" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Create account" : "I have an account"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void submit()}
              >
                {mode === "signin" ? "Sign in" : "Sign up"}
              </button>
            </div>
            <button
              type="button"
              className="btn"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => void signInGoogle().catch((e) => setError(String(e.message || e)))}
            >
              Continue with Google
            </button>
          </>
        )}

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 16 }}
          onClick={continueDemo}
        >
          Continue in demo mode
        </button>
      </div>
    </div>
  );
}
