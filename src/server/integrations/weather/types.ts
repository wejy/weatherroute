import "server-only";

import type { WeatherDto } from "@/lib/types";

export interface WeatherProvider {
  readonly name: "open-meteo" | "yr.no" | "mock";
  getForecast(input: {
    lat: number;
    lon: number;
    name?: string;
  }): Promise<WeatherDto>;
}
