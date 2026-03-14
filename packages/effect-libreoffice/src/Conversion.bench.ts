import { FetchHttpClient } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer, ManagedRuntime } from "effect";
import { bench, describe } from "vitest";
import { LibreOffice } from "./index";

const BenchmarkLive = Layer.mergeAll(
  LibreOffice.layer,
  NodeContext.layer,
  FetchHttpClient.layer,
);

const runtime = ManagedRuntime.make(BenchmarkLive);

const buffer = new TextEncoder().encode("Hello Benchmark PDF");

describe("Conversion Benchmark", () => {
  bench(
    "Convert Buffer to PDF",
    async () => {
      await runtime.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const libreOffice = yield* LibreOffice.LibreOffice;
            yield* libreOffice.convert(buffer, { outputFormat: "pdf" });
          }),
        ),
      );
    },
    { warmupIterations: 10, iterations: 100 },
  );
});
