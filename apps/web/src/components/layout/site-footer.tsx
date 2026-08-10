"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/locale-provider";
import { DiscoverQueryLink } from "@/components/discover/discover-query-link";
import { ObfuscatedContactEmail } from "@/components/layout/obfuscated-contact-email";
import { cn } from "@/lib/utils";

const FOOTER_LINKS = [
  { href: "/", labelKey: "nav.discover" as const, preserve: true },
  { href: "/map", labelKey: "nav.map" as const, preserve: true },
  { href: "/routes", labelKey: "nav.routes" as const, preserve: true },
  { href: "/trips", labelKey: "nav.trips" as const, preserve: false },
  { href: "/about", labelKey: "nav.about" as const, preserve: false },
  { href: "/pro", labelKey: "nav.subscription" as const, preserve: false },
  { href: "/settings", labelKey: "nav.sideSettings" as const, preserve: false },
] as const;

const linkClassName =
  "text-sm text-on-surface-variant underline-offset-2 transition-colors hover:text-primary hover:underline";

export function SiteFooter({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <footer
      className={cn(
        "mt-16 border-t border-outline-variant/25 pt-8 pb-2 text-left",
        className,
      )}
    >
      <p className="text-base font-bold tracking-tight text-on-surface">
        {t("footer.brand")}
      </p>
      <ul className="mt-3 space-y-1 text-sm leading-relaxed text-on-surface-variant">
        <li>{t("footer.tagline1")}</li>
        <li>{t("footer.tagline2")}</li>
      </ul>
      <nav className="mt-6" aria-label={t("footer.linksLabel")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {t("footer.linksLabel")}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              {link.preserve ? (
                <DiscoverQueryLink href={link.href} className={linkClassName}>
                  {t(link.labelKey)}
                </DiscoverQueryLink>
              ) : (
                <Link href={link.href} className={linkClassName}>
                  {t(link.labelKey)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-5 text-xs text-on-surface-variant">
        {t("footer.copyright")}
      </p>
      <div className="mt-3">
        <ObfuscatedContactEmail ariaLabel={t("footer.contactAria")} />
      </div>
    </footer>
  );
}
