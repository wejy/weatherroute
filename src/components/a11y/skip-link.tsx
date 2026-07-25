import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { createTranslator } from "@/i18n/translate";

export async function SkipLink() {
  const locale = await getLocale();
  const t = createTranslator(getDictionary(locale));

  return (
    <a href="#main-content" className="skip-link">
      {t("a11y.skipToContent")}
    </a>
  );
}
