"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "sun", label: "Aurinkoinen", icon: "wb_sunny", filled: true },
  { value: "dry", label: "Vähiten sadetta", icon: "water_drop" },
  { value: "warm", label: "Lämmin", icon: "thermostat" },
  { value: "calm", label: "Tyyni", icon: "air" },
  { value: "cloudy", label: "Pilvinen", icon: "cloud" },
];

export function WeatherFilters({ active }: { active: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("weatherGoal", value);
    router.push(`/?${params.toString()}#results`);
  }

  return (
    <div className="mb-10 flex flex-wrap justify-center gap-3">
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => select(f.value)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 active:scale-95",
              isActive
                ? "border-primary-fixed bg-primary text-on-primary shadow-lg shadow-primary/30"
                : "border-outline-variant/30 bg-surface/90 text-on-surface backdrop-blur-xl hover:bg-surface",
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined text-xl",
                isActive && "fill-icon",
                !isActive && f.value === "dry" && "text-secondary",
                !isActive && f.value === "warm" && "text-error",
                !isActive && f.value === "calm" && "text-secondary-container",
                !isActive && f.value === "cloudy" && "text-outline",
              )}
            >
              {f.icon}
            </span>
            <span>{f.label}</span>
          </button>
        );
      })}
      <Link
        href="/map"
        className="flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface/90 px-5 py-2.5 text-sm font-medium text-on-surface shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-surface"
      >
        <span className="material-symbols-outlined text-xl text-primary">
          map
        </span>
        Kartta
      </Link>
    </div>
  );
}
