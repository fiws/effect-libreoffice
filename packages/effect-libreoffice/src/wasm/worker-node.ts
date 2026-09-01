import { NodeRuntime, NodeWorkerRunner } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { layerWorker } from "./worker.ts";

const runner = layerWorker.pipe(Layer.provide(NodeWorkerRunner.layer));

NodeRuntime.runMain(
  NodeWorkerRunner.launch(runner).pipe(
    Effect.ensuring(Effect.promise(() => process.exit(0))),
  ),
);
