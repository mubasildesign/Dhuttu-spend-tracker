"use client";

import { brandForName, faviconUrl } from "@spend-tracker/shared";
import { useState } from "react";

type Props = {
  name: string;
  size?: number;
  className?: string;
};

export function MerchantLogo({ name, size = 32, className = "" }: Props) {
  const brand = brandForName(name);
  const [failed, setFailed] = useState(false);
  const letter = brand?.letter ?? (name.trim().slice(0, 1).toUpperCase() || "?");
  const color = brand?.color ?? "#64748B";
  const showImg = Boolean(brand && !failed);

  return (
    <span
      className={`merchant-logo ${className}`}
      style={{
        width: size,
        height: size,
        background: showImg ? undefined : color,
        color: "#fff",
        fontSize: Math.max(10, size * 0.38),
      }}
      aria-hidden
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl(brand!.domain, 128)}
          alt=""
          width={size * 0.62}
          height={size * 0.62}
          onError={() => setFailed(true)}
        />
      ) : (
        letter
      )}
    </span>
  );
}
