import { Suspense } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { DiscoverQueryLink } from "@/components/discover/discover-query-link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { getCurrentUser } from "@/server/auth/session";

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
  const user = await getCurrentUser();
  const links = [
    { href: "/", label: t("nav.discover") },
    { href: "/map", label: t("nav.map") },
    { href: "/routes", label: t("nav.routes") },
    { href: "/trips", label: t("nav.trips") },
    { href: "/about", label: t("nav.about") },
  ];
  const loginHref = `/login?next=${encodeURIComponent(active && active !== "/login" ? active : "/settings")}`;

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

      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        {user ? (
          <Link
            href="/settings"
            aria-label={t("nav.accountMenu")}
            title={t("nav.signedInAs", { name: user.displayName })}
            aria-current={active === "/settings" ? "page" : undefined}
            data-testid="nav-account"
            className={cn(
              "flex h-11 max-w-[12rem] items-center gap-2 rounded-full border px-2.5 shadow-sm transition-colors sm:px-3",
              active === "/settings"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-primary/25 bg-primary/5 text-on-surface hover:bg-primary/10 hover:text-primary",
            )}
          >
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <span
                className="material-symbols-outlined fill-icon text-[28px] text-primary"
                aria-hidden="true"
              >
                account_circle
              </span>
              <span
                className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-secondary"
                aria-hidden="true"
              />
            </span>
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="truncate text-xs font-semibold text-on-surface">
                {user.displayName}
              </span>
              <span className="text-[10px] font-medium text-secondary">
                {t("nav.sideSettings")}
              </span>
            </span>
            <span
              className="material-symbols-outlined hidden text-[20px] text-on-surface-variant sm:inline"
              aria-hidden="true"
            >
              settings
            </span>
          </Link>
        ) : (
          <Link
            href={loginHref}
            data-testid="nav-sign-in"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            {t("nav.signIn")}
          </Link>
        )}
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
