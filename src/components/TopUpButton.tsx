"use client";

import { useState } from "react";
import { CREDIT_PACKAGES } from "@/lib/stripe";

export function TopUpButton() {
  const [loading, setLoading] = useState(false);

  async function handleTopUp() {
    // Default to the smallest package; a future modal can let users pick.
    const pkg = CREDIT_PACKAGES[0];
    if (!pkg?.priceId) {
      alert("Top-up is not configured yet.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: pkg.priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Could not start checkout. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleTopUp}
      disabled={loading}
      className="mt-1 text-xs text-nimbus underline-offset-2 hover:underline disabled:opacity-50 dark:text-indigo-400"
    >
      {loading ? "…" : "Top up credits"}
    </button>
  );
}
