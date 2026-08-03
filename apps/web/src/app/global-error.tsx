"use client";

import { useEffect } from "react";

/**
 * Root layout failures — must define own <html>/<body>.
 * Keep copy bilingual and free of technical details.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? error.name);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: "0 0 12px" }}>
            Service temporarily unavailable
          </h1>
          <p style={{ color: "#64748b", lineHeight: 1.5, margin: "0 0 8px" }}>
            We couldn&apos;t load Solviax.app right now. Please try again in a
            moment.
          </p>
          <p style={{ color: "#64748b", lineHeight: 1.5, margin: "0 0 24px" }}>
            Palvelu on tilapäisesti poissa käytöstä. Yritä hetken kuluttua
            uudelleen.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "12px 20px",
              fontWeight: 600,
              background: "#16a34a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again / Yritä uudelleen
          </button>
        </main>
      </body>
    </html>
  );
}
