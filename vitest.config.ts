import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts"],
    includeSource: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
    alias: {
      "effect-libreoffice": "packages/effect-libreoffice/src/index.ts",
      "@effect-libreoffice/api": "packages/api/src/index.ts",
    },
    testTimeout: 10_000,
  },
});
