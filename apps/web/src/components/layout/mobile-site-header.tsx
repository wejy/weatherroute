import { Suspense, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { DiscoverQueryLink } from "@/components/discover/discover-query-link";
import { MobileChromeAuth } from "@/components/layout/mobile-chrome-auth";

const HEADER_CLASS =
  "fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/20 bg-surface/90 px-margin-mobile shadow-[0px_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl";

const BRAND_CLASS =
  "group flex min-w-0 items-center gap-2 text-xl font-bold text-primary no-underline hover:cursor-pointer";

/** Mobile-only chrome header (map / routes) — matches TopNav layout metrics. */
export function MobileSiteHeader({
  brand,
  signedIn,
  loginNext,
  settingsLabel,
  signInLabel,
  displayName,
  signedInAsTitle,
  hideFrom,
  srOnlyTitle,
}: {
  brand: string;
  signedIn: boolean;
  loginNext: string;
  settingsLabel: string;
  signInLabel: string;
  displayName?: string;
  signedInAsTitle?: string;
  /** Tailwind breakpoint when this header hides, e.g. `lg:hidden` or `md:hidden`. */
  hideFrom: "md:hidden" | "lg:hidden";
  srOnlyTitle?: ReactNode;
}) {
  return (
    <header className={`${HEADER_CLASS} ${hideFrom}`}>
      <div className="flex min-w-0 items-center">
        <Suspense fallback={null}>
          <DiscoverQueryLink
            href="/"
            data-testid="site-brand"
            className={BRAND_CLASS}
          >
            <span
              className="material-symbols-outlined fill-icon shrink-0 text-3xl transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
              aria-hidden="true"
            >
              partly_cloudy_day
            </span>
            <span className="truncate">{brand}</span>
          </DiscoverQueryLink>
        </Suspense>
        {srOnlyTitle}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitcher />
        <MobileChromeAuth
          signedIn={signedIn}
          loginNext={loginNext}
          settingsLabel={settingsLabel}
          signInLabel={signInLabel}
          displayName={displayName}
          signedInAsTitle={signedInAsTitle}
        />
      </div>
    </header>
  );
}

export { HEADER_CLASS as MOBILE_SITE_HEADER_CLASS, BRAND_CLASS as MOBILE_SITE_BRAND_CLASS };
