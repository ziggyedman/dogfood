"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Soft-refresh the dashboard every 20s so scheduler sends + inbound mail show up live. */
export default function Refresher() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
