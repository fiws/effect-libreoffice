import {
  FileSystem,
  HttpClient,
  HttpClientRequest,
  Path,
} from "@effect/platform";
import type {
  InputFormat,
  OutputFormat,
} from "@matbee/libreoffice-converter/types";
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
    }
  | {
      readonly _tag: "Url";
      readonly url: string;
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
 *   Effect.provide(LibreOffice.layer),
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
 *   Effect.provide(LibreOffice.layer),
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
 *   Effect.provide(LibreOffice.layer),
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
 * Creates a conversion pipeline from a URL.
 *
 * @param url - The input URL.
 * @param options - Optional configuration.
 * @since 2.0.0
 */
export const fromUrl = (
  url: string,
  options?: { readonly format?: string },
): Conversion<never> => {
  const conversion = Object.create(proto);
  conversion.input = { _tag: "Url", url, format: options?.format };
  return conversion;
};

const resolveInputData = <E>(self: Conversion<E>, fs: FileSystem.FileSystem) =>
  Effect.gen(function* () {
    if (self.input._tag === "File") {
      return yield* fs.readFile(self.input.path);
    }

    if (self.input._tag === "Stream") {
      const chunks = yield* Stream.runCollect(self.input.stream);
      let totalLength = 0;
      for (const chunk of chunks) {
        totalLength += chunk.length;
      }
      const data = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }
      return data;
    }

    if (self.input._tag === "Url") {
      const httpClient = yield* HttpClient.HttpClient;
      const request = HttpClientRequest.get(self.input.url);
      const response = yield* httpClient.execute(request);
      const arrayBuffer = yield* response.arrayBuffer;
      return new Uint8Array(arrayBuffer);
    }

    return self.input.data;
  });

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
 *   Effect.provide(LibreOffice.layer),
 *   Effect.provide(NodeContext.layer),
 *   Effect.runPromise
 * );
 */
export const toFile =
  (output: OutputPath, options?: { readonly format?: string }) =>
  <E>(self: Conversion<E>) =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const inputData = yield* resolveInputData(self, fs);

      const filename =
        self.input._tag === "File" ? path.basename(self.input.path) : undefined;
      const outputExt = options?.format ?? path.extname(output).slice(1);

      if (!outputExt) {
        return yield* Effect.fail(
          new LibreOffice.LibreOfficeError({
            code: "UNKNOWN",
            message: "Output format could not be determined",
          }),
        );
      }

      const result = yield* libre.convert(
        inputData,
        {
          outputFormat: outputExt as OutputFormat,
          inputFormat: self.input.format as InputFormat,
        },
        filename,
      );

      yield* fs.writeFile(output, result.data);
    }).pipe(Effect.scoped);

/**
 * Converts input and uploads the result to a URL.
 *
 * @param outputUrl - The output URL.
 * @param options - Conversion options.
 * @since 2.0.0
 */
export const toUrl =
  (outputUrl: string, options?: { readonly format?: string }) =>
  <E>(self: Conversion<E>) =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const fs = yield* FileSystem.FileSystem;
      const httpClient = yield* HttpClient.HttpClient;
      const path = yield* Path.Path;

      const inputData = yield* resolveInputData(self, fs);

      const filename =
        self.input._tag === "File"
          ? path.basename(self.input.path)
          : self.input._tag === "Url"
            ? new URL(self.input.url).pathname.split("/").pop() || "unknown"
            : undefined;

      const outputExt =
        options?.format ?? new URL(outputUrl).pathname.split(".").pop();

      if (!outputExt) {
        return yield* Effect.fail(
          new LibreOffice.LibreOfficeError({
            code: "UNKNOWN",
            message: "Output format could not be determined",
          }),
        );
      }

      const result = yield* libre.convert(
        inputData,
        {
          outputFormat: outputExt as OutputFormat,
          inputFormat: self.input.format as InputFormat,
        },
        filename,
      );

      const request = HttpClientRequest.put(outputUrl).pipe(
        HttpClientRequest.bodyUint8Array(result.data),
      );

      yield* httpClient.execute(request);
    }).pipe(Effect.scoped);

/**
 * Converts input to a stream.
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
 *   Effect.provide(LibreOffice.layer),
 *   Effect.provide(NodeContext.layer),
 *   Effect.runPromise
 * );
 */
export const toStream =
  (options: { readonly format: string }) =>
  <E>(self: Conversion<E>) =>
    Stream.unwrapScoped(
      Effect.gen(function* () {
        const libre = yield* LibreOffice.LibreOffice;
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        const inputData = yield* resolveInputData(self, fs);

        const filename =
          self.input._tag === "File"
            ? path.basename(self.input.path)
            : undefined;

        const result = yield* libre.convert(
          inputData,
          {
            outputFormat: options.format as OutputFormat,
            inputFormat: self.input.format as InputFormat,
          },
          filename,
        );

        return Stream.make(result.data);
      }),
    );
