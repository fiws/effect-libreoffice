import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { Conversion, LibreOffice } from "effect-libreoffice";

const TestLive = Layer.provideMerge(LibreOffice.Default, NodeContext.layer);

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
      expect(header).toBe("%PDF");
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
      expect(header).toBe("%PDF");
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
      expect(header).toBe("%PDF");
    }),
  );
});
