import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiscoverResultDto } from "@/lib/types";

const LAST_DISCOVER_KEY = "wt_last_discover";

export async function saveLastDiscover(
  result: DiscoverResultDto,
): Promise<void> {
  await AsyncStorage.setItem(LAST_DISCOVER_KEY, JSON.stringify(result));
}

export async function loadLastDiscover(): Promise<DiscoverResultDto | null> {
  const raw = await AsyncStorage.getItem(LAST_DISCOVER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DiscoverResultDto;
  } catch {
    return null;
  }
}
