import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiscoverResultDto } from "@/lib/types";

const LAST_DISCOVER_KEY = "wt_last_discover_v2";
/** Legacy key from earlier builds (plain DiscoverResultDto JSON). */
const LEGACY_KEY = "wt_last_discover";

export type CachedDiscover = {
  savedAt: string;
  result: DiscoverResultDto;
};

export async function saveLastDiscover(
  result: DiscoverResultDto,
): Promise<void> {
  const payload: CachedDiscover = {
    savedAt: new Date().toISOString(),
    result,
  };
  await AsyncStorage.setItem(LAST_DISCOVER_KEY, JSON.stringify(payload));
}

export async function loadLastDiscover(): Promise<DiscoverResultDto | null> {
  const cached = await loadLastDiscoverCached();
  return cached?.result ?? null;
}

export async function loadLastDiscoverCached(): Promise<CachedDiscover | null> {
  const raw = await AsyncStorage.getItem(LAST_DISCOVER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as CachedDiscover | DiscoverResultDto;
      if (
        parsed &&
        typeof parsed === "object" &&
        "result" in parsed &&
        parsed.result &&
        typeof (parsed as CachedDiscover).savedAt === "string"
      ) {
        return parsed as CachedDiscover;
      }
      // Unexpected shape under v2 key
      if (parsed && typeof parsed === "object" && "destinations" in parsed) {
        return {
          savedAt: new Date(0).toISOString(),
          result: parsed as DiscoverResultDto,
        };
      }
    } catch {
      // fall through to legacy
    }
  }

  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;
  try {
    const result = JSON.parse(legacy) as DiscoverResultDto;
    if (!result?.destinations) return null;
    const migrated: CachedDiscover = {
      savedAt: new Date(0).toISOString(),
      result,
    };
    await AsyncStorage.setItem(LAST_DISCOVER_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}
