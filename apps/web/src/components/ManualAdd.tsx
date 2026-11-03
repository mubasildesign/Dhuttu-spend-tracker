"use client";

import {
  CATEGORIES,
  PAYMENT_METHODS,
  type PaymentMethod,
  type SpendCategory,
} from "@spend-tracker/shared";
import { CheckCircle, Microphone } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

export type ManualSpendInput = {
  amount: number;
  merchant: string;
  category: SpendCategory;
  method: PaymentMethod | null;
  note: string;
};

type Props = {
  favoriteMerchants: string[];
  saving?: boolean;
  onSave: (input: ManualSpendInput) => Promise<void> | void;
  onOpenVoice?: () => void;
};

export function ManualAdd({ favoriteMerchants, saving, onSave, onOpenVoice }: Props) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<SpendCategory>("food_delivery");
  const [method, setMethod] = useState<PaymentMethod | null>("upi");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const chips = useMemo(() => favoriteMerchants.slice(0, 10), [favoriteMerchants]);

  async function submit() {
    setOk(false);
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter how much you spent (₹).");
      return;
    }
    if (!merchant.trim()) {
      setError("Enter where you spent — app or shop name.");
      return;
    }
    setError(null);
    await onSave({
      amount: value,
      merchant: merchant.trim(),
      category,
      method,
      note: note.trim(),
    });
    setAmount("");
    setNote("");
    setOk(true);
    window.setTimeout(() => setOk(false), 2500);
  }

  return (
    <section className="panel" aria-labelledby="add-spend-title">
      <h2 id="add-spend-title">Add a spend</h2>
      <p className="panel-sub">
        Type it like a notebook entry. Amount first — the rest takes a few taps.
      </p>

      <div className="field" style={{ marginBottom: 12 }}>
        <span>How much? *</span>
        <input
          className="amount-input"
          inputMode="decimal"
          type="number"
          min="1"
          step="0.01"
          placeholder="380"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-required="true"
        />
      </div>

      <div className="field" style={{ marginBottom: 8 }}>
        <span>Where? *</span>
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Swiggy, BigBasket, rent, petrol…"
          aria-required="true"
        />
      </div>

      {chips.length > 0 ? (
        <div className="chips" style={{ marginBottom: 14 }} aria-label="Frequent apps">
          {chips.map((name) => (
            <button
              key={name}
              type="button"
              className={`chip ${merchant === name ? "active" : ""}`}
              onClick={() => setMerchant(name)}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="form-grid">
        <div className="field span-2">
          <span>How paid?</span>
          <div className="chips" role="group" aria-label="Payment method">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`chip ${method === m.id ? "active" : ""}`}
                onClick={() => setMethod(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field span-2">
          <span>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SpendCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field span-2">
          <span>Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="lunch, EMI Mar, weekend trip…"
          />
        </label>
      </div>

      {error ? <div className="banner error" role="alert">{error}</div> : null}
      {ok ? (
        <div className="banner ok" role="status">
          <CheckCircle size={16} weight="fill" style={{ marginRight: 6, verticalAlign: -2 }} />
          Saved. Keep going — small notes beat big memory.
        </div>
      ) : null}

      <div className="sheet-actions" style={{ justifyContent: "space-between" }}>
        {onOpenVoice ? (
          <button type="button" className="btn btn-ghost" onClick={onOpenVoice}>
            <Microphone size={18} weight="bold" />
            Use voice instead
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? "Saving…" : "Save spend"}
        </button>
      </div>
    </section>
  );
}
