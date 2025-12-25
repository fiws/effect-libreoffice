import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    includeSource: ["src/**/*.ts"],
    alias: {
      "effect-libreoffice": "src/index.ts",
    },
  },
});
