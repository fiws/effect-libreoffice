import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { NodeContext, NodeHttpClient } from "@effect/platform-node";
import { Effect, Exit, Layer, Scope } from "effect";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, bench } from "vitest";
import { LibreOffice } from "./index";
import { testRunning, UnoClient, UnoServer } from "./uno/uno";

// Setup paths
const fixturesDir = path.resolve(__dirname, "../fixtures");
const outputDir = path.resolve(__dirname, "../tmp/benchmark");
const inputFile = path.join(fixturesDir, "test.txt");

// State
let scope: Scope.CloseableScope;
let runUno: Effect.Effect<void, unknown, never>;
let setupPromise: Promise<void>;

beforeAll(async () => {
  setupPromise = (async () => {
    scope = Effect.runSync(Scope.make());

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (!fs.existsSync(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`);
    }

    // Setup temp directory for shared volume
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lo-bench-"));
    fs.chmodSync(tempDir, 0o777);

    const sharedInputFile = path.join(tempDir, "test.txt");
    fs.copyFileSync(inputFile, sharedInputFile);

    const containerDef = Effect.tryPromise(async () => {
      const image = new GenericContainer("fiws/libreoffice-unoserver:latest");
      return await image
        .withExposedPorts(2003)
        .withUser(
          `${process.getuid ? process.getuid() : 1000}:${process.getgid ? process.getgid() : 1000}`,
        )
        .withBindMounts([{ source: tempDir, target: tempDir }])
        .withEnvironment({ HOME: tempDir })
        .withReuse()
        .withWaitStrategy(
          Wait.forLogMessage(/INFO:unoserver:Started./).withStartupTimeout(
            120_000,
          ),
        )
        .start();
    });

    const container = await Effect.runPromise(
      Effect.acquireRelease(containerDef, (c) =>
        Effect.promise(() => c.stop()),
      ).pipe(Scope.extend(scope)),
    );

    const port = container.getMappedPort(2003);
    const url = `http://localhost:${port}/RPC2`;

    await Effect.runPromise(testRunning(url));

    const unoEnv = LibreOffice.layerUno.pipe(
      Layer.provide(UnoClient.Default),
      Layer.provide(UnoServer.remoteWithURL(url)),
      Layer.provideMerge(NodeHttpClient.layer),
      Layer.provideMerge(NodeContext.layer),
    );

    runUno = Effect.gen(function* () {
      const lo = yield* LibreOffice;
      yield* lo.convertLocalFile(
        sharedInputFile,
        path.join(tempDir, "output_uno.pdf"),
      );
    }).pipe(Effect.provide(unoEnv));
  })();

  await setupPromise;
}, 120_000);

afterAll(async () => {
  if (scope) {
    await Effect.runPromise(Scope.close(scope, Exit.void));
  }
});

// 1. Default Implementation (CLI)
const DefaultEnv = LibreOffice.layerCli.pipe(
  Layer.provideMerge(NodeContext.layer),
);

const outputDefault = path.join(outputDir, "output_default.pdf");
const runDefault = Effect.gen(function* () {
  const lo = yield* LibreOffice;
  yield* lo.convertLocalFile(inputFile, outputDefault);
}).pipe(Effect.provide(DefaultEnv));

bench(
  "Default (CLI)",
  async () => {
    await Effect.runPromise(runDefault);
  },
  { time: 5000 },
);

bench(
  "Uno (Remote)",
  async () => {
    await setupPromise;
    if (!runUno) throw new Error("Uno setup failed");
    await Effect.runPromise(runUno);
  },
  { time: 5000 },
);
