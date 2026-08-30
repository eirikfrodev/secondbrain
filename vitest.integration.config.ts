import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@utsikt/domain": fileURLToPath(new URL("./packages/domain/src/index.ts", import.meta.url)),
      "@utsikt/testing": fileURLToPath(new URL("./packages/testing/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts", "packages/**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    passWithNoTests: true
  }
});
