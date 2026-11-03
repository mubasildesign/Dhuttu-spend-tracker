"use client";

import { AddSpendModal, type SpendPayload } from "@/components/AddSpendModal";
import { AppShell } from "@/components/AppShell";
import { LoginScreen } from "@/components/LoginScreen";
import { VoiceSpendOverlay } from "@/components/VoiceSpendOverlay";
import { useAuth } from "@/lib/auth-context";
import { listMerchants, newId, saveTransaction } from "@/lib/firestore";
import type { Transaction } from "@spend-tracker/shared";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ShellCtx = {
  openAdd: (opts?: { voice?: boolean }) => void;
  refreshKey: number;
  bumpRefresh: () => void;
};

const ShellContext = createContext<ShellCtx | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell requires RequireAuth");
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const showDailyAdd =
    !pathname.startsWith("/trips") && !pathname.startsWith("/investments");
  const [addOpen, setAddOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [merchants, setMerchants] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const loadMerchants = useCallback(async () => {
    if (!user) return;
    const m = await listMerchants(user.uid);
    setMerchants(m.map((x) => x.name));
    setFavorites(m.filter((x) => x.favorite || x.preset).map((x) => x.name).slice(0, 12));
  }, [user]);

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants, refreshKey]);

  const openAdd = useCallback((opts?: { voice?: boolean }) => {
    if (opts?.voice) {
      setAddOpen(false);
      setVoiceOpen(true);
      return;
    }
    setVoiceOpen(false);
    setAddOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openAdd, refreshKey, bumpRefresh }),
    [openAdd, refreshKey, bumpRefresh],
  );

  if (loading) {
    return (
      <div className="login-wrap">
        <p className="meta">Loading…</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  async function onSave(payload: SpendPayload) {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const tx: Transaction = {
        id: newId("tx"),
        amount: payload.amount,
        currency: "INR",
        method: payload.method,
        merchant: payload.merchant,
        category: payload.category,
        note: payload.note,
        source: payload.source,
        occurredAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await saveTransaction(user!.uid, tx);
      setAddOpen(false);
      bumpRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ShellContext.Provider value={value}>
      <AppShell
        onAddSpend={showDailyAdd ? () => openAdd() : undefined}
        onVoiceSpend={showDailyAdd ? () => openAdd({ voice: true }) : undefined}
      >
        {children}
      </AppShell>
      <AddSpendModal
        open={addOpen}
        favorites={favorites}
        merchants={merchants}
        saving={saving}
        onClose={() => setAddOpen(false)}
        onSave={onSave}
      />
      <VoiceSpendOverlay
        open={voiceOpen}
        merchants={merchants}
        onClose={() => setVoiceOpen(false)}
        onSave={onSave}
      />
    </ShellContext.Provider>
  );
}
