"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { MobileInstallBanner } from "@/components/MobileInstallBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import {
  AirplaneTilt,
  GearSix,
  House,
  ListBullets,
  Microphone,
  PiggyBank,
  Plus,
  Wallet,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const MAIN_NAV = [
  { href: "/", label: "Home", icon: House, hint: "Your daily spends" },
  { href: "/transactions", label: "Spends", icon: ListBullets, hint: "Full list" },
  { href: "/budgets", label: "Budget", icon: Wallet, hint: "Salary & limits" },
];

const TOOL_NAV = [
  { href: "/trips", label: "Trips", icon: AirplaneTilt, hint: "Trip budget + spends" },
  { href: "/investments", label: "Invest", icon: PiggyBank, hint: "Monthly invest plan" },
  { href: "/settings", label: "Profile", icon: GearSix, hint: "Profile & settings" },
];

/** Compact bottom tabs for phones (Trips / Invest live under Profile) */
const MOBILE_TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/transactions", label: "Spends", icon: ListBullets },
  { href: "/budgets", label: "Budget", icon: Wallet },
  { href: "/settings", label: "Profile", icon: GearSix },
];

type Props = {
  children: ReactNode;
  onAddSpend?: () => void;
  onVoiceSpend?: () => void;
};

export function AppShell({ children, onAddSpend, onVoiceSpend }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const all = [...MAIN_NAV, ...TOOL_NAV];
  const title =
    all.find((n) => n.href === pathname || (n.href !== "/" && pathname.startsWith(n.href)))
      ?.label ?? "Dhuttu";

  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-only">
        <BrandLogo size={40} />

        <div>
          <div className="nav-section">Everyday</div>
          <nav className="nav" aria-label="Everyday">
            {MAIN_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={item.hint}
                >
                  <Icon size={18} weight={active ? "fill" : "regular"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="nav-section">Planners</div>
          <nav className="nav" aria-label="Planners">
            {TOOL_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={item.hint}
                >
                  <Icon size={18} weight={active ? "fill" : "regular"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-foot">
          <div>
            <strong style={{ fontSize: "0.9rem" }}>{user?.displayName || user?.email || "You"}</strong>
            <div className="meta">{user?.mode === "demo" ? "Saved on this device" : "Cloud account"}</div>
          </div>
          <button type="button" className="btn" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </aside>

      <div className="content-col">
        <header className="topbar">
          <div className="topbar-brand mobile-only">
            <BrandLogo size={32} showWordmark={false} />
            <div className="topbar-title">{title}</div>
          </div>
          <div className="topbar-title desktop-only">{title}</div>
          <div className="topbar-actions">
            <ThemeToggle />
            {onVoiceSpend ? (
              <button
                type="button"
                className="icon-btn desktop-only"
                aria-label="Add by voice"
                title="Add by voice"
                onClick={onVoiceSpend}
              >
                <Microphone size={18} weight="bold" />
              </button>
            ) : null}
            {onAddSpend ? (
              <>
                <button
                  type="button"
                  className="icon-btn mobile-only"
                  aria-label="Add spend"
                  onClick={onAddSpend}
                >
                  <Plus size={18} weight="bold" />
                </button>
                <button type="button" className="btn btn-primary desktop-only" onClick={onAddSpend}>
                  <Plus size={16} weight="bold" />
                  Add spend
                </button>
              </>
            ) : null}
          </div>
        </header>
        <main className="main">{children}</main>
      </div>

      <nav className="bottom-nav mobile-only" aria-label="Primary">
        {MOBILE_TABS.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={22} weight={active ? "fill" : "regular"} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {onVoiceSpend ? (
          <button
            type="button"
            className="bottom-nav-fab"
            aria-label="Voice add spend"
            onClick={onVoiceSpend}
          >
            <Microphone size={24} weight="fill" />
          </button>
        ) : (
          <span className="bottom-nav-fab spacer" aria-hidden />
        )}

        {MOBILE_TABS.slice(2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={22} weight={active ? "fill" : "regular"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Investments only in desktop sidebar — quick link on mobile profile */}
      <MobileInstallBanner />
    </div>
  );
}
