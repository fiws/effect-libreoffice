import { defineConfig } from "tsdown";

export default defineConfig({
  exports: true,
  dts: true,
  define: {
    "import.meta.vitest": "undefined",
  },
});
