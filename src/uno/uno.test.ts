import { FileSystem, Path } from "@effect/platform";
import { NodeContext, NodeHttpClient } from "@effect/platform-node";
import { assert, expect, it } from "@effect/vitest";
import { Effect, Layer, Predicate } from "effect";
import { GenericContainer, Wait } from "testcontainers";
import { LibreOffice } from "../index";
import { testRunning, UnoClient, UnoServer } from "./uno";

const UnoServerTest = Layer.scoped(
  UnoServer,
  Effect.gen(function* () {
    const container = yield* Effect.acquireRelease(
      Effect.promise(async () => {
        const image = await GenericContainer.fromDockerfile(".").build(
          "fiws/libreoffice-unoserver:latest",
          {
            deleteOnExit: false,
          },
        );
        return await image
          .withExposedPorts(2003)
          .withUser("1000:1000")
          .withBindMounts([{ source: "/tmp", target: "/tmp" }])
          .withEnvironment({ HOME: "/tmp" })
          .withWaitStrategy(
            Wait.forLogMessage(/INFO:unoserver:Started./).withStartupTimeout(
              120_000,
            ),
          )
          .start();
      }),
      (c) => Effect.promise(() => c.stop()),
    );

    const port = container.getMappedPort(2003);

    yield* testRunning(`http://localhost:${port}/RPC2`);
    return UnoServer.make({
      url: `http://localhost:${port}/RPC2`,
    });
  }),
);

const UnoLayer = LibreOffice.Uno.pipe(
  Layer.provide(UnoClient.Default),
  Layer.provide(UnoServerTest),
);

const TestLive = Layer.provideMerge(
  UnoLayer,
  Layer.merge(NodeContext.layer, NodeHttpClient.layer),
);

it.layer(TestLive)("Libreoffice (Uno)", (it) => {
  it.scoped(
    "should convert a file",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const libre = yield* LibreOffice;

      const tempDir = yield* fs.makeTempDirectory();
      const sourceFile = path.join(tempDir, "test.txt");
      const targetFile = path.join(tempDir, "test.out.pdf");

      yield* fs.writeFileString(sourceFile, "Hello PDF");
      yield* libre.convertLocalFile(sourceFile, targetFile);

      const targetContent = yield* fs.readFile(targetFile);

      const header = new TextDecoder().decode(targetContent.slice(0, 4));
      expect(header).toBe("%PDF");
    }),
  );

  it.effect(
    "should fails with source file not found",
    Effect.fn(function* () {
      const libre = yield* LibreOffice;
      const result = yield* libre
        .convertLocalFile("./fixtures/test-not-found.txt", "test.out.pdf")
        .pipe(Effect.flip);
      assert(Predicate.isTagged(result, "LibreOfficeError"));
      expect(result.reason).toBe("InputFileNotFound");
    }),
  );

  it.effect(
    "Should work with 2 conversions in parallel",
    Effect.fn(function* () {
      const libre = yield* LibreOffice;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectory();
      const sourceFile = path.join(tempDir, "test.txt");
      const targetFile = path.join(tempDir, "test.out.pdf");

      yield* fs.writeFileString(sourceFile, "Hello PDF");

      yield* Effect.all(
        [
          libre.convertLocalFile(sourceFile, targetFile),
          libre.convertLocalFile(sourceFile, targetFile),
        ],
        { concurrency: "unbounded" },
      );

      const targetContent = yield* fs.readFile(targetFile);

      const header = new TextDecoder().decode(targetContent.slice(0, 4));
      expect(header).toBe("%PDF");
    }),
  );

  it.effect(
    "should fail with invalid output extension",
    Effect.fn(function* () {
      const libre = yield* LibreOffice;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const tempDir = yield* fs.makeTempDirectory();
      const sourceFile = path.join(tempDir, "test.txt");
      const targetFile = path.join(tempDir, "test.invalidext");

      yield* fs.writeFileString(sourceFile, "Hello PDF");

      const result = yield* libre
        .convertLocalFile(sourceFile, targetFile)
        .pipe(Effect.flip);

      assert(Predicate.isTagged(result, "LibreOfficeError"));
      expect(result.reason).toBe("BadOutputExtension");
    }),
  );

  it.effect(
    "should fail with output as directory",
    Effect.fn(function* () {
      const libre = yield* LibreOffice;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const tempDir = yield* fs.makeTempDirectory();
      const sourceFile = path.join(tempDir, "test.txt");
      // Try to write to a directory
      const targetFile = tempDir;

      yield* fs.writeFileString(sourceFile, "Hello PDF");

      const result = yield* libre
        .convertLocalFile(sourceFile, targetFile)
        .pipe(Effect.flip);

      assert(Predicate.isTagged(result, "LibreOfficeError"));
      expect(result.reason).toBe("BadOutputExtension");
    }),
  );
});
