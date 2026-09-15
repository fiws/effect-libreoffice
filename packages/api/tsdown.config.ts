import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  deps: {
    neverBundle: true,
  },
  exports: true,
  dts: true,
});
