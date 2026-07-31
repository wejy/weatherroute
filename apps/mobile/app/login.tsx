import { useCallback, useState } from "react";
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

export default function LoginScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sendCode = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError(t("login.errorEmail"));
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await requestOtp(trimmed);
      setStep("code");
      setInfo(t("login.codeSent", { email: trimmed }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError(t("login.errorSend"));
      } else {
        setError(t("login.errorSend"));
      }
    } finally {
      setBusy(false);
    }
  }, [email, t]);

  const verify = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email.trim(), code.trim());
      router.replace("/(tabs)/settings");
    } catch {
      setError(t("login.errorCode"));
    } finally {
      setBusy(false);
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
            editable={step === "email" || !busy}
            style={styles.input}
            placeholder={t("mobile.emailPlaceholder")}
            placeholderTextColor={colors.outline}
          />

          {step === "email" ? (
            <Pressable
              onPress={() => void sendCode()}
              disabled={busy}
              style={[styles.btn, busy && styles.disabled]}
            >
              {busy ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.btnText}>{t("login.sendCode")}</Text>
              )}
            </Pressable>
          ) : (
            <>
              <Text style={styles.label}>{t("login.codeLabel")}</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={colors.outline}
              />
              <Pressable
                onPress={() => void verify()}
                disabled={busy || code.trim().length < 4}
                style={[styles.btn, busy && styles.disabled]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.btnText}>{t("login.verifyCode")}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setStep("email");
                  setCode("");
                  setInfo(null);
                }}
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>{t("login.sendCode")}</Text>
              </Pressable>
            </>
          )}

          {info ? <Text style={styles.info}>{info}</Text> : null}
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
    marginTop: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 16 },
  linkBtn: { alignItems: "center", padding: 12 },
  linkText: { color: colors.secondary, fontWeight: "600" },
  info: { color: colors.primary, fontSize: 14 },
  error: { color: colors.error, fontWeight: "600" },
  disabled: { opacity: 0.55 },
});
