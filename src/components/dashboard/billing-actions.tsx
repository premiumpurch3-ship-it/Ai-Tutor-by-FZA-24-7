"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BillingActions({ mode, planId }: { mode: "checkout" | "portal"; planId?: string }) {
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    try {
      const res = await fetch(mode === "checkout" ? "/api/billing/checkout" : "/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: mode === "checkout" ? JSON.stringify({ planId }) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Something went wrong.");
        return;
      }
      window.location.href = json.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" className="w-full" onClick={go} disabled={loading}>
      {loading ? "Redirecting..." : mode === "checkout" ? "Upgrade" : "Manage billing"}
    </Button>
  );
}
