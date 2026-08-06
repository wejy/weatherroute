"use client";

import type { Map as MapboxMap } from "mapbox-gl";

let guardInstalled = false;

/**
 * Mapbox GL 3.x telemetry nulls `errorCb` in `remove()`, then async session/load
 * requests still call it → `TypeError: this.errorCb is not a function`.
 * Common when navigating away from a map page or remounting on theme change.
 */
export function installMapboxTelemetryGuard(): void {
  if (guardInstalled || typeof window === "undefined") return;
  guardInstalled = true;

  window.addEventListener(
    "error",
    (event) => {
      const msg = event.message || String(event.error ?? "");
      if (!msg.includes("errorCb is not a function")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
}

/** Remove a map without letting Mapbox telemetry races surface as Next overlays. */
export function safeRemoveMap(map: MapboxMap | null | undefined): void {
  if (!map) return;
  installMapboxTelemetryGuard();
  try {
    map.remove();
  } catch (err) {
    if (
      err instanceof TypeError &&
      String(err.message).includes("errorCb is not a function")
    ) {
      return;
    }
    throw err;
  }
}
