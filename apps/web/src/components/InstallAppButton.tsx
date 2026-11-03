"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { useInstallPrompt } from "@/lib/use-install-prompt";

/** Chrome / Edge “Install app” (PWA). */
export function InstallAppButton() {
  const { installed, canNativePrompt, isIos, promptInstall } = useInstallPrompt();

  if (installed) {
    return <p className="meta">Dhuttu is installed as an app on this device.</p>;
  }

  if (canNativePrompt) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => void promptInstall()}>
        <DownloadSimple size={16} weight="bold" />
        Install app
      </button>
    );
  }

  if (isIos) {
    return (
      <p className="meta">
        On iPhone: tap Share → <strong>Add to Home Screen</strong>.
      </p>
    );
  }

  return (
    <p className="meta">
      In Chrome: menu (⋮) → <strong>Install app</strong> / <strong>Add to Home screen</strong>.
    </p>
  );
}
