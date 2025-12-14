import * as fs from "node:fs";
import path from "node:path";
import { NodeContext, NodeHttpClient } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Bench } from "tinybench";
import { LibreOffice } from "./index";
import { UnoClient, UnoServer } from "./uno";

const bench = new Bench({ time: 5000 }); // Run for 5 seconds

// Setup paths
const fixturesDir = path.resolve(__dirname, "../fixtures");
const outputDir = path.resolve(__dirname, "../tmp/benchmark");
const inputFile = path.join(fixturesDir, "test.txt");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Ensure input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

// Setup shared volume for Uno
const sharedDir = "/tmp/test-convert";
const sharedInputFile = path.join(sharedDir, "test.txt");
if (!fs.existsSync(sharedDir)) {
  console.error(`Shared directory not found: ${sharedDir}`);
  process.exit(1);
}
fs.copyFileSync(inputFile, sharedInputFile);

const outputDefault = path.join(outputDir, "output_default.pdf");
const outputUno = path.join(sharedDir, "output_uno.pdf");

// 1. Default Implementation (CLI)
// Needs: NodeContext (for FileSystem, Path)
// AND the resulting effect needs CommandExecutor which comes from NodeContext
const DefaultEnv = LibreOffice.Default.pipe(
  Layer.provideMerge(NodeContext.layer),
);

const runDefault = Effect.gen(function* () {
  const lo = yield* LibreOffice;
  yield* lo.convertLocalFile(inputFile, outputDefault);
}).pipe(Effect.provide(DefaultEnv));

// 2. Uno Implementation (Remote)
// Needs: UnoClient, UnoServer.Remote, NodeContext, NodeHttpClient
const UnoEnv = LibreOffice.Uno.pipe(
  Layer.provide(UnoClient.Default),
  Layer.provide(UnoServer.Remote),
  Layer.provideMerge(NodeHttpClient.layer),
  Layer.provideMerge(NodeContext.layer),
);

const runUno = Effect.gen(function* () {
  const lo = yield* LibreOffice;
  yield* lo.convertLocalFile(sharedInputFile, outputUno);
}).pipe(Effect.provide(UnoEnv));

const runUnoParallel = Effect.gen(function* () {
  const lo = yield* LibreOffice;
  yield* Effect.all(
    Array.from({ length: 6 }, (_, i) =>
      lo.convertLocalFile(
        sharedInputFile,
        path.join(sharedDir, `output_uno_p${i}.pdf`),
      ),
    ),
    { concurrency: "unbounded" },
  );
}).pipe(Effect.provide(UnoEnv));

const main = async () => {
  console.log("Starting benchmark...");
  console.log(`Input: ${inputFile}`);
  console.log("Warming up...");

  // Verify they work first to avoid silent failures in bench
  try {
    await Effect.runPromise(runDefault);
    console.log("Default implementation verified.");
  } catch (e) {
    console.error("Default implementation failed:", e);
    process.exit(1);
  }

  try {
    await Effect.runPromise(runUno);
    console.log("Uno implementation verified.");
  } catch (e) {
    console.error("Uno implementation failed:", e);
    process.exit(1);
  }

  bench
    .add("Default (CLI)", async () => {
      await Effect.runPromise(runDefault);
    })
    .add("Uno (Remote)", async () => {
      await Effect.runPromise(runUno);
    })
    .add("Uno (Remote) - Parallel", async () => {
      await Effect.runPromise(runUnoParallel);
    });

  console.log("Running benchmark...");
  await bench.run();

  console.table(bench.table());
};

main().catch(console.error);
