import { NodeContext, NodeRuntime, NodeWorker } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { LibreOffice } from "../index.ts";
import { Worker } from "node:worker_threads";

const tsWorker = (path: string) => {
  const url = new URL(path, import.meta.url);
  return new Worker(url);
};

const TestLive = Layer.mergeAll(LibreOffice.layer).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      NodeContext.layer,
      NodeWorker.layer((_spawn) => tsWorker("./worker-node.ts")),
    ),
  ),
);

NodeRuntime.runMain(
  Effect.gen(function* () {
    const libre = yield* LibreOffice.LibreOffice;
    const inputData = new TextEncoder().encode("Hello PDF");
    const result = yield* libre.convert(inputData, {
      outputFormat: "pdf",
      inputFormat: "txt",
    });

    const header = new TextDecoder().decode(result.data.slice(0, 4));
    console.log(header);
  }).pipe(Effect.provide(TestLive)),
);
