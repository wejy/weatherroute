import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from "react-native-webview/lib/WebViewTypes";
import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";
import * as LinkingExpo from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useI18n } from "@/lib/i18n";
import { classifyNavigation } from "@/lib/external-urls";
import {
  deepLinkToWebUrl,
  getWebOrigin,
  initialWebUrl,
  LITE_USER_AGENT_SUFFIX,
  webPathUrl,
} from "@/lib/web-origin";

export default function LiteHomeScreen() {
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const webOrigin = useMemo(() => getWebOrigin(), []);
  const [uri, setUri] = useState(() =>
    webOrigin ? initialWebUrl(webOrigin, locale) : "",
  );
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [userAgent, setUserAgent] = useState<string | undefined>();

  useEffect(() => {
    void (async () => {
      // Warm location permission so WebView geolocation can succeed (4.2 + Discover).
      await Location.requestForegroundPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const up = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOffline(!up);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Append product UA so apps/web can detect the lite shell.
    if (Platform.OS === "ios") {
      setUserAgent(
        `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ${LITE_USER_AGENT_SUFFIX}`,
      );
    } else {
      setUserAgent(
        `Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 ${LITE_USER_AGENT_SUFFIX}`,
      );
    }
  }, []);

  const openExternalBrowser = useCallback(
    async (url: string) => {
      if (!webOrigin) return;
      // Prefer auth-session so landing back on /pro closes the browser and returns here.
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        `${webOrigin}/pro`,
      );
      if (result.type === "success" && result.url) {
        setUri(
          result.url.includes("webview=")
            ? result.url
            : `${result.url}${result.url.includes("?") ? "&" : "?"}webview=1`,
        );
      } else {
        setUri(webPathUrl(webOrigin, "/pro", locale));
      }
      setLoadError(false);
    },
    [webOrigin, locale],
  );

  const handleDeepLink = useCallback(
    (url: string) => {
      if (!webOrigin) return;
      const next = deepLinkToWebUrl(webOrigin, url);
      if (next) {
        setUri(next);
        setLoadError(false);
      }
    },
    [webOrigin],
  );

  useEffect(() => {
    void LinkingExpo.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    const sub = LinkingExpo.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });
    return () => sub.remove();
  }, [handleDeepLink]);

  const onShouldStartLoadWithRequest = useCallback(
    (req: ShouldStartLoadRequest) => {
      if (!webOrigin) return false;
      // Allow the initial / iframe-less document loads; only gate top-level navigations.
      if (!req.isTopFrame) return true;
      const decision = classifyNavigation(req.url, webOrigin);
      switch (decision.action) {
        case "allow":
          return true;
        case "cancel":
          return false;
        case "os-link":
          void Linking.openURL(decision.url);
          return false;
        case "external-browser":
          void openExternalBrowser(decision.url);
          return false;
        default:
          return true;
      }
    },
    [webOrigin, openExternalBrowser],
  );

  const onNavChange = useCallback((_nav: WebViewNavigation) => {
    // Reserved for future chrome (e.g. safe-area under opaque headers).
  }, []);

  const onError = useCallback((_e: WebViewErrorEvent) => {
    setLoadError(true);
    setLoading(false);
  }, []);

  const onHttpError = useCallback((e: WebViewHttpErrorEvent) => {
    if (e.nativeEvent.statusCode >= 500) {
      setLoadError(true);
    }
  }, []);

  const retry = useCallback(() => {
    setLoadError(false);
    setOffline(false);
    if (webOrigin) {
      setUri(initialWebUrl(webOrigin, locale));
    }
    webRef.current?.reload();
  }, [webOrigin, locale]);

  if (!webOrigin) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.title}>{t("mobileLite.missingUrlTitle")}</Text>
        <Text style={styles.body}>{t("mobileLite.missingUrlBody")}</Text>
      </View>
    );
  }

  if (offline || loadError) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.title}>
          {offline ? t("mobileLite.offlineTitle") : t("mobileLite.errorTitle")}
        </Text>
        <Text style={styles.body}>
          {offline ? t("mobileLite.offlineBody") : t("mobileLite.errorBody")}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{t("mobileLite.retry")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <WebView
        ref={webRef}
        source={{ uri }}
        style={styles.webview}
        applicationNameForUserAgent={LITE_USER_AGENT_SUFFIX}
        userAgent={userAgent}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        geolocationEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onNavigationStateChange={onNavChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={onError}
        onHttpError={onHttpError}
        {...(Platform.OS === "android"
          ? {
              // Android WebView geo prompt — types omit this prop on some RNW versions.
              onGeolocationPermissionsShowPrompt: (
                origin: string,
                callback: (
                  origin: string,
                  allow: boolean,
                  retain: boolean,
                ) => void,
              ) => {
                void (async () => {
                  const { status } =
                    await Location.requestForegroundPermissionsAsync();
                  callback(
                    origin,
                    status === Location.PermissionStatus.GRANTED,
                    false,
                  );
                })();
              },
            }
          : {})}
      />
      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#3525CD" />
          <Text style={styles.loadingText}>{t("mobileLite.loading")}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FCF8FF" },
  webview: { flex: 1, backgroundColor: "#FCF8FF" },
  center: {
    flex: 1,
    backgroundColor: "#FCF8FF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5c5c5c",
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#3525CD",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(252,248,255,0.72)",
    gap: 10,
  },
  loadingText: { fontSize: 14, color: "#5c5c5c", fontWeight: "600" },
});
