"use client";

import { InstallAppButton } from "@/components/InstallAppButton";
import { MerchantLogo } from "@/components/MerchantLogo";
import { RequireAuth, useShell } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { listMerchants, listTransactions, newId, saveMerchant } from "@/lib/firestore";
import { CATEGORIES, categoryLabel, type Merchant, type SpendCategory } from "@spend-tracker/shared";
import {
  AirplaneTilt,
  DownloadSimple,
  Moon,
  Monitor,
  PiggyBank,
  Storefront,
  Sun,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

function initials(name: string | null | undefined, email: string | null | undefined) {
  const base = (name || email || "You").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function SettingsInner() {
  const { user, logout, updateDisplayName } = useAuth();
  const { refreshKey, bumpRefresh } = useShell();
  const { theme, setTheme } = useTheme();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState<SpendCategory>("other");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [msg, setMsg] = useState<string | null>(null);
  const [exported, setExported] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setDisplayName(user?.displayName || "");
  }, [user?.displayName]);

  const refresh = useCallback(async () => {
    setMerchants(await listMerchants(user!.uid));
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  async function saveProfile() {
    await updateDisplayName(displayName);
    setMsg("Profile updated");
  }

  async function addMerchant() {
    const trimmed = shopName.trim();
    if (!trimmed) return;
    await saveMerchant(user!.uid, {
      id: newId("merchant"),
      name: trimmed,
      categoryHint: category,
      favorite: true,
      preset: false,
    });
    setShopName("");
    setMsg("Added to your apps");
    await refresh();
    bumpRefresh();
  }

  async function exportCsv() {
    const txs = await listTransactions(user!.uid);
    const header = "id,occurredAt,merchant,category,amount,method,note,source\n";
    const rows = txs
      .map((t) =>
        [
          t.id,
          t.occurredAt,
          JSON.stringify(t.merchant),
          t.category,
          t.amount,
          t.method ?? "",
          JSON.stringify(t.note),
          t.source,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dhuttu-spends.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  }

  const themeValue = mounted ? theme ?? "system" : "system";

  return (
    <>
      <div className="hero-row">
        <div>
          <h1>Profile & settings</h1>
          <p>Your account, look &amp; feel, and favourite apps.</p>
        </div>
      </div>

      {msg ? <div className="banner ok">{msg}</div> : null}

      <section className="panel profile-card">
        <div className="profile-hero">
          <div className="profile-avatar" aria-hidden>
            {initials(user?.displayName, user?.email)}
          </div>
          <div className="profile-hero-text">
            <strong>{user?.displayName || "Your name"}</strong>
            <div className="meta">{user?.email || "No email yet"}</div>
            <span className="chip soft">
              {user?.mode === "demo"
                ? "Demo on this device"
                : isFirebaseConfigured()
                  ? "Signed in"
                  : "Local account"}
            </span>
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <label className="field">
            <span>Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={user?.email || ""} disabled readOnly />
          </label>
        </div>
        <div className="sheet-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn btn-primary" onClick={() => void saveProfile()}>
            Save profile
          </button>
        </div>
      </section>

      <section className="panel mobile-only" style={{ marginTop: 12 }}>
        <h2>Planners</h2>
        <p className="panel-sub">Trips and investments sit here on phone.</p>
        <div className="profile-quick-links">
          <Link href="/trips" className="profile-quick-link">
            <AirplaneTilt size={20} weight="fill" />
            <span>
              <strong>Trips</strong>
              <em>Trip budget &amp; spends</em>
            </span>
          </Link>
          <Link href="/investments" className="profile-quick-link">
            <PiggyBank size={20} weight="fill" />
            <span>
              <strong>Investments</strong>
              <em>Monthly invest plan</em>
            </span>
          </Link>
        </div>
      </section>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <section className="panel">
          <h2>Appearance</h2>
          <p className="panel-sub">Pick how Dhuttu looks on this device.</p>
          <div className="theme-seg" role="group" aria-label="Theme">
            <button
              type="button"
              className={`theme-seg-btn ${themeValue === "light" ? "active" : ""}`}
              onClick={() => setTheme("light")}
            >
              <Sun size={16} weight="bold" />
              Light
            </button>
            <button
              type="button"
              className={`theme-seg-btn ${themeValue === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              <Moon size={16} weight="bold" />
              Dark
            </button>
            <button
              type="button"
              className={`theme-seg-btn ${themeValue === "system" ? "active" : ""}`}
              onClick={() => setTheme("system")}
            >
              <Monitor size={16} weight="bold" />
              System
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Install app</h2>
          <p className="panel-sub">Add Dhuttu to your phone or laptop for one-tap access.</p>
          <InstallAppButton />
        </section>
      </div>

      <section className="panel" style={{ marginTop: 12 }}>
        <h2>
          <Storefront size={18} weight="duotone" style={{ verticalAlign: -3, marginRight: 6 }} />
          Favourite apps
        </h2>
        <p className="panel-sub">Shown as quick chips when you add a spend. Tap to star or unstar.</p>
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <label className="field">
            <span>Add app / shop</span>
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Kirana, salon…"
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select
              className="select-control"
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
        </div>
        <div className="sheet-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
          <button type="button" className="btn btn-primary" onClick={() => void addMerchant()}>
            Add app
          </button>
        </div>
        <div className="chips" style={{ marginTop: 14 }}>
          {merchants.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`chip ${m.favorite ? "active" : ""}`}
              title={m.categoryHint ? categoryLabel(m.categoryHint) : undefined}
              onClick={() =>
                void saveMerchant(user!.uid, { ...m, favorite: !m.favorite }).then(() => {
                  void refresh();
                  bumpRefresh();
                })
              }
            >
              <MerchantLogo name={m.name} size={22} />
              {m.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel settings-foot" style={{ marginTop: 12 }}>
        <div className="settings-list">
          <div className="settings-item">
            <div>
              <strong>Export spends</strong>
              <div className="meta">Download a CSV of your everyday ledger</div>
            </div>
            <button type="button" className="btn" onClick={() => void exportCsv()}>
              <DownloadSimple size={14} />
              Download
            </button>
          </div>
          <div className="settings-item">
            <div>
              <strong>Sign out</strong>
              <div className="meta">
                {user?.mode === "demo"
                  ? "Clears this demo session on the device"
                  : "Sign out of your Dhuttu account"}
              </div>
            </div>
            <button type="button" className="btn btn-danger" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </div>
        {exported ? <div className="banner ok">CSV downloaded</div> : null}
      </section>
    </>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsInner />
    </RequireAuth>
  );
}
