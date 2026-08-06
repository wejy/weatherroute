"use client";

import { useEffect, useRef } from "react";
import {
  openContactMailto,
  resolveContactEmail,
} from "@/lib/contact-email";

/**
 * Draws the address on a canvas so it never appears as HTML/SVG text.
 * Mail opens via JS-built mailto (no `mailto:` in markup).
 */
export function ObfuscatedContactEmail({
  ariaLabel,
  className,
}: {
  ariaLabel: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    function paint() {
      const el = canvasRef.current;
      if (!el) return;
      const address = resolveContactEmail();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const font = "12px ui-sans-serif, system-ui, sans-serif";
      const measure = document.createElement("canvas").getContext("2d");
      if (!measure) return;
      measure.font = font;
      const textWidth = Math.ceil(measure.measureText(address).width);
      const cssW = textWidth + 2;
      const cssH = 18;
      el.width = Math.ceil(cssW * dpr);
      el.height = Math.ceil(cssH * dpr);
      el.style.width = `${cssW}px`;
      el.style.height = `${cssH}px`;
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.font = font;
      ctx.textBaseline = "middle";
      const color = getComputedStyle(el).color || "#14b863";
      ctx.fillStyle = color.trim() || "#14b863";
      ctx.fillText(address, 1, cssH / 2);
    }

    paint();
    const root = document.documentElement;
    const observer = new MutationObserver(paint);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={openContactMailto}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openContactMailto();
        }
      }}
      aria-label={ariaLabel}
      className={
        className ??
        "inline-flex rounded-md text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      }
    >
      <canvas ref={canvasRef} aria-hidden="true" />
    </button>
  );
}
