# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Monorepo dual-platform + i18n (required)

This app is part of Solviax. Root rules in `/AGENTS.md` and `.cursor/rules/dual-platform-i18n.mdc` always apply:

- Update **Finnish and English** in `packages/i18n` (`en.ts` + `fi.ts`) together.
- Mirror user-facing changes in **`apps/web` and `apps/mobile`** unless platform-specific.
- Import copy from `@solviax/i18n` — do not hardcode UI strings.
