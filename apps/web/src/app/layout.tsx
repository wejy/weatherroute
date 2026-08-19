import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SkipLink } from "@/components/a11y/skip-link";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { ConsentRoot } from "@/components/consent/consent-root";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import {
  parseThemePreference,
  THEME_BOOT_SCRIPT,
  THEME_COOKIE,
} from "@/lib/theme";
import {
  CONSENT_COOKIE,
  CONSENT_MODE_DEFAULT_SCRIPT,
  parseConsentCookie,
} from "@/lib/consent";
import { isGoogleAnalyticsEnabled } from "@/lib/analytics";
import { getSiteUrl } from "@/lib/site-url";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const site = getSiteUrl();
  const description = dict.meta.pages.home || dict.meta.description;

  return {
    metadataBase: new URL(site),
    title: {
      default: dict.meta.titleDefault,
      template: dict.meta.titleTemplate,
    },
    description,
    keywords: dict.meta.keywords,
    applicationName: dict.brand,
    authors: [{ name: "Whitefield Ltd" }],
    creator: "Whitefield Ltd",
    publisher: "Whitefield Ltd",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: "website",
      siteName: dict.meta.ogSiteName,
      title: dict.meta.titleDefault,
      description,
      url: site,
      locale: locale === "fi" ? "fi_FI" : "en_GB",
      alternateLocale: locale === "fi" ? ["en_GB"] : ["fi_FI"],
      images: [
        {
          url: "/icon.png",
          width: 512,
          height: 512,
          alt: dict.brand,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: dict.meta.titleDefault,
      description,
      images: ["/icon.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
      apple: "/icon.png",
    },
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
  const initialConsent = parseConsentCookie(jar.get(CONSENT_COOKIE)?.value);
  const gaEnabled = isGoogleAnalyticsEnabled();

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Allowlisted via CSP sha256 of THEME_BOOT_SCRIPT — no React nonce (avoids hydration mismatch). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {gaEnabled ? (
          <script
            dangerouslySetInnerHTML={{ __html: CONSENT_MODE_DEFAULT_SCRIPT }}
          />
        ) : null}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-on-surface">
        <SiteJsonLd name={dict.brand} description={dict.meta.description} />
        <ThemeProvider initialPreference={themePreference}>
          <LocaleProvider locale={locale} dict={dict}>
            <ConsentRoot initialConsent={initialConsent}>
              <SkipLink />
              {children}
            </ConsentRoot>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
