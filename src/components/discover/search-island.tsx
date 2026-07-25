"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import type { PlaceDto } from "@/lib/types";
import {
  resolveDateWindow,
  type DatePreset,
  type DateWindow,
} from "@/lib/dates";
import { LocationOriginField } from "@/components/discover/location-origin-field";
import { DateWhenField } from "@/components/discover/date-when-field";

/** Distance options = great-circle radius from starting point. */
const DISTANCES = [
  { value: "near", label: "Near · 50 km", radiusKm: 50 },
  { value: "region", label: "Region · 300 km", radiusKm: 300 },
  { value: "country", label: "Far · 800 km", radiusKm: 800 },
  { value: "continent", label: "Continent · 2,000 km", radiusKm: 2000 },
  { value: "global", label: "Global · anywhere", radiusKm: 20000 },
];

const GOALS = [
  { value: "sun", label: "Most Sun" },
  { value: "dry", label: "Least Rain" },
  { value: "mild", label: "Mild Temperature" },
  { value: "warm", label: "Warm" },
];

export function DiscoverSearch({
  defaults,
}: {
  defaults?: {
    origin?: string;
    distance?: string;
    weatherGoal?: string;
    lat?: number;
    lon?: number;
    datePreset?: string;
    startDate?: string;
    endDate?: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const geoSynced = useRef(false);
  const hasCoords =
    defaults?.lat != null &&
    defaults?.lon != null &&
    !Number.isNaN(defaults.lat) &&
    !Number.isNaN(defaults.lon);

  const initialWindow = useMemo(
    () =>
      resolveDateWindow({
        preset: (defaults?.datePreset as DatePreset) || "weekend",
        startDate: defaults?.startDate,
        endDate: defaults?.endDate,
      }),
    [defaults?.datePreset, defaults?.startDate, defaults?.endDate],
  );

  const [origin, setOrigin] = useState(defaults?.origin ?? "");
  const [place, setPlace] = useState<PlaceDto | null>(
    hasCoords
      ? {
          id: "default",
          name: defaults?.origin?.split(",")[0]?.trim() || "Origin",
          placeName: defaults?.origin || "",
          lat: defaults!.lat!,
          lon: defaults!.lon!,
        }
      : null,
  );
  const [when, setWhen] = useState<DateWindow>(initialWindow);
  const [distance, setDistance] = useState(defaults?.distance ?? "region");
  const [weatherGoal, setWeatherGoal] = useState(
    defaults?.weatherGoal ?? "sun",
  );
  const [error, setError] = useState<string | null>(null);

  const buildParams = useCallback(
    (resolved: PlaceDto) => {
      return new URLSearchParams({
        origin: resolved.placeName,
        lat: String(resolved.lat),
        lon: String(resolved.lon),
        distance,
        weatherGoal,
        datePreset: when.preset,
        startDate: when.startDate,
        endDate: when.endDate,
      });
    },
    [distance, weatherGoal, when],
  );

  const onGeolocated = useCallback(
    (detected: PlaceDto) => {
      if (hasCoords || geoSynced.current) return;
      geoSynced.current = true;
      setPlace(detected);
      setOrigin(detected.placeName);
      // Sync map + discover to GPS place (avoids Helsinki default).
      router.replace(`/?${buildParams(detected).toString()}`);
    },
    [buildParams, hasCoords, router],
  );

  async function resolvePlace(): Promise<PlaceDto | null> {
    if (place) return place;
    const q = origin.trim();
    if (q.length < 2) return null;

    const res = await fetch(
      `/api/search?q=${encodeURIComponent(q)}&limit=1`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { results: PlaceDto[] };
    return data.results[0] ?? null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!origin.trim() && !place) {
      setError("Choose a starting point first.");
      return;
    }

    startTransition(async () => {
      const resolved = await resolvePlace();
      if (!resolved) {
        setError("Couldn’t find that place. Pick one from the suggestions.");
        return;
      }

      setPlace(resolved);
      setOrigin(resolved.placeName);
      router.push(`/?${buildParams(resolved).toString()}#results`);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative z-40 flex w-full max-w-5xl flex-col rounded-[2rem] border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] md:p-4 lg:flex-row"
    >
      <div className="group relative flex-1 rounded-t-2xl border-b border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6 md:py-4 lg:rounded-l-2xl lg:rounded-tr-none lg:border-r lg:border-b-0">
        <label className="mb-1 block text-left text-sm font-medium text-on-surface-variant transition-colors group-hover:text-primary">
          Where are you starting from?
        </label>
        <LocationOriginField
          value={origin}
          onChange={(v) => {
            setOrigin(v);
            setError(null);
          }}
          onPlaceSelect={setPlace}
          onGeolocated={onGeolocated}
          autoDetect={!hasCoords}
        />
        {error && (
          <p className="mt-1 text-left text-xs text-error">{error}</p>
        )}
      </div>

      <div className="group relative flex-1 border-b border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6 md:py-4 lg:border-r lg:border-b-0">
        <label className="mb-1 block text-sm font-medium text-on-surface-variant transition-colors group-hover:text-primary">
          When are you going?
        </label>
        <DateWhenField value={when} onChange={setWhen} />
      </div>

      <div className="group relative flex-1 cursor-pointer border-b border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6 md:py-4 lg:border-r lg:border-b-0">
        <label className="mb-1 block text-sm font-medium text-on-surface-variant transition-colors group-hover:text-primary">
          How far? (circle radius)
        </label>
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="material-symbols-outlined text-xl text-secondary">
            radar
          </span>
          <select
            className="w-full cursor-pointer appearance-none border-none bg-transparent p-0 pr-4 text-xl font-semibold text-on-surface focus:outline-none"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          >
            {DISTANCES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="group relative flex flex-1 cursor-pointer flex-col justify-center rounded-b-2xl px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6 md:py-4 lg:rounded-r-2xl lg:rounded-bl-none">
        <label className="mb-1 block text-sm font-medium text-on-surface-variant transition-colors group-hover:text-primary">
          Weather goal
        </label>
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="material-symbols-outlined text-xl text-secondary">
            wb_sunny
          </span>
          <select
            className="w-full cursor-pointer appearance-none border-none bg-transparent p-0 pr-4 text-xl font-semibold text-on-surface focus:outline-none"
            value={weatherGoal}
            onChange={(e) => setWeatherGoal(e.target.value)}
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-2 flex w-full justify-center p-2 md:p-3 lg:absolute lg:top-1/2 lg:-right-4 lg:mt-0 lg:w-auto lg:-translate-y-1/2 lg:pl-0">
        <button
          type="submit"
          disabled={pending}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-on-primary shadow-md transition-all hover:bg-on-primary-fixed-variant active:scale-95 disabled:opacity-70 lg:h-16 lg:w-16 lg:rounded-full"
        >
          <span className="material-symbols-outlined text-2xl">search</span>
          <span className="text-xl font-semibold lg:hidden">
            {pending ? "Searching…" : "Search Destinations"}
          </span>
        </button>
      </div>
    </form>
  );
}
