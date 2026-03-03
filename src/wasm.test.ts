import { NodeContext } from "@effect/platform-node";
import { assert, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { LibreOfficeWasm, layer as wasmLayer } from "./wasm";

const TestLive = Layer.provideMerge(wasmLayer, NodeContext.layer);

it.layer(TestLive)("Wasm", (it) => {
  it.effect(
    "should convert a file",
    Effect.fn(function* () {
      const convert = yield* LibreOfficeWasm;
      const result = yield* convert.convert(
        new TextEncoder().encode("Hello PDF"),
        { outputFormat: "pdf" },
      );

      assert.strictEqual(result.mimeType, "application/pdf");
    }),
  );

  it.effect(
    "should get page count",
    Effect.fn(function* () {
      const convert = yield* LibreOfficeWasm;
      const result = yield* convert.getPageCount(
        new TextEncoder().encode("Hello PDF"),
        { inputFormat: "txt" },
      );

      assert.strictEqual(typeof result, "number");
      assert.strictEqual(result, 1);
    }),
  );

  it.effect(
    "should get document info",
    Effect.fn(function* () {
      const convert = yield* LibreOfficeWasm;
      const result = yield* convert.getDocumentInfo(
        new TextEncoder().encode("Hello PDF"),
        { inputFormat: "txt" },
      );

      assert.strictEqual(typeof result.documentTypeName, "string");
    }),
  );
});
