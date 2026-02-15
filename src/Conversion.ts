import { FileSystem, Path } from "@effect/platform";
import { Effect, Pipeable, Stream } from "effect";
import { LibreOffice } from "./index";
import type { OutputPath } from "./shared";

/**
 * @since 2.0.0
 */
export const TypeId: unique symbol = Symbol.for(
  "effect-libreoffice/Conversion",
);

/**
 * @since 2.0.0
 */
export type TypeId = typeof TypeId;

/**
 * @since 2.0.0
 */
export type Input<E = unknown> =
  | { readonly _tag: "File"; readonly path: string; readonly format?: string }
  | {
      readonly _tag: "Stream";
      readonly stream: Stream.Stream<Uint8Array, E, never>;
      readonly format?: string;
    }
  | {
      readonly _tag: "Buffer";
      readonly data: Uint8Array;
      readonly format?: string;
    };

/**
 * @since 2.0.0
 */
export interface Conversion<E = unknown> extends Pipeable.Pipeable {
  readonly [TypeId]: TypeId;
  readonly input: Input<E>;
}

const proto = {
  [TypeId]: TypeId,
  pipe() {
    // biome-ignore lint/complexity/noArguments: effect pipe stuff
    return Pipeable.pipeArguments(this, arguments);
  },
};

/**
 * Creates a conversion pipeline from a file path.
 *
 * @param path - The path to the input file.
 * @since 2.0.0
 * @example
 * import { Conversion, LibreOffice } from "effect-libreoffice";
 * import { Effect, Layer } from "effect";
 * import { NodeContext } from "@effect/platform-node";
 *
 * const program = Effect.gen(function* () {
 *   const pipeline = Conversion.fromFile("path/to/source.docx").pipe(
 *     Conversion.toFile("path/to/destination.pdf", { format: "pdf" })
 *   );
 *   yield* pipeline;
 * });
 *
 * program.pipe(
 *   Effect.provide(LibreOffice.layerCli),
 *   Effect.provide(NodeContext.layer),
 *   Effect.runPromise
 * );
 */
export const fromFile = (path: string): Conversion<never> => {
  const conversion = Object.create(proto);
  conversion.input = { _tag: "File", path };
  return conversion;
};

/**
 * Creates a conversion pipeline from a stream.
 *
 * @param stream - The input stream.
 * @param options - Optional configuration.
 * @param options.format - The file extension/format hint (e.g., "docx", "txt").
 *                         While LibreOffice can often detect the format from content,
 *                         providing this is recommended for binary formats.
 * @since 2.0.0
 * @example
 * import { Conversion, LibreOffice } from "effect-libreoffice";
 * import { Effect, Layer, Stream } from "effect";
 * import { NodeContext } from "@effect/platform-node";
 *
 * const program = Effect.gen(function* () {
 *   const stream = Stream.make(new TextEncoder().encode("Hello world"));
 *   const pipeline = Conversion.fromStream(stream, { format: "txt" }).pipe(
 *     Conversion.toFile("path/to/destination.pdf", { format: "pdf" })
 *   );
 *   yield* pipeline;
 * });
 *
 * program.pipe(
 *   Effect.provide(LibreOffice.layerCli),
 *   Effect.provide(NodeContext.layer),
 *   Effect.runPromise
 * );
 */
export const fromStream = <E>(
  stream: Stream.Stream<Uint8Array, E, never>,
  options?: { readonly format?: string },
): Conversion<E> => {
  const conversion = Object.create(proto);
  conversion.input = { _tag: "Stream", stream, format: options?.format };
  return conversion;
};

