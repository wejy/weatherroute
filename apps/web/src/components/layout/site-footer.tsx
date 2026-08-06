"use client";

import { useI18n } from "@/components/i18n/locale-provider";
import { ObfuscatedContactEmail } from "@/components/layout/obfuscated-contact-email";
import { cn } from "@/lib/utils";

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
        <li>{t("footer.taglineEn1")}</li>
        <li>{t("footer.taglineEn2")}</li>
        <li>{t("footer.taglineFi1")}</li>
        <li>{t("footer.taglineFi2")}</li>
      </ul>
      <p className="mt-5 text-xs text-on-surface-variant">
        {t("footer.copyright")}
      </p>
      <div className="mt-3">
        <ObfuscatedContactEmail ariaLabel={t("footer.contactAria")} />
      </div>
    </footer>
  );
}
