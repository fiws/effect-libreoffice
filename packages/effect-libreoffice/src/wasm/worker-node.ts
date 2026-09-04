import { NodeRuntime, NodeWorkerRunner } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { RpcServer } from "effect/unstable/rpc";
import { layerWorker } from "./worker.ts";

const runner = layerWorker.pipe(
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(NodeWorkerRunner.layer),
);

Layer.launch(runner).pipe(
  Effect.ensuring(Effect.promise(() => process.exit(0))),
  NodeRuntime.runMain,
);
