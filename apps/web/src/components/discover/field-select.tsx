"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type FieldSelectOption = {
  value: string;
  label: string;
  /** Shorter label for the closed trigger; list still uses `label`. */
  compactLabel?: string;
  disabled?: boolean;
};

/**
 * Theme-aware listbox — native `<select>` option popups ignore dark CSS
 * on many browsers and render on a light system chrome.
 */
export function FieldSelect({
  id,
  value,
  options,
  onChange,
  labelledBy,
  icon,
  size = "lg",
  /** Align the open panel to the trigger’s end (useful for right-side fields). */
  menuAlign = "start",
}: {
  id?: string;
  value: string;
  options: FieldSelectOption[];
  onChange: (next: string) => void;
  labelledBy?: string;
  icon?: string;
  size?: "sm" | "lg";
  menuAlign?: "start" | "end";
}) {
  const listId = useId();
  const valueId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const displayLabel =
    selected?.compactLabel ?? selected?.label ?? value;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full min-w-0 text-left">
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : valueId}
        className="flex w-full min-w-0 items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setOpen((o) => !o)}
      >
        {icon ? (
          <span
            className="material-symbols-outlined shrink-0 text-xl text-secondary"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <span
          id={valueId}
          className={cn(
            "min-w-0 flex-1 truncate font-semibold text-on-surface",
            size === "lg" ? "text-xl" : "text-base",
          )}
        >
          {displayLabel}
        </span>
        <span
          className="material-symbols-outlined shrink-0 text-outline"
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      <div
        id={listId}
        hidden={!open}
        className={cn(
          "absolute top-full z-50 mt-3 w-max min-w-full max-w-[min(100vw-2rem,20rem)] rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 shadow-[0px_10px_30px_rgba(0,0,0,0.12)]",
          menuAlign === "end" ? "right-0" : "left-0",
          !open && "hidden",
        )}
      >
        <ul
          className="flex max-h-72 flex-col overflow-y-auto"
          role="listbox"
          aria-labelledby={labelledBy}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={opt.disabled}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-base transition-colors",
                    opt.disabled
                      ? "cursor-not-allowed text-on-surface-variant/60"
                      : "hover:bg-surface-container-low",
                    active &&
                      !opt.disabled &&
                      "bg-primary font-semibold text-on-primary hover:bg-primary",
                  )}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
