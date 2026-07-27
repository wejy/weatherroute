import Link from "next/link";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { DiscoverQueryLink } from "@/components/discover/discover-query-link";

export async function SideNav({
  active,
  children,
  title,
  subtitle,
}: {
  active?: string;
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));
  const items = [
    {
      href: "/",
      label: t("nav.discover"),
      icon: "travel_explore",
      preserve: true,
    },
    {
      href: "/map",
      label: t("nav.sideDestinations"),
      icon: "location_on",
      preserve: true,
    },
    {
      href: "/routes",
      label: t("nav.sideRouteInfo"),
      icon: "route",
      preserve: true,
    },
    {
      href: "/trips",
      label: t("nav.sideSaved"),
      icon: "bookmark",
      preserve: false,
    },
    {
      href: "/settings",
      label: t("nav.sideSettings"),
      icon: "settings",
      preserve: false,
    },
  ];

  return (
    <nav
      data-testid="map-side-nav"
      className="fixed top-0 left-0 z-40 hidden h-full w-96 flex-col rounded-r-xl border-r border-outline-variant bg-surface text-on-surface shadow-[0px_10px_30px_rgba(0,0,0,0.08)] lg:flex"
      aria-label={t("nav.sideTripPlanner")}
    >
      <div className="flex shrink-0 items-center gap-4 border-b border-surface-variant p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-container/20 text-primary">
          <span
            className="material-symbols-outlined fill-icon text-2xl"
            aria-hidden="true"
          >
            partly_cloudy_day
          </span>
        </div>
        <div className="min-w-0">
          <p className="m-0 text-[28px] leading-8 font-semibold text-primary">
            {title ?? t("nav.sideTripPlanner")}
          </p>
          <p className="m-0 text-sm text-on-surface-variant">
            {subtitle ?? t("brand")}
          </p>
        </div>
      </div>

      {/* Nav stays fully visible; destinations (children) scroll in remaining space */}
      <ul className="flex shrink-0 flex-col gap-1 px-2 py-3">
        <Suspense fallback={null}>
          {items.map((item) => {
            const isActive = active === item.href;
            const className = cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-4 py-2.5 transition-colors",
              isActive
                ? "border-r-4 border-primary bg-primary/5 font-bold text-primary"
                : "text-on-surface-variant hover:bg-surface-container-high",
            );
            const content = (
              <>
                <span
                  className="material-symbols-outlined shrink-0"
                  aria-hidden="true"
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {item.icon}
                </span>
                <span className="text-lg font-semibold">{item.label}</span>
              </>
            );
            return (
              <li key={item.href}>
                {item.preserve ? (
                  <DiscoverQueryLink
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={className}
                  >
                    {content}
                  </DiscoverQueryLink>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={className}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </Suspense>
      </ul>

      {children && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-surface-variant px-5 pt-3 pb-5">
          {children}
        </div>
      )}
    </nav>
  );
}
