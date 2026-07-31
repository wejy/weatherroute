import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "wt_device_id";

/** Stable anonymous device id for API quota (not auth). */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(STORAGE_KEY, id);
  return id;
}
