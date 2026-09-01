import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "effect-libreoffice/node": "packages/effect-libreoffice/src/node.ts",
      "effect-libreoffice": "packages/effect-libreoffice/src/index.ts",
      "@effect-libreoffice/api": "packages/api/src/index.ts",
    },
    testTimeout: 60_000,
    hookTimeout: 30_000,
    fileParallelism: !process.env.CI,
    sequence: {
      concurrent: !process.env.CI,
    },
    exclude: ["context", "**/node_modules/**", "**/.git/**"],
  },
});
