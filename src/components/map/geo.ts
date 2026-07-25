import type { MapMarkerDto, PlaceDto } from "@/lib/types";

/** Approx circle polygon around a point (for Mapbox GeoJSON). */
export function circlePolygon(
  lon: number,
  lat: number,
  radiusKm: number,
  points = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    coords.push([
      lon + distanceX * Math.cos(theta),
      lat + distanceY * Math.sin(theta),
    ]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}

export function fitPaddingForRadius(radiusKm: number): number {
  if (radiusKm >= 5000) return 40;
  if (radiusKm >= 1000) return 60;
  if (radiusKm >= 300) return 80;
  return 100;
}

export type WeatherMapProps = {
  markers: MapMarkerDto[];
  origin?: PlaceDto;
  radiusKm?: number;
  showRadius?: boolean;
  className?: string;
  /** Public Mapbox token (pk.…). */
  token: string;
};
