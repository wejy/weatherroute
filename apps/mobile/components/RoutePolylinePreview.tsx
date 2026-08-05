import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/Colors";

type Props = {
  /** Mapbox-style [lon, lat] pairs */
  geometry?: [number, number][] | null;
  /** Alternate corridors (dashed dots) when not selected */
  alternatives?: Array<{
    geometry: [number, number][];
    selected?: boolean;
  }>;
  height?: number;
};

function project(
  geometry: [number, number][],
  width: number,
  height: number,
  pad: number,
): Array<{ x: number; y: number }> {
  if (geometry.length === 0) return [];
  const lons = geometry.map((g) => g[0]);
  const lats = geometry.map((g) => g[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const dLon = maxLon - minLon || 1e-6;
  const dLat = maxLat - minLat || 1e-6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return geometry.map(([lon, lat]) => ({
    x: pad + ((lon - minLon) / dLon) * innerW,
    y: pad + (1 - (lat - minLat) / dLat) * innerH,
  }));
}

function sample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const out: T[] = [];
  const step = (items.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    out.push(items[Math.round(i * step)]!);
  }
  return out;
}

/**
 * Lightweight route shape preview (no Mapbox GL).
 * Selected corridor = solid primary dots; others = muted.
 */
export function RoutePolylinePreview({
  geometry,
  alternatives,
  height = 160,
}: Props) {
  const width = 320;
  const selected =
    geometry && geometry.length >= 2
      ? geometry
      : alternatives?.find((a) => a.selected)?.geometry;
  const others =
    alternatives?.filter((a) => !a.selected && a.geometry.length >= 2) ?? [];

  if (!selected || selected.length < 2) return null;

  const allForBounds = [
    ...selected,
    ...others.flatMap((a) => a.geometry),
  ];
  const boundsPts = project(allForBounds, width, height, 12);
  // Re-project each line with shared bounds by using allForBounds extents
  const lons = allForBounds.map((g) => g[0]);
  const lats = allForBounds.map((g) => g[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const dLon = maxLon - minLon || 1e-6;
  const dLat = maxLat - minLat || 1e-6;
  const pad = 12;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  function pts(geom: [number, number][]) {
    return sample(geom, 48).map(([lon, lat]) => ({
      x: pad + ((lon - minLon) / dLon) * innerW,
      y: pad + (1 - (lat - minLat) / dLat) * innerH,
    }));
  }

  void boundsPts;

  return (
    <View style={[styles.box, { height }]} accessibilityRole="image">
      {others.map((alt, i) =>
        pts(alt.geometry).map((p, j) => (
          <View
            key={`alt-${i}-${j}`}
            style={[
              styles.dotMuted,
              { left: p.x - 2, top: p.y - 2 },
            ]}
          />
        )),
      )}
      {pts(selected).map((p, j) => (
        <View
          key={`sel-${j}`}
          style={[styles.dot, { left: p.x - 3, top: p.y - 3 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  dot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  dotMuted: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outline,
    opacity: 0.55,
  },
});
