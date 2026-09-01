import { Worker } from "node:worker_threads";
import { NodeWorker } from "@effect/platform-node";
import { Layer } from "effect";
import { layer } from "./wasm/layer";

function nodeWorker() {
  return new Worker(new URL("./wasm/worker-node.ts", import.meta.url));
}

/**
 * Node.js implementation of the LibreOffice service.
 */
export const LibreOfficeNode = {
  layer: layer.pipe(Layer.provide(NodeWorker.layer(nodeWorker))),
};
