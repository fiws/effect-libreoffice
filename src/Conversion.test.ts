import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { assert, it } from "@effect/vitest";
import { Chunk, Effect, Layer, Option, Stream } from "effect";
import { Conversion, LibreOffice } from "effect-libreoffice";

const TestLive = Layer.provideMerge(LibreOffice.layerCli, NodeContext.layer);

it.layer(TestLive)("Conversion API", (it) => {
  it.scoped(
    "should convert a file using the pipeable API",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectoryScoped();
      const sourceFile = path.join(tempDir, "test.txt");
      const targetFile = path.join(tempDir, "test.out.pdf");

      yield* fs.writeFileString(sourceFile, "Hello PDF");

      const conversion = Conversion.fromFile(sourceFile).pipe(
        Conversion.toFile(targetFile, { format: "pdf" }),
      );

      yield* conversion;

      const targetContent = yield* fs.readFile(targetFile);

      const header = new TextDecoder().decode(targetContent.slice(0, 4));
      assert.strictEqual(header, "%PDF");
    }),
  );

  it.scoped(
    "should convert a buffer using the pipeable API",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectoryScoped();
      const targetFile = path.join(tempDir, "buffer-test.pdf");

      const buffer = new TextEncoder().encode("Hello Buffer PDF");

      const conversion = Conversion.fromBuffer(buffer, { format: "txt" }).pipe(
        Conversion.toFile(targetFile, { format: "pdf" }),
      );

      yield* conversion;

      const targetContent = yield* fs.readFile(targetFile);

      const header = new TextDecoder().decode(targetContent.slice(0, 4));
      assert.strictEqual(header, "%PDF");
    }),
  );

  it.scoped(
    "should convert a buffer without format (text detection)",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectoryScoped();
      const targetFile = path.join(tempDir, "buffer-no-format.pdf");

      const buffer = new TextEncoder().encode("Hello Buffer No Format");

      const conversion = Conversion.fromBuffer(buffer).pipe(
        Conversion.toFile(targetFile, { format: "pdf" }),
      );

      yield* conversion;

      const targetContent = yield* fs.readFile(targetFile);

      const header = new TextDecoder().decode(targetContent.slice(0, 4));
      assert.strictEqual(header, "%PDF");
    }),
  );

  it.scoped(
    "should convert with explicit format option",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectoryScoped();
      const targetFile = path.join(tempDir, "explicit-format-test"); // No extension

      const buffer = new TextEncoder().encode("Explicit Format PDF");

      const conversion = Conversion.fromBuffer(buffer).pipe(
        Conversion.toFile(targetFile, { format: "pdf" }),
      );

      yield* conversion;

      const targetContent = yield* fs.readFile(targetFile);
      const header = new TextDecoder().decode(targetContent.slice(0, 4));
      assert.strictEqual(header, "%PDF");
    }),
  );
  it.scoped(
    "should convert a stream using the pipeable API",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectoryScoped();
      const targetFile = path.join(tempDir, "stream-test.pdf");

      const stream = Stream.make(new TextEncoder().encode("Hello Stream PDF"));

      const conversion = Conversion.fromStream(stream, { format: "txt" }).pipe(
        Conversion.toFile(targetFile, { format: "pdf" }),
      );

      yield* conversion;

      const targetContent = yield* fs.readFile(targetFile);

      const header = new TextDecoder().decode(targetContent.slice(0, 4));
      assert.strictEqual(header, "%PDF");
    }),
  );

  it.scoped(
    "should convert a stream without format (text detection)",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectoryScoped();
      const targetFile = path.join(tempDir, "stream-no-format.pdf");

      const stream = Stream.make(
        new TextEncoder().encode("Hello Stream No Format"),
      );

      const conversion = Conversion.fromStream(stream).pipe(
        Conversion.toFile(targetFile, { format: "pdf" }),
      );

      yield* conversion;

      const targetContent = yield* fs.readFile(targetFile);

      const header = new TextDecoder().decode(targetContent.slice(0, 4));
      assert.strictEqual(header, "%PDF");
    }),
  );

  it.scoped(
    "should convert a multi-chunk stream",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectoryScoped();
      const targetFile = path.join(tempDir, "stream-chunked.pdf");

      const chunks = ["Hello ", "Chunked ", "Stream ", "PDF"];
      const stream = Stream.fromIterable(
        chunks.map((s) => new TextEncoder().encode(s)),
      );

      const conversion = Conversion.fromStream(stream, { format: "txt" }).pipe(
        Conversion.toFile(targetFile, { format: "pdf" }),
      );

      yield* conversion;

      const targetContent = yield* fs.readFile(targetFile);
      const header = new TextDecoder().decode(targetContent.slice(0, 4));
      assert.strictEqual(header, "%PDF");
    }),
  );

  it.scoped(
    "should propagate stream errors",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectoryScoped();
      const targetFile = path.join(tempDir, "stream-error.pdf");

      const stream = Stream.fail("Stream Failure");

      const conversion = Conversion.fromStream(stream, { format: "txt" }).pipe(
        Conversion.toFile(targetFile, { format: "pdf" }),
      );

      const error = yield* Effect.flip(conversion);
      assert.strictEqual(error, "Stream Failure");
    }),
  );

  it.scoped(
    "should convert to stream using toStream API",
    Effect.fn(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const tempDir = yield* fs.makeTempDirectoryScoped();
      const sourceFile = path.join(tempDir, "test-stream-api.txt");

      yield* fs.writeFileString(sourceFile, "Hello Stream API");

      const conversion = Conversion.fromFile(sourceFile).pipe(
        Conversion.toStream({ format: "pdf" }),
      );

      const output = yield* Stream.runCollect(conversion);
      const firstChunk = Chunk.head(output).pipe(Option.getOrThrow);

      const header = new TextDecoder().decode(firstChunk.slice(0, 4));
      assert.strictEqual(header, "%PDF");
    }),
  );
});
