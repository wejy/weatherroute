"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { PlaceDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/locale-provider";

function kindIcon(kind?: PlaceDto["kind"]): string {
  switch (kind) {
    case "address":
      return "signpost";
    case "poi":
      return "attractions";
    case "place":
    case "locality":
      return "location_city";
    case "region":
      return "public";
    default:
      return "location_on";
  }
}

type MenuCoords = { top: number; left: number; width: number };

export function PlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  ariaLabel,
  ariaLabelledBy,
  proximity,
  inputClassName,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceDto | null) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Prefer over aria-label when a visible <label> exists. */
  ariaLabelledBy?: string;
  proximity?: { lat: number; lon: number } | null;
  inputClassName?: string;
  id?: string;
}) {
  const { t, locale } = useI18n();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlaceDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);

  const listVisible = open && results.length > 0;

  const runSearch = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      if (q.trim().length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);

      try {
        const params = new URLSearchParams({
          q: q.trim(),
          limit: "8",
          mode: "precise",
          lang: locale === "fi" ? "fi" : "en",
        });
        if (proximity) {
          params.set("proximityLat", String(proximity.lat));
          params.set("proximityLon", String(proximity.lon));
        }
        const res = await fetch(`/api/search?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: PlaceDto[] };
        setResults(data.results ?? []);
        setOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setSearching(false);
      }
    },
    [locale, proximity],
  );

  function scheduleSearch(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 280);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        wrapRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  useLayoutEffect(() => {
    if (!listVisible) {
      setMenuCoords(null);
      return;
    }

    function updatePosition() {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gutter = 8;
      const maxWidth = Math.min(24 * 16, window.innerWidth - gutter * 2);
      const width = Math.min(Math.max(r.width, 12 * 16), maxWidth);
      let left = r.left;
      if (left + width > window.innerWidth - gutter) {
        left = Math.max(gutter, window.innerWidth - gutter - width);
      }
      setMenuCoords({
        top: r.bottom + gutter,
        left,
        width,
      });
    }

    updatePosition();
    // Capture scroll from nested overflow containers (e.g. routes sidebar).
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [listVisible, results.length, value]);

  function selectPlace(place: PlaceDto) {
    onChange(place.placeName);
    onPlaceSelect(place);
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!listVisible) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectPlace(results[activeIndex]!);
    }
  }

  const listbox = (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      hidden={!listVisible}
      style={
        mounted && menuCoords
          ? {
              position: "fixed",
              top: menuCoords.top,
              left: menuCoords.left,
              width: menuCoords.width,
            }
          : undefined
      }
      className={cn(
        "z-[80] max-h-72 overflow-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1 text-left shadow-[0px_10px_30px_rgba(0,0,0,0.12)]",
        mounted
          ? null
          : "absolute top-full left-0 mt-2 w-[min(100vw-2rem,24rem)]",
        !listVisible && "hidden",
      )}
    >
      {results.map((place, i) => (
        <li
          key={place.id}
          id={`${listId}-opt-${i}`}
          role="option"
          aria-selected={i === activeIndex}
          className={cn(
            "flex w-full cursor-pointer items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-container-low",
            i === activeIndex && "bg-surface-container-low",
          )}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => selectPlace(place)}
        >
          <span
            className="material-symbols-outlined mt-0.5 text-secondary"
            aria-hidden="true"
          >
            {kindIcon(place.kind)}
          </span>
          <span>
            <span className="block font-semibold text-on-surface">
              {place.name}
            </span>
            <span className="block text-sm text-on-surface-variant">
              {place.placeName}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-2">
        <input
          id={id}
          role="combobox"
          aria-expanded={listVisible}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? placeholder ?? t("location.placeholder"))}
          aria-activedescendant={
            listVisible && activeIndex >= 0
              ? `${listId}-opt-${activeIndex}`
              : undefined
          }
          className={cn(
            "w-full truncate border-none bg-transparent p-0 text-xl font-semibold text-on-surface placeholder:text-on-surface-variant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            inputClassName,
          )}
          placeholder={placeholder ?? t("location.placeholder")}
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next);
            onPlaceSelect(null);
            scheduleSearch(next);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {searching && (
          <>
            <span
              className="material-symbols-outlined shrink-0 animate-spin text-lg text-outline"
              aria-hidden="true"
            >
              progress_activity
            </span>
            <span className="sr-only">{t("search.searching")}</span>
          </>
        )}
      </div>

      {/* Portal escapes overflow:auto parents (routes sidebar); keep in DOM for aria-controls. */}
      {mounted ? createPortal(listbox, document.body) : listbox}
    </div>
  );
}
