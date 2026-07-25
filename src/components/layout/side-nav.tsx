import Link from "next/link";
import { cn } from "@/lib/utils";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";

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
    { href: "/map", label: t("nav.sideDestinations"), icon: "location_on" },
    { href: "/routes", label: t("nav.sideRouteInfo"), icon: "route" },
    { href: "/trips", label: t("nav.sideSaved"), icon: "bookmark" },
    { href: "/login", label: t("nav.sideSettings"), icon: "settings" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 z-40 hidden h-full w-80 flex-col rounded-r-xl border-r border-outline-variant bg-surface text-on-surface shadow-[0px_10px_30px_rgba(0,0,0,0.08)] lg:flex"
      aria-label={t("nav.sideTripPlanner")}
    >
      <div className="flex items-center gap-4 border-b border-surface-variant p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/20 text-primary">
          <span
            className="material-symbols-outlined fill-icon text-2xl"
            aria-hidden="true"
          >
            partly_cloudy_day
          </span>
        </div>
        <div>
          <p className="m-0 text-[32px] leading-10 font-semibold text-primary">
            {title ?? t("nav.sideTripPlanner")}
          </p>
          <p className="m-0 text-base text-on-surface-variant">
            {subtitle ?? t("brand")}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2 overflow-y-auto px-2 py-4">
        {items.map((item) => {
          const isActive = active === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-4 rounded-lg px-4 py-3 transition-colors",
                  isActive
                    ? "border-r-4 border-primary bg-primary/5 font-bold text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high",
                )}
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {item.icon}
                </span>
                <span className="text-xl font-semibold">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {children && (
        <div className="mt-auto flex min-h-0 flex-grow flex-col overflow-hidden border-t border-surface-variant px-6 pt-4 pb-6">
          {children}
        </div>
      )}
    </nav>
  );
}
