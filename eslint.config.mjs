// @ts-check
/**
 * Helios — ESLint flat config (kök, tüm workspace'ler paylaşır).
 *
 * AUDIT 2026-05-31 §3.6 — `next lint` Next.js 16'da kaldırıldı, ESLint
 * doğrudan kullanılır. Bu config ESLint 9 + flat config tabanlıdır.
 *
 * Plugin uyumu (peer deps canlı kontrol edildi 2026-05-31):
 *   - eslint 9.39.4 (10.x bekliyor: eslint-plugin-react henüz desteklemiyor)
 *   - typescript-eslint 8.60.0
 *   - eslint-plugin-react 7.37.5, eslint-plugin-react-hooks 7.1.1
 *   - eslint-plugin-jsx-a11y 6.10.2, eslint-plugin-import-x 4.16.2
 *   - @next/eslint-plugin-next 16.2.6 (apps/web için override)
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importX from "eslint-plugin-import-x";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  // ============================================================
  // Ignore patterns (eski .eslintignore yerine)
  // ============================================================
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/coverage/**",
      "**/target/**",
      "**/*.config.{js,mjs,cjs,ts,mts,cts}",
      "**/next-env.d.ts",
      "tasarim/**",
      // PROMPT 31 — Service worker dosyası tsconfig projeSi'ne dahil değil;
      // tarayıcı runtime'ı (DedicatedWorkerGlobalScope-ish). ESLint typed
      // lint'i atlasın.
      "apps/web/public/sw.js",
    ],
  },

  // ============================================================
  // Base — JS + TS (typed) tüm workspace'ler için
  // ============================================================
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node, ...globals.es2023 },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver": {
        typescript: { alwaysTryTypes: true },
        node: true,
      },
    },
    rules: {
      // unused
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // no any
      "@typescript-eslint/no-explicit-any": "error",
      // type imports — verbatimModuleSyntax ile uyumlu
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // import sıralama
      // PROMPT 28 fix: `@/` alias'ı "internal" grubuna sabitle ki standalone
      // `eslint .` ile lint-staged pre-commit aynı sırayı üretsin (3 sticky
      // import-order warning kalıcı kapanır).
      "import-x/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          pathGroups: [{ pattern: "@/**", group: "internal", position: "before" }],
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],
      "import-x/no-duplicates": "error",
      "import-x/no-cycle": ["warn", { maxDepth: 5 }],
    },
  },

  // ============================================================
  // React/JSX (tsx dosyaları) — packages/ui + apps/web
  // ============================================================
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react/prop-types": "off", // TS karşılıyor
    },
  },

  // ============================================================
  // apps/web — Next.js spesifik override
  // ============================================================
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // ============================================================
  // Test dosyaları — daha gevşek
  // ============================================================
  {
    files: ["**/*.{test,spec}.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // ============================================================
  // Prettier — çakışan stil kurallarını kapat (SON sırada olmalı)
  // ============================================================
  prettierConfig,
);
