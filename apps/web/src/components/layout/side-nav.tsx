import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";
import { getCurrentUser } from "@/server/auth/session";
import { getBillingEntitlement } from "@/server/dal/subscriptions";
import {
  SideNavMenu,
  type SideNavMenuItem,
} from "@/components/layout/side-nav-menu";

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
  const user = await getCurrentUser();
  const billing = user ? await getBillingEntitlement(user.id) : null;
  const showSubscription = billing?.tier !== "pro";

  const items: SideNavMenuItem[] = [
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
      href: "/about",
      label: t("nav.sideAbout"),
      icon: "info",
      preserve: false,
    },
    ...(showSubscription
      ? [
          {
            href: "/pro",
            label: t("nav.subscription"),
            icon: "workspace_premium",
            preserve: false,
          } satisfies SideNavMenuItem,
        ]
      : []),
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
      <div className="flex shrink-0 items-center gap-3 border-b border-surface-variant px-4 py-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container/20 text-primary">
          <span
            className="material-symbols-outlined fill-icon text-2xl"
            aria-hidden="true"
          >
            partly_cloudy_day
          </span>
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "m-0 truncate leading-7 font-semibold text-primary",
              title ? "text-xl" : "text-[22px]",
            )}
          >
            {title ?? t("nav.sideTripPlanner")}
          </p>
          <p className="m-0 truncate text-xs text-on-surface-variant">
            {subtitle ?? t("brand")}
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <SideNavMenu
          active={active}
          items={items}
          menuLabel={t("nav.sideMenuLabel")}
          expandLabel={t("nav.sideMenuExpand")}
          collapseLabel={t("nav.sideMenuCollapse")}
        />
      </Suspense>

      {children && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-3 pb-5">
          {children}
        </div>
      )}
    </nav>
  );
}
