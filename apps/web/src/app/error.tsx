"use client";

import { useEffect } from "react";
import { ErrorRecovery } from "@/components/errors/error-recovery";

function looksUnavailable(error: Error): boolean {
  const digest = (error as Error & { digest?: string }).digest ?? "";
  const msg = `${error.name} ${error.message} ${digest}`.toLowerCase();
  return (
    digest === "SERVICE_UNAVAILABLE" ||
    msg.includes("econnrefused") ||
    msg.includes("connect_timeout") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound") ||
    msg.includes("connection refused") ||
    msg.includes("failed query") ||
    msg.includes("postgres") ||
    msg.includes("database")
  );
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client log only — never surface SQL to the UI
    console.error("[app-error]", error.digest ?? error.name);
  }, [error]);

  const kind = looksUnavailable(error) ? "unavailable" : "generic";

  return <ErrorRecovery reset={reset} kind={kind} />;
}
