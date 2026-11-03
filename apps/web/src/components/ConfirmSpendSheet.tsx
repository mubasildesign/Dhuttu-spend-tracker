"use client";

import {
  CATEGORIES,
  PAYMENT_METHODS,
  type ParsedSpendDraft,
  type PaymentMethod,
  type SpendCategory,
} from "@spend-tracker/shared";

export type ConfirmValues = {
  amount: number;
  merchant: string;
  category: SpendCategory;
  method: PaymentMethod | null;
  note: string;
};

type Props = {
  open: boolean;
  draft: ParsedSpendDraft | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (values: ConfirmValues) => void;
};

export function ConfirmSpendSheet({ open, draft, saving, onClose, onSave }: Props) {
  if (!open || !draft) return null;

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <form
        className="sheet"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const amount = Number(fd.get("amount"));
          const merchant = String(fd.get("merchant") || "").trim();
          const category = String(fd.get("category")) as SpendCategory;
          const methodRaw = String(fd.get("method") || "");
          const method = (methodRaw || null) as PaymentMethod | null;
          const note = String(fd.get("note") || "").trim();
          if (!amount || amount <= 0 || !merchant) return;
          onSave({ amount, merchant, category, method, note });
        }}
      >
        <div className="sheet-head">
          <div>
            <p className="brand-kicker">Review before save</p>
            <h3 id="confirm-title">Check the numbers</h3>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {draft.rawTranscript ? (
          <p className="meta" style={{ marginBottom: 12 }}>
            Heard: “{draft.rawTranscript}”
          </p>
        ) : null}

        <div className="form-grid">
          <label className="field">
            <span>Amount (₹) *</span>
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="1"
              required
              defaultValue={draft.amount ?? ""}
            />
          </label>
          <label className="field">
            <span>Where *</span>
            <input name="merchant" required defaultValue={draft.merchant ?? ""} />
          </label>
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue={draft.category ?? "other"}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>How paid</span>
            <select name="method" defaultValue={draft.method ?? ""}>
              <option value="">Not sure</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field span-2">
            <span>Note</span>
            <input name="note" defaultValue={draft.note ?? ""} placeholder="lunch, EMI…" />
          </label>
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save spend"}
          </button>
        </div>
      </form>
    </div>
  );
}
