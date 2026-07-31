import AsyncStorage from "@react-native-async-storage/async-storage";

const ANON_KEY = "wt_anon_cookie_id";

/** Stable anonymous freemium id sent as `wt_anon` cookie (matches web middleware). */
export async function getAnonCookieId(): Promise<string> {
  const existing = await AsyncStorage.getItem(ANON_KEY);
  if (existing) return existing;
  const id = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  await AsyncStorage.setItem(ANON_KEY, id);
  return id;
}
