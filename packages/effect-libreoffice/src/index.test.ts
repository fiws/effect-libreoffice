import { NodeContext } from "@effect/platform-node";
import { assert, it } from "@effect/vitest";
import { Effect, Layer, Predicate } from "effect";
import { LibreOffice } from "effect-libreoffice";

const TestLive = Layer.mergeAll(LibreOffice.layer, NodeContext.layer);

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

  it.effect(
    "should fail with invalid output extension",
    Effect.fn(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const inputData = new TextEncoder().encode("Hello PDF");

      const result = yield* libre
        .convert(inputData, {
          // @ts-expect-error invalid format test
          outputFormat: "invalidext",
          inputFormat: "txt",
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
