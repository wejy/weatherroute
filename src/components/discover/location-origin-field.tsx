"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PlaceDto } from "@/lib/types";
import { cn } from "@/lib/utils";

type LocStatus = "idle" | "locating" | "ready" | "denied" | "error";

export function LocationOriginField({
  value,
  onChange,
  onPlaceSelect,
  onGeolocated,
  autoDetect = true,
}: {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceDto | null) => void;
  /** Fired when browser geolocation + reverse geocode succeed. */
  onGeolocated?: (place: PlaceDto) => void;
  autoDetect?: boolean;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const detectedOnce = useRef(false);

  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlaceDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<LocStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);

  const runSearch = useCallback(async (q: string) => {
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
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q.trim())}&limit=6`,
        { signal: controller.signal },
      );
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
  }, []);

  function scheduleSearch(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 280);
  }

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/geocode/reverse?lat=${latitude}&lon=${longitude}`,
          );
          if (!res.ok) throw new Error("reverse failed");
          const data = (await res.json()) as { place: PlaceDto };
          onChange(data.place.placeName);
          onPlaceSelect(data.place);
          onGeolocated?.(data.place);
          setResults([]);
          setOpen(false);
          setStatus("ready");
        } catch {
          setStatus("error");
        }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }, [onChange, onPlaceSelect, onGeolocated]);

  useEffect(() => {
    if (!autoDetect || detectedOnce.current) return;
    detectedOnce.current = true;
    detectLocation();
  }, [autoDetect, detectLocation]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function selectPlace(place: PlaceDto) {
    onChange(place.placeName);
    onPlaceSelect(place);
    setResults([]);
    setOpen(false);
    setStatus("ready");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectPlace(results[activeIndex]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const hint =
    status === "locating"
      ? "Detecting your location…"
      : status === "denied"
        ? "Location blocked — type a city"
        : status === "error"
          ? "Couldn’t detect location — type a city"
          : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => detectLocation()}
          disabled={status === "locating"}
          title="Use my current location"
          aria-label="Use my current location"
          className={cn(
            "shrink-0 rounded-full p-0.5 transition-colors hover:text-primary",
            status === "locating" && "animate-pulse text-primary",
            status === "ready" && "text-secondary",
            (status === "denied" || status === "error") && "text-outline",
            status === "idle" && "text-secondary",
          )}
        >
          <span className="material-symbols-outlined text-xl">my_location</span>
        </button>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
          className="w-full truncate border-none bg-transparent p-0 text-xl font-semibold text-on-surface placeholder:text-outline focus:outline-none focus:ring-0"
          placeholder={
            status === "locating" ? "Detecting…" : "City or town…"
          }
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
          <span className="material-symbols-outlined shrink-0 animate-spin text-lg text-outline">
            progress_activity
          </span>
        )}
      </div>

      {hint && !open && (
        <p className="mt-1 text-left text-xs text-on-surface-variant">{hint}</p>
      )}

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full left-0 z-50 mt-3 max-h-64 w-[min(100vw-2rem,22rem)] overflow-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1 text-left shadow-[0px_10px_30px_rgba(0,0,0,0.12)]"
        >
          {results.map((place, i) => (
            <li key={place.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                id={`${listId}-opt-${i}`}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-container-low",
                  i === activeIndex && "bg-surface-container-low",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPlace(place)}
              >
                <span className="material-symbols-outlined mt-0.5 text-secondary">
                  location_on
                </span>
                <span>
                  <span className="block font-semibold text-on-surface">
                    {place.name}
                  </span>
                  <span className="block text-sm text-on-surface-variant">
                    {place.placeName}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
