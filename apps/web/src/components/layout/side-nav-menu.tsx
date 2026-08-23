"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DiscoverQueryLink } from "@/components/discover/discover-query-link";

export type SideNavMenuItem = {
  href: string;
  label: string;
  icon: string;
  preserve: boolean;
};

const PIN_STORAGE_KEY = "solviax.sideNavPinned";

/**
 * Compact disclosure-style nav for map/routes side panel (WCAG-friendly links,
 * not APG menu/menuitem). Optional pin expands the full list.
 */
export function SideNavMenu({
  active,
  items,
  menuLabel,
  expandLabel,
  collapseLabel,
}: {
  active?: string;
  items: SideNavMenuItem[];
  menuLabel: string;
  expandLabel: string;
  collapseLabel: string;
}) {
  const pathname = usePathname();
  const listId = useId();
  const labelId = useId();
  const valueId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    try {
      setPinned(localStorage.getItem(PIN_STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pinned || !open) return;
    const firstLink = panelRef.current?.querySelector<HTMLElement>("a[href]");
    firstLink?.focus();
  }, [open, pinned]);

  useEffect(() => {
    if (pinned || !open) return;

    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      const panel = panelRef.current;
      if (!panel?.contains(document.activeElement)) return;

      const links = [
        ...panel.querySelectorAll<HTMLElement>("a[href]"),
      ];
      if (links.length === 0) return;
      const index = links.indexOf(document.activeElement as HTMLElement);
      if (index < 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        links[(index + 1) % links.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        links[(index - 1 + links.length) % links.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        links[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        links[links.length - 1]?.focus();
      }
    }

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, pinned]);

  function togglePinned() {
    setPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PIN_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (next) setOpen(false);
      return next;
    });
  }

  const current =
    items.find((item) => item.href === active) ??
    items.find((item) => item.href === pathname) ??
    items[0];

  const itemClass = (isActive: boolean) =>
    cn(
      "flex w-full min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest",
      isActive
        ? "bg-primary font-semibold text-on-primary hover:bg-primary"
        : "text-on-surface hover:bg-surface-container-low",
    );

  function renderItem(item: SideNavMenuItem) {
    const isActive = active === item.href || pathname === item.href;
    const className = itemClass(isActive);
    const content = (
      <>
        <span
          className="material-symbols-outlined shrink-0 text-xl"
          aria-hidden="true"
          style={
            isActive ? { fontVariationSettings: "'FILL' 1" } : undefined
          }
        >
          {item.icon}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">
          {item.label}
        </span>
      </>
    );

    if (item.preserve) {
      return (
        <DiscoverQueryLink
          key={item.href}
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          className={className}
          onClick={() => setOpen(false)}
        >
          {content}
        </DiscoverQueryLink>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={className}
        onClick={() => setOpen(false)}
      >
        {content}
      </Link>
    );
  }

  if (pinned) {
    return (
      <div className="shrink-0 border-b border-surface-variant px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p
            id={labelId}
            className="m-0 text-xs font-bold tracking-widest text-on-surface-variant uppercase"
          >
            {menuLabel}
          </p>
          <button
            type="button"
            onClick={togglePinned}
            className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={collapseLabel}
            title={collapseLabel}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              unfold_less
            </span>
          </button>
        </div>
        <ul className="flex flex-col gap-0.5" aria-labelledby={labelId}>
          {items.map((item) => (
            <li key={item.href}>{renderItem(item)}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative shrink-0 border-b border-surface-variant px-4 py-3"
    >
      <p
        id={labelId}
        className="mb-1.5 text-xs font-bold tracking-widest text-on-surface-variant uppercase"
      >
        {menuLabel}
      </p>
      <div className="flex items-stretch gap-1">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${labelId} ${valueId}`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-left transition-colors hover:border-outline-variant hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => setOpen((o) => !o)}
        >
          {current ? (
            <span
              className="material-symbols-outlined shrink-0 text-xl text-secondary"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {current.icon}
            </span>
          ) : (
            <span
              className="material-symbols-outlined shrink-0 text-xl text-secondary"
              aria-hidden="true"
            >
              menu
            </span>
          )}
          <span
            id={valueId}
            className="min-w-0 flex-1 truncate text-lg font-semibold text-on-surface"
          >
            {current?.label ?? menuLabel}
          </span>
          <span
            className={cn(
              "material-symbols-outlined shrink-0 text-outline transition-transform",
              open && "rotate-180",
            )}
            aria-hidden="true"
          >
            expand_more
          </span>
        </button>
        <button
          type="button"
          onClick={togglePinned}
          className="flex w-12 shrink-0 items-center justify-center self-stretch rounded-xl border border-outline-variant/40 bg-surface-container-low text-on-surface-variant transition-colors hover:border-outline-variant hover:bg-surface-container hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={expandLabel}
          title={expandLabel}
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            unfold_more
          </span>
        </button>
      </div>

      {/* Always mounted so aria-controls stays valid when collapsed. */}
      <div
        ref={panelRef}
        id={listId}
        hidden={!open}
        className={cn(
          "absolute top-full right-4 left-4 z-50 mt-2 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 shadow-[0px_12px_32px_rgba(0,0,0,0.14)]",
          !open && "hidden",
        )}
      >
        <ul className="flex max-h-[min(70vh,28rem)] flex-col gap-0.5 overflow-y-auto" aria-labelledby={labelId}>
          {items.map((item) => (
            <li key={item.href}>{renderItem(item)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
