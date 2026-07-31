import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useI18n } from "@/lib/i18n";
import { apiGet, ApiError } from "@/lib/api";
import { colors } from "@/constants/Colors";
import type { PlaceDto } from "@/lib/types";

type PlaceAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceDto | null) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  proximity?: { lat: number; lon: number } | null;
  editable?: boolean;
  /** When true, treat current value as an already-chosen place (skip autocomplete fetch). */
  selected?: boolean;
  /** Optional trailing control (e.g. locate button). */
  trailing?: ReactNode;
  inputStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Mapbox/Open-Meteo place search via `/api/search` — same backend as web PlaceAutocomplete.
 */
export function PlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  accessibilityLabel,
  proximity,
  editable = true,
  selected = false,
  trailing,
  inputStyle,
  containerStyle,
}: PlaceAutocompleteProps) {
  const { t, locale } = useI18n();
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const selectedLabelRef = useRef<string | null>(null);
  const [results, setResults] = useState<PlaceDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const runSearch = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setSearching(false);
        setSearchError(null);
        setOpen(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;
      setSearching(true);
      setSearchError(null);

      try {
        const data = await apiGet<{ results?: PlaceDto[] }>(
          "/api/search",
          {
            q: trimmed,
            limit: 8,
            mode: "precise",
            lang: locale === "fi" ? "fi" : "en",
            proximityLat: proximity?.lat,
            proximityLon: proximity?.lon,
          },
          { signal: controller.signal },
        );
        if (requestId !== requestIdRef.current) return;
        const next = data.results?.slice(0, 8) ?? [];
        setResults(next);
        setOpen(next.length > 0);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (requestId !== requestIdRef.current) return;
        setResults([]);
        setOpen(false);
        if (err instanceof Error && err.message === "MISSING_API_URL") {
          setSearchError(t("mobile.apiMissing"));
        } else if (err instanceof Error && err.message === "NETWORK") {
          setSearchError(t("mobile.networkError"));
        } else if (err instanceof ApiError) {
          setSearchError(t("mobile.errorGeneric"));
        } else {
          setSearchError(t("mobile.errorGeneric"));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setSearching(false);
        }
      }
    },
    [locale, proximity, t],
  );

  useEffect(() => {
    if (selected) {
      selectedLabelRef.current = value;
      setResults([]);
      setOpen(false);
      setSearching(false);
      setSearchError(null);
      return;
    }
    if (selectedLabelRef.current && value === selectedLabelRef.current) {
      return;
    }
    const id = setTimeout(() => {
      void runSearch(value);
    }, 280);
    return () => clearTimeout(id);
  }, [value, runSearch, selected]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function selectPlace(place: PlaceDto) {
    selectedLabelRef.current = place.placeName;
    onChange(place.placeName);
    onPlaceSelect(place);
    setResults([]);
    setOpen(false);
    setSearchError(null);
    setSearching(false);
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={(next) => {
            selectedLabelRef.current = null;
            onChange(next);
            onPlaceSelect(null);
            setOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={placeholder ?? t("location.placeholder")}
          placeholderTextColor={colors.outline}
          accessibilityLabel={
            accessibilityLabel ?? placeholder ?? t("location.placeholder")
          }
          style={[styles.input, inputStyle]}
          autoCorrect={false}
          autoCapitalize="words"
          editable={editable}
        />
        {searching ? (
          <ActivityIndicator
            color={colors.primary}
            style={[
              styles.searchSpinner,
              !trailing && styles.searchSpinnerSolo,
            ]}
          />
        ) : null}
        {trailing}
      </View>

      {searchError ? (
        <Text style={styles.error} accessibilityRole="alert">
          {searchError}
        </Text>
      ) : null}

      {open && (searching || results.length > 0) ? (
        <View style={styles.suggestions}>
          {searching && results.length === 0 ? (
            <Text style={styles.suggestionHint}>{t("search.searching")}</Text>
          ) : (
            results.map((place) => (
              <Pressable
                key={place.id}
                onPress={() => selectPlace(place)}
                style={styles.suggestion}
              >
                <FontAwesome
                  name="map-marker"
                  size={14}
                  color={colors.secondary}
                  style={{ marginTop: 2 }}
                />
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionTitle}>{place.name}</Text>
                  <Text style={styles.suggestionSub}>{place.placeName}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: "600",
    color: colors.onSurface,
  },
  searchSpinner: { marginRight: 4 },
  searchSpinnerSolo: { position: "absolute", right: 14 },
  suggestions: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLowest,
    overflow: "hidden",
    zIndex: 20,
    elevation: 4,
  },
  suggestion: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  suggestionTextWrap: { flex: 1, gap: 2 },
  suggestionTitle: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
  },
  suggestionSub: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  suggestionHint: {
    padding: 12,
    color: colors.onSurfaceVariant,
    fontSize: 14,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
  },
});
