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
    testTimeout: 60_000,
    hookTimeout: 30_000,
    // ci is slow
    fileParallelism: !process.env.CI,
    sequence: {
      // very slow
      concurrent: !process.env.CI,
    },
  },
});
