import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { ApiError } from "@/lib/api";
import { requestOtp, verifyOtp } from "@/lib/session";
import { colors } from "@/constants/Colors";

const COOLDOWN_MS = 30_000;

export default function LoginScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const secondsLeft = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  }, [cooldownUntil, now]);

  const emailNormalized = email.trim().toLowerCase();
  const showVerify = Boolean(sentEmail);
  const sameEmailOnCooldown =
    Boolean(sentEmail) &&
    emailNormalized === sentEmail &&
    secondsLeft > 0;
  const sendDisabled = busy != null || sameEmailOnCooldown;

  const sendLabel = sameEmailOnCooldown
    ? t("login.sendCodeWait", { seconds: secondsLeft })
    : showVerify
      ? t("login.sendCodeAgain")
      : t("login.sendCode");

  const sendCode = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError(t("login.errorEmail"));
      return;
    }
    setBusy("send");
    setError(null);
    try {
      await requestOtp(trimmed);
      const normalized = trimmed.toLowerCase();
      setSentEmail(normalized);
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setCode("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError(t("login.errorSend"));
      } else {
        setError(t("login.errorSend"));
      }
    } finally {
      setBusy(null);
    }
  }, [email, t]);

  const verify = useCallback(async () => {
    setBusy("verify");
    setError(null);
    try {
      await verifyOtp(email.trim(), code.trim());
      router.replace("/(tabs)/settings");
    } catch {
      setError(t("login.errorCode"));
    } finally {
      setBusy(null);
    }
  }, [code, email, router, t]);

  return (
    <>
      <Stack.Screen options={{ title: t("login.title") }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.welcome}>{t("login.welcome")}</Text>
          <Text style={styles.hint}>{t("login.otpHint")}</Text>

          <Text style={styles.label}>{t("login.emailLabel")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={busy == null}
            style={styles.input}
            placeholder={t("mobile.emailPlaceholder")}
            placeholderTextColor={colors.outline}
          />

          <Pressable
            onPress={() => void sendCode()}
            disabled={sendDisabled}
            style={[styles.btn, sendDisabled && styles.disabled]}
          >
            {busy === "send" ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.btnText}>{sendLabel}</Text>
            )}
          </Pressable>
          {sameEmailOnCooldown ? (
            <Text style={styles.hintSmall}>{t("login.changeEmailHint")}</Text>
          ) : null}

          {showVerify ? (
            <View style={styles.verifyBlock}>
              <Text style={styles.info}>
                {t("login.codeSent", { email: sentEmail || email })}
              </Text>
              <Text style={styles.label}>{t("login.codeLabel")}</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                editable={busy == null}
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={colors.outline}
              />
              <Pressable
                onPress={() => void verify()}
                disabled={busy != null || code.trim().length < 4}
                style={[
                  styles.btn,
                  (busy != null || code.trim().length < 4) && styles.disabled,
                ]}
              >
                {busy === "verify" ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.btnText}>{t("login.verifyCode")}</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 12 },
  welcome: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.onSurface,
  },
  hint: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 8,
  },
  hintSmall: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLowest,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: "600",
    color: colors.onSurface,
  },
  btn: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 16 },
  verifyBlock: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  info: { color: colors.primary, fontSize: 14, lineHeight: 20 },
  error: { color: colors.error, fontWeight: "600" },
  disabled: { opacity: 0.55 },
});
