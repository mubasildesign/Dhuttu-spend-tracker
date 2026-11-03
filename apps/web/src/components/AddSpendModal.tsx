"use client";

import { MerchantLogo } from "@/components/MerchantLogo";
import {
  CATEGORIES,
  PAYMENT_METHODS,
  type PaymentMethod,
  type SpendCategory,
} from "@spend-tracker/shared";
import { X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export type SpendPayload = {
  amount: number;
  merchant: string;
  category: SpendCategory;
  method: PaymentMethod | null;
  note: string;
  source: "manual" | "voice" | "text";
};

type Props = {
  open: boolean;
  favorites: string[];
  merchants: string[];
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: SpendPayload) => Promise<void> | void;
};

export function AddSpendModal({ open, favorites, merchants, saving, onClose, onSave }: Props) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<SpendCategory>("food_delivery");
  const [method, setMethod] = useState<PaymentMethod | null>("upi");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAmount("");
    setMerchant("");
    setNote("");
    setCategory("food_delivery");
    setMethod("upi");
  }, [open]);

  if (!open) return null;

  const chips = Array.from(new Set([...favorites, ...merchants])).slice(0, 12);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter an amount");
      return;
    }
    if (!merchant.trim()) {
      setError("Enter where you spent");
      return;
    }
    setError(null);
    await onSave({
      amount: value,
      merchant: merchant.trim(),
      category,
      method,
      note: note.trim(),
      source: "manual",
    });
  }

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <div className="sheet">
        <div className="sheet-head">
          <div>
            <p className="meta" style={{ marginBottom: 4 }}>
              Manual entry
            </p>
            <h3 id="add-title">Add spend</h3>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <span>How much (₹)</span>
          <input
            className="amount-input"
            inputMode="decimal"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="380"
            autoFocus
          />
        </div>

        <div className="field" style={{ marginBottom: 8 }}>
          <span>Where</span>
          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Swiggy, rent, petrol…"
          />
        </div>

        <div className="chips" style={{ marginBottom: 14 }}>
          {chips.map((name) => (
            <button
              key={name}
              type="button"
              className={`chip ${merchant === name ? "active" : ""}`}
              onClick={() => setMerchant(name)}
            >
              <MerchantLogo name={name} size={20} />
              {name}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <div className="field span-2">
            <span>How paid</span>
            <div className="chips">
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
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as SpendCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="lunch" />
          </label>
        </div>

        {error ? <div className="banner error">{error}</div> : null}

        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? "Saving…" : "Save spend"}
          </button>
        </div>
      </div>
    </div>
  );
}
