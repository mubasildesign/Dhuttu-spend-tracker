"use client";

import { MerchantLogo } from "@/components/MerchantLogo";
import { RequireAuth, useShell } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { deleteTransaction, listTransactions } from "@/lib/firestore";
import {
  categoryLabel,
  formatDate,
  formatInr,
  methodLabel,
  type Transaction,
} from "@spend-tracker/shared";
import { InfoTip } from "@/components/InfoTip";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

function TransactionsInner() {
  const { user } = useAuth();
  const { refreshKey } = useShell();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setTxs(await listTransactions(user!.uid));
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return txs;
    return txs.filter(
      (t) =>
        t.merchant.toLowerCase().includes(q) ||
        t.note.toLowerCase().includes(q) ||
        t.category.includes(q),
    );
  }, [txs, search]);

  return (
    <>
      <div className="hero-row">
        <div>
          <h1 className="title-with-tip">
            All spends
            <InfoTip title="Find anything">
              Search by shop, note, or category. Delete a row if you logged it by mistake. Trip
              spends live under Trips.
            </InfoTip>
          </h1>
          <p>Everyday ledger only.</p>
        </div>
      </div>

      <label className="field" style={{ maxWidth: 360, marginBottom: 14 }}>
        <span>
          <MagnifyingGlass size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Swiggy, lunch, EMI…"
        />
      </label>

      <section className="panel">
        {filtered.length === 0 ? (
          <div className="empty">No matching spends.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>App</th>
                <th>When</th>
                <th>Paid by</th>
                <th>Category</th>
                <th>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <MerchantLogo name={t.merchant} size={28} />
                      <div>
                        {t.merchant}
                        {t.note ? <div className="meta">{t.note}</div> : null}
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(t.occurredAt)}</td>
                  <td>{t.method ? methodLabel(t.method) : "—"}</td>
                  <td>
                    <span className="chip soft">{categoryLabel(t.category)}</span>
                  </td>
                  <td className="mono">{formatInr(t.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm(`Delete ${t.merchant} ${formatInr(t.amount)}?`)) {
                          void deleteTransaction(user!.uid, t.id).then(refresh);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default function TransactionsPage() {
  return (
    <RequireAuth>
      <TransactionsInner />
    </RequireAuth>
  );
}
