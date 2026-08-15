export type AppColors = {
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceLowest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  accent: string;
  onAccent: string;
  accentContainer: string;
  secondary: string;
  tertiary: string;
  error: string;
  border: string;
};

export const lightColors: AppColors = {
  background: "#FCF8FF",
  surface: "#FCF8FF",
  surfaceContainer: "#F0ECF9",
  surfaceLowest: "#FFFFFF",
  onSurface: "#1B1B24",
  onSurfaceVariant: "#464555",
  outline: "#5F5E6E",
  outlineVariant: "#C7C4D8",
  primary: "#0B7A4A",
  onPrimary: "#FFFFFF",
  primaryContainer: "#34D399",
  accent: "#FFE566",
  onAccent: "#422006",
  accentContainer: "#FACC15",
  secondary: "#006591",
  tertiary: "#38BDF8",
  error: "#BA1A1A",
  border: "rgba(199, 196, 216, 0.35)",
};

export const darkColors: AppColors = {
  background: "#121218",
  surface: "#121218",
  surfaceContainer: "#1E1E27",
  surfaceLowest: "#0E0E14",
  onSurface: "#E8E6F2",
  onSurfaceVariant: "#B4B2C0",
  outline: "#8E8C9C",
  outlineVariant: "#3E3E4A",
  primary: "#34D399",
  onPrimary: "#053B24",
  primaryContainer: "#0B7A4A",
  accent: "#FFE566",
  onAccent: "#422006",
  accentContainer: "#CA8A04",
  secondary: "#5EC8FF",
  tertiary: "#7DD3FC",
  error: "#FFB4AB",
  border: "rgba(62, 62, 74, 0.55)",
};

/** @deprecated Prefer useColors() — kept for modules that still import static light. */
export const colors = lightColors;
