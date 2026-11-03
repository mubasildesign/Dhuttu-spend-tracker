"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type Props = {
  size?: number;
  showWordmark?: boolean;
  tagline?: string;
  className?: string;
};

/** Peach wallet reads better on dark UI; brown wallet on light UI */
const FOR_LIGHT_UI = "/brand/dhuttu-icon-dark.png?v=wallet-2";
const FOR_DARK_UI = "/brand/dhuttu-icon-light.png?v=wallet-2";

export function BrandLogo({
  size = 40,
  showWordmark = true,
  tagline = "Your cash spend tracker",
  className = "",
}: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const src = mounted && resolvedTheme === "dark" ? FOR_DARK_UI : FOR_LIGHT_UI;

  return (
    <div className={`brand-row ${className}`.trim()} style={{ padding: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Dhuttu"
        width={size}
        height={size}
        className="brand-logo-img"
        decoding="async"
      />
      {showWordmark ? (
        <div className="brand-text">
          <strong>Dhuttu</strong>
          {tagline ? <span>{tagline}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
