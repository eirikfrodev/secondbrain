import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    settings: {
      react: { version: "19.2" }
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off"
    }
  },
  globalIgnores([
    "**/.next/**",
    "**/coverage/**",
    "**/node_modules/**",
    "design/reference/**",
    "playwright-report/**",
    "test-results/**"
  ])
]);
