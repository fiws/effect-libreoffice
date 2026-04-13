import { NodeContext, NodeWorker } from "@effect/platform-node";
import { assert, it } from "@effect/vitest";
import { Effect, Layer, Predicate } from "effect";
import { LibreOffice } from "effect-libreoffice";
// import * as CP from "node:child_process";
import { Worker } from "node:worker_threads";

const tsWorker = (path: string) => {
  const url = new URL(path, import.meta.url);
  return new Worker(url);
};

const TestLive = Layer.mergeAll(LibreOffice.layer).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      NodeContext.layer,
      NodeWorker.layer((_spawn) => tsWorker("./wasm/worker-node.ts")),
    ),
  ),
);

it.layer(TestLive)("Libreoffice (Default)", (it) => {
  it.effect(
    "should convert a document",
    Effect.fn(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const inputData = new TextEncoder().encode("Hello PDF");
      const result = yield* libre.convert(inputData, {
        outputFormat: "pdf",
        inputFormat: "txt",
      });

      const header = new TextDecoder().decode(result.data.slice(0, 4));
      assert.strictEqual(header, "%PDF");
    }),
  );

  it.effect(
    "Should work with 2 conversions in parallel",
    Effect.fn(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const inputData = new TextEncoder().encode("Hello PDF");

      const [res1, res2] = yield* Effect.all(
        [
          libre.convert(inputData, { outputFormat: "pdf", inputFormat: "txt" }),
          libre.convert(inputData, { outputFormat: "pdf", inputFormat: "txt" }),
        ],
        { concurrency: "unbounded" },
      );

      const header1 = new TextDecoder().decode(res1.data.slice(0, 4));
      const header2 = new TextDecoder().decode(res2.data.slice(0, 4));
      assert.strictEqual(header1, "%PDF");
      assert.strictEqual(header2, "%PDF");
    }),
  );

  // don't know how to make it fail yet..
  it.effect.skip(
    "should fail with invalid input format",
    Effect.fn(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const inputData = new TextEncoder().encode("Hello PDF");

      const result = yield* libre
        .convert(inputData, {
          outputFormat: "png",
          inputFormat: "pptx",
        })
        .pipe(Effect.flip);

      assert(
        Predicate.isTagged(result, "LibreOfficeError"),
        "result is not LibreOfficeError",
      );
      assert.strictEqual(result.code, "CONVERSION_FAILED");
    }),
  );
});
