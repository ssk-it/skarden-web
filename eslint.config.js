import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import vue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

// Les règles et leur raison : docs/clean-code.md, section « Outillage ». Elles sont bloquantes : un avertissement que l'on peut fusionner malgré tout devient du bruit.
export default tseslint.config(
  { ignores: ["dist/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: { "no-console": "error" },
  },
  {
    files: ["*.config.*"],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
