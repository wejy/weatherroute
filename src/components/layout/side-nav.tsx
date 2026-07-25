import Link from "next/link";
import { cn } from "@/lib/utils";

const items = [
  { href: "/map", label: "Destinations", icon: "location_on" },
  { href: "/routes", label: "Route Info", icon: "route" },
  { href: "/trips", label: "Saved", icon: "bookmark" },
  { href: "/login", label: "Settings", icon: "settings" },
];

export function SideNav({
  active,
  children,
  title = "Trip Planner",
  subtitle = "Optimized Routing",
}: {
  active?: string;
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <nav className="fixed top-0 left-0 z-40 hidden h-full w-80 flex-col rounded-r-xl border-r border-outline-variant bg-surface text-on-surface shadow-[0px_10px_30px_rgba(0,0,0,0.08)] lg:flex">
      <div className="flex items-center gap-4 border-b border-surface-variant p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/20 text-primary">
          <span className="material-symbols-outlined fill-icon text-2xl">
            partly_cloudy_day
          </span>
        </div>
        <div>
          <h1 className="m-0 text-[32px] leading-10 font-semibold text-primary">
            {title}
          </h1>
          <p className="m-0 text-base text-on-surface-variant">{subtitle}</p>
        </div>
      </div>

      <ul className="flex flex-col gap-2 overflow-y-auto px-2 py-4">
        {items.map((item) => {
          const isActive = active === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-4 rounded-lg px-4 py-3 transition-all",
                  isActive
                    ? "border-r-4 border-primary bg-primary/5 font-bold text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high",
                )}
              >
                <span
                  className="material-symbols-outlined"
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
        <div className="mt-auto flex flex-grow flex-col border-t border-surface-variant px-6 pt-4 pb-6">
          {children}
        </div>
      )}
    </nav>
  );
}
