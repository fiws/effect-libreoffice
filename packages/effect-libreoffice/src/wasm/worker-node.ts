import { NodeRuntime, NodeWorkerRunner } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { WorkerLive } from "./worker.ts";

const runner = WorkerLive.pipe(Layer.provide(NodeWorkerRunner.layer));

NodeRuntime.runMain(
  NodeWorkerRunner.launch(runner).pipe(
    Effect.ensuring(Effect.sync(() => process.exit(0))),
  ),
);
