import type { Dictionary } from "@/i18n/dictionaries/en";

export function createTranslator(dict: Dictionary) {
  return function t(
    path: string,
    vars?: Record<string, string | number>,
  ): string {
    const parts = path.split(".");
    let cur: unknown = dict;
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in cur) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        return path;
      }
    }
    if (typeof cur !== "string") return path;
    if (!vars) return cur;
    return cur.replace(/\{(\w+)\}/g, (_, key: string) =>
      vars[key] != null ? String(vars[key]) : `{${key}}`,
    );
  };
}

export type Translator = ReturnType<typeof createTranslator>;

export function translateCondition(
  dict: Dictionary,
  condition: keyof Dictionary["conditions"],
): string {
  return dict.conditions[condition] ?? condition;
}
