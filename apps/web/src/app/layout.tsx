import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SkipLink } from "@/components/a11y/skip-link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import {
  parseThemePreference,
  THEME_BOOT_SCRIPT,
  THEME_COOKIE,
} from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: {
      default: dict.meta.titleDefault,
      template: dict.meta.titleTemplate,
    },
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const jar = await cookies();
  const themePreference = parseThemePreference(
    jar.get(THEME_COOKIE)?.value,
  );

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-on-surface">
        <ThemeProvider initialPreference={themePreference}>
          <LocaleProvider locale={locale} dict={dict}>
            <SkipLink />
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
