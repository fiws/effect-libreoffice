import { Worker } from "node:worker_threads";
import { NodeWorker } from "@effect/platform-node";
import { Layer } from "effect";
import { layer } from "./wasm/layer";

function nodeWorker() {
  return new Worker(
    new URL(
      import.meta.url.endsWith(".ts")
        ? "./wasm/worker-node.ts"
        : "./wasm/worker-node.mjs",
      import.meta.url,
    ),
  );
}

/**
 * Node.js implementation of the LibreOffice service.
 */
export const LibreOfficeNode = {
  layer: layer.pipe(Layer.provide(NodeWorker.layer(nodeWorker))),
};
