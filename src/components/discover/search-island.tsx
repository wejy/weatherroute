"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const DISTANCES = [
  { value: "near", label: "Near me <50km" },
  { value: "region", label: "Region <300km" },
  { value: "country", label: "Same Country" },
  { value: "continent", label: "Continent" },
  { value: "global", label: "Global" },
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
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [origin, setOrigin] = useState(defaults?.origin ?? "Helsinki, FI");
  const [distance, setDistance] = useState(defaults?.distance ?? "region");
  const [weatherGoal, setWeatherGoal] = useState(
    defaults?.weatherGoal ?? "sun",
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      origin,
      distance,
      weatherGoal,
      datePreset: "weekend",
    });
    startTransition(() => {
      router.push(`/?${params.toString()}#results`);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative z-10 flex w-full max-w-5xl flex-col rounded-[2rem] border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] md:p-4 lg:flex-row"
    >
      <div className="group relative flex-1 cursor-pointer rounded-t-2xl border-b border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6 md:py-4 lg:rounded-l-2xl lg:rounded-tr-none lg:border-r lg:border-b-0">
        <label className="mb-1 block cursor-pointer text-sm font-medium text-on-surface-variant transition-colors group-hover:text-primary">
          Where are you starting from?
        </label>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-secondary">
            my_location
          </span>
          <input
            className="w-full truncate border-none bg-transparent p-0 text-xl font-semibold text-on-surface placeholder:text-outline focus:outline-none focus:ring-0"
            placeholder="e.g. Helsinki, FI"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>
      </div>

      <div className="group relative flex-1 cursor-pointer border-b border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6 md:py-4 lg:border-r lg:border-b-0">
        <label className="mb-1 block text-sm font-medium text-on-surface-variant transition-colors group-hover:text-primary">
          When are you going?
        </label>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-secondary">
            calendar_month
          </span>
          <input
            readOnly
            className="w-full truncate border-none bg-transparent p-0 text-xl font-semibold text-on-surface focus:outline-none"
            value="This Weekend"
          />
        </div>
      </div>

      <div className="group relative flex-1 cursor-pointer border-b border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6 md:py-4 lg:border-r lg:border-b-0">
        <label className="mb-1 block text-sm font-medium text-on-surface-variant transition-colors group-hover:text-primary">
          How far?
        </label>
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="material-symbols-outlined text-xl text-secondary">
            moving
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
