"use client";

import { DownloadSimple, X } from "@phosphor-icons/react";
import { useInstallPrompt } from "@/lib/use-install-prompt";

/** Soft popup on phones: install Dhuttu as an app. */
export function MobileInstallBanner() {
  const { showBanner, canNativePrompt, isIos, promptInstall, dismissBanner } = useInstallPrompt();

  if (!showBanner) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install Dhuttu">
      <div className="install-banner-card">
        <button type="button" className="install-banner-close" aria-label="Dismiss" onClick={dismissBanner}>
          <X size={16} weight="bold" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dhuttu-icon-light.png?v=wallet-2" alt="" width={44} height={44} className="install-banner-icon" />
        <div className="install-banner-copy">
          <strong>Install Dhuttu</strong>
          <p>
            {isIos
              ? "Add to Home Screen for a full-screen app — Safari Share → Add to Home Screen."
              : "Install the Chrome app for one-tap access from your phone."}
          </p>
        </div>
        <div className="install-banner-actions">
          {canNativePrompt ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void promptInstall().then((ok) => ok && dismissBanner())}
            >
              <DownloadSimple size={16} weight="bold" />
              Install app
            </button>
          ) : isIos ? (
            <button type="button" className="btn btn-primary" onClick={dismissBanner}>
              Got it
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={dismissBanner}>
              Maybe later
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={dismissBanner}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