/**
 * Creates a conversion pipeline from a buffer (Uint8Array).
 *
 * @param data - The input buffer.
 * @param options - Optional configuration.
 * @param options.format - The file extension/format hint (e.g., "docx", "txt").
 *                         While LibreOffice can often detect the format from content,
 *                         providing this is recommended for binary formats.
 * @since 2.0.0
 * @example
 * import { Conversion, LibreOffice } from "effect-libreoffice";
 * import { Effect, Layer } from "effect";
 * import { NodeContext } from "@effect/platform-node";
 *
 * const program = Effect.gen(function* () {
 *   const buffer = new TextEncoder().encode("Hello world");
 *   const pipeline = Conversion.fromBuffer(buffer, { format: "txt" }).pipe(
 *     Conversion.toFile("path/to/destination.pdf", { format: "pdf" })
 *   );
 *   yield* pipeline;
 * });
 *
 * program.pipe(
 *   Effect.provide(LibreOffice.layerCli),
 *   Effect.provide(NodeContext.layer),
 *   Effect.runPromise
 * );
 */
export const fromBuffer = (
  data: Uint8Array,
  options?: { readonly format?: string },
): Conversion<never> => {
  const conversion = Object.create(proto);
  conversion.input = { _tag: "Buffer", data, format: options?.format };
  return conversion;
};

/**
 * Converts input to a file.
 *
 * @param output - The output path or boolean to auto-generate path (only valid if input is a file).
 * @param options - Conversion options.
 * @since 2.0.0
 * @example
 * import { Conversion, LibreOffice } from "effect-libreoffice";
 * import { Effect, Layer } from "effect";
 * import { NodeContext } from "@effect/platform-node";
 *
 * const program = Effect.gen(function* () {
 *   const pipeline = Conversion.fromFile("path/to/source.docx").pipe(
 *     Conversion.toFile("path/to/destination.pdf", { format: "pdf" })
 *   );
 *   yield* pipeline;
 * });
 *
 * program.pipe(
 *   Effect.provide(LibreOffice.layerCli),
 *   Effect.provide(NodeContext.layer),
 *   Effect.runPromise
 * );
 */
export const toFile =
  (output: OutputPath, options?: { readonly format?: string }) =>
  <E>(self: Conversion<E>) =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      let inputPath: string;

      if (self.input._tag === "File") {
        inputPath = self.input.path;
      } else if (self.input._tag === "Stream") {
        const tempDir = yield* fs.makeTempDirectoryScoped();
        const extension = self.input.format ? `.${self.input.format}` : "";
        inputPath = path.join(tempDir, `input${extension}`);

        // we need to write the stream to a file (libreoffice only accepts files as input)
        yield* Stream.run(self.input.stream, fs.sink(inputPath));
      } else {
        const tempDir = yield* fs.makeTempDirectoryScoped();
        const extension = self.input.format ? `.${self.input.format}` : "";
        inputPath = path.join(tempDir, `input${extension}`);
        yield* fs.writeFile(inputPath, self.input.data);
      }

      yield* libre.convertLocalFile(inputPath, output, options?.format);
    }).pipe(Effect.scoped);

/**
 * Converts input to a stream.
 *
 * NOTE: This method writes the output to a temporary file internally because LibreOffice
 * does not support streaming output directly. The temporary file is automatically cleaned up
 * when the stream is finalized / scope is closed.
 *
 * @param options - Conversion options.
 * @since 2.0.0
 * @example
 * import { Conversion, LibreOffice } from "effect-libreoffice";
 * import { Effect, Layer, Stream } from "effect";
 * import { NodeContext } from "@effect/platform-node";
 * import { FileSystem } from "@effect/platform";
 *
 * const program = Effect.gen(function* () {
 *   const fs = yield* FileSystem.FileSystem;
 *   const pipeline = Conversion.fromFile("path/to/source.docx").pipe(
 *     Conversion.toStream({ format: "pdf" })
 *   );
 *
 *   yield* Stream.run(pipeline, fs.sink("path/to/destination.pdf"));
 * });
 *
 * program.pipe(
 *   Effect.provide(LibreOffice.layerCli),
 *   Effect.provide(NodeContext.layer),
 *   Effect.runPromise
 * );
 */
export const toStream =
  (options: { readonly format: string }) =>
  <E>(self: Conversion<E>) =>
    Stream.unwrapScoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        const tempDir = yield* fs.makeTempDirectoryScoped();
        const outputPath = path.join(tempDir, `output.${options.format}`);

        yield* toFile(outputPath, options)(self);

        return fs.stream(outputPath);
      }),
    );
