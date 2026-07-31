import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SESSION_TOKEN_KEY = "wt_session_token";
const SESSION_COOKIE_KEY = "wt_session_cookie_name";

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function getItem(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      // fall through
    }
  }
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      // fall through
    }
  }
  await AsyncStorage.setItem(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // fall through
    }
  }
  await AsyncStorage.removeItem(key);
}

export async function getSessionToken(): Promise<string | null> {
  return getItem(SESSION_TOKEN_KEY);
}

export async function getSessionCookieName(): Promise<string | null> {
  return getItem(SESSION_COOKIE_KEY);
}

export async function setSession(input: {
  sessionToken: string;
  sessionCookie: string;
}): Promise<void> {
  await setItem(SESSION_TOKEN_KEY, input.sessionToken);
  await setItem(SESSION_COOKIE_KEY, input.sessionCookie);
}

export async function clearSession(): Promise<void> {
  await deleteItem(SESSION_TOKEN_KEY);
  await deleteItem(SESSION_COOKIE_KEY);
}
