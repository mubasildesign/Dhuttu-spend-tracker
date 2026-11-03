"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Apps moved into Settings */
export default function AppsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings");
  }, [router]);
  return (
    <div className="login-wrap">
      <p className="meta">Moving apps into Settings…</p>
    </div>
  );
}
