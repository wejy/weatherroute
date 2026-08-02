import { Suspense } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { DiscoverQueryLink } from "@/components/discover/discover-query-link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";

function NavLinks({
  active,
  links,
  brand,
}: {
  active?: string;
  links: Array<{ href: string; label: string }>;
  brand: string;
}) {
  return (
    <nav
      data-testid="top-nav-links"
      className="hidden items-center gap-8 md:flex"
      aria-label={brand}
    >
      {links.map((link) => {
        const preserve =
          link.href === "/" || link.href === "/map" || link.href === "/routes";
        const className = cn(
          "relative py-1 text-xl font-semibold transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100",
          active === link.href
            ? "text-primary after:scale-x-100"
            : "text-on-surface-variant hover:text-primary-container",
        );
        if (preserve) {
          return (
            <DiscoverQueryLink
              key={link.href}
              href={link.href}
              aria-current={active === link.href ? "page" : undefined}
              className={className}
            >
              {link.label}
            </DiscoverQueryLink>
          );
        }
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active === link.href ? "page" : undefined}
            className={className}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export async function TopNav({ active }: { active?: string }) {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const links = [
    { href: "/", label: t("nav.discover") },
    { href: "/map", label: t("nav.map") },
    { href: "/routes", label: t("nav.routes") },
    { href: "/trips", label: t("nav.trips") },
  ];

  return (
    <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/20 bg-surface/90 px-margin-mobile shadow-[0px_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 md:px-margin-desktop">
      <Suspense fallback={null}>
        <DiscoverQueryLink
          href="/"
          data-testid="site-brand"
          className="group flex items-center gap-2 text-xl font-bold text-primary md:text-[32px] md:leading-10"
        >
          <span
            className="material-symbols-outlined fill-icon text-3xl transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
            aria-hidden="true"
          >
            partly_cloudy_day
          </span>
          {t("brand")}
        </DiscoverQueryLink>
      </Suspense>

      <Suspense fallback={null}>
        <NavLinks active={active} links={links} brand={t("brand")} />
      </Suspense>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <Link
          href="/settings"
          aria-label={t("nav.sideSettings")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-low text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container hover:text-primary-container"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">
            settings
          </span>
        </Link>
      </div>
    </header>
  );
}

export async function BottomNav({ active }: { active?: string }) {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const items = [
    { href: "/", label: t("nav.discover"), icon: "travel_explore" },
    { href: "/map", label: t("nav.map"), icon: "map" },
    { href: "/routes", label: t("nav.plan"), icon: "edit_calendar" },
    { href: "/trips", label: t("nav.trips"), icon: "bookmark" },
  ];

  return (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-xl bg-surface/95 px-2 pt-2 pb-4 shadow-[0px_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl lg:hidden"
      aria-label={t("brand")}
    >
      <Suspense fallback={null}>
        {items.map((item) => {
          const isActive = active === item.href;
          const preserve =
            item.href === "/" || item.href === "/map" || item.href === "/routes";
          const className = cn(
            "flex min-h-11 min-w-14 flex-col items-center justify-center px-2 py-1 transition-colors",
            isActive
              ? "rounded-full bg-primary-container/20 text-primary"
              : "text-on-surface-variant hover:text-primary",
          );
          const content = (
            <>
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={
                  isActive ? { fontVariationSettings: "'FILL' 1" } : undefined
                }
              >
                {item.icon}
              </span>
              <span className="mt-1 text-xs font-medium">{item.label}</span>
            </>
          );
          if (preserve) {
            return (
              <DiscoverQueryLink
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={className}
              >
                {content}
              </DiscoverQueryLink>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </Suspense>
    </nav>
  );
}
