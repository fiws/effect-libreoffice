import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    node: "src/node.ts",
    "wasm/worker-node": "src/wasm/worker-node.ts",
  },
  deps: {
    neverBundle: true,
  },
  exports: true,
  dts: true,
  define: {
    "import.meta.vitest": "undefined",
  },
});
