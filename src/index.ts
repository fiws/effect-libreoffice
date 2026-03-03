import { Command, CommandExecutor, FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, String } from "effect";
import {
  type KnownSupportedOutputFormat,
  LibreOfficeError,
  type OutputPath,
  type Reason,
} from "./shared";
import { UnoClient, UnoError, UnoServer } from "./uno/uno";

export { LibreOfficeError, UnoServer, UnoClient, UnoError };
export type { OutputPath, KnownSupportedOutputFormat, Reason };

export * as Conversion from "./Conversion";
export { LibreOfficeCmd } from "./cli";

import { LibreOfficeCmd, mapOutputMessage, runString } from "./cli";

/**
 * Interface for the LibreOffice service.
 */
export interface LibreOfficeService {
  /**
   * Converts a file to a different format.
   *
   * ### Example
   *
   * ```ts
   * const program = Effect.gen(function* () {
   *   const libre = yield* LibreOffice;
   *   yield* libre.convertLocalFile("/path/to/input.docx", "/path/to/output.pdf");
   * });
   * ```
   */
  readonly convertLocalFile: (
    input: string,
    output: OutputPath,
    format?: string,
  ) => Effect.Effect<void, LibreOfficeError>;
}

/**
 * LibreOffice service. Provides methods for document conversion using LibreOffice.
 * The `Default` implementation uses the LibreOffice CLI directly.
 *
 * ## Example
 *
 * ```ts
 * const program = Effect.gen(function* () {
 *   const libre = yield* LibreOffice;
 *   yield* libre.convertLocalFile("/path/to/input.docx", "/path/to/output.pdf");
 * })
 *
 * program.pipe(
 *   Effect.provide(LibreOffice.layerCli),
 *   Effect.provide(NodeContext.layer),
 *   Effect.runPromise
 * );
 * ```
 */
export class LibreOffice extends Context.Tag(
  "effect-libreoffice/index/LibreOffice",
)<LibreOffice, LibreOfficeService>() {
  static layerCli = Layer.scoped(
    this,
    Effect.gen(function* () {
      const executor = yield* CommandExecutor.CommandExecutor;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const sem = yield* Effect.makeSemaphore(1);

      return LibreOffice.of({
        convertLocalFile: (
          input: string,
          output: OutputPath,
          format?: string,
        ) =>
          Effect.gen(function* () {
            const [cmd, ...args] = yield* LibreOfficeCmd;

            const parsedInput = path.parse(input);
            const parsedOutput = path.parse(output);

            const outputExt = format ? `.${format}` : parsedOutput.ext;

            // to preserve compatiblity with unoserver we have to check if the output is a directory
            if (
              yield* fs.stat(output).pipe(
                Effect.map((stat) => stat.type === "Directory"),
                Effect.catchAll(() => Effect.succeed(false)),
              )
            ) {
              return yield* new LibreOfficeError({
                reason: "BadOutputExtension",
                message: "Output path is a directory",
              });
            }

            // we need a temporary directory to ensure conversions do not conflict
            const tempDir = yield* fs.makeTempDirectoryScoped({
              prefix: "effect-libreoffice-",
            });

            // libreoffice does not do well with parallel conversions. It works if we provide
            // a new "UserInstallation" for each conversion but this slows down execution by about 8x
            // so we use a semaphore to limit parallel conversions to 1
            yield* sem.withPermits(1)(
              Effect.gen(function* () {
                const process = yield* Command.make(
                  cmd,
                  ...args,
                  "--convert-to",
                  outputExt.slice(1),
                  "--outdir",
                  tempDir,
                  input,
                ).pipe(Command.start);
                // We need to wait for the process to exit to get the exit code
                // and capture stderr in parallel to avoid missing output
                const [exitCode, result] = yield* Effect.all(
                  [process.exitCode, runString(process.stderr)],
                  { concurrency: "unbounded" },
                );

                // Check for specific errors in stderr first, regardless of exit code
                yield* mapOutputMessage(String.trim(result));

                if (exitCode !== 0) {
                  return yield* new LibreOfficeError({
                    reason: "Unknown",
                    message:
                      result || `Process failed with exit code ${exitCode}`,
                  });
                }

                // using the libreoffice cli we can not specify the output file name
                // it will be the input file name with the extension changed to the output format
                const libreOutputPath = path.join(
                  tempDir,
                  String.concat(parsedInput.name, outputExt),
                );

                // so we rename the file to the expected output path
                yield* fs.copyFile(libreOutputPath, output);

                // (temp directory is cleaned up by finalizer from makeTempDirectoryScoped)
              }),
            );
          }).pipe(
            Effect.provideService(CommandExecutor.CommandExecutor, executor),
            Effect.scoped,
            Effect.catchAll((e) =>
              e instanceof LibreOfficeError
                ? Effect.fail(e)
                : new LibreOfficeError({
                    reason: "Unknown",
                    message: "Conversion failed",
                    cause: e,
                  }),
            ),
          ),
      });
    }),
  );

  /**
   * The Uno layer uses a unoserver to convert files. It is much more

   * performant than the cli but requires you to provide a {@link UnoServer}
   * which in turn either requires a running unoserver or the `unoserver`
   * binary to be available in your PATH (eg. installed via pip).
   */
  static layerUno = Layer.scoped(
    this,
    Effect.gen(function* () {
      const client = yield* UnoClient;

      return LibreOffice.of({
        convertLocalFile: (
          input: string,
          output: OutputPath,
          format?: string,
        ) =>
          client.convert(input, output, format).pipe(
            Effect.as(undefined),
            Effect.catchAll((err) =>
              err instanceof UnoError
                ? new LibreOfficeError(err)
                : new LibreOfficeError({
                    reason: "Unknown",
                    message: `Failed to convert file: ${err}`,
                    cause: err,
                  }),
            ),
          ),
      });
    }).pipe(Effect.provide(UnoClient.Default)),
  );

  /**
   * The WASM layer uses `@matbee/libreoffice-converter` to convert files directly
   * in Node.js via an embedded WebAssembly build of LibreOffice. It is loaded
   * dynamically as it depends on an optional peer dependency.
   */
  static layerWasm = Layer.scoped(
    this,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      // Dynamically import the wasm implementation because the underlying
      // @matbee/libreoffice-converter is an optional dependency
      const { LibreOfficeWasm, layer } = yield* Effect.tryPromise({
        try: () => import("./wasm"),
        catch: (e) =>
          new LibreOfficeError({
            reason: "Unknown",
            message:
              "Failed to load WASM converter. Make sure @matbee/libreoffice-converter is installed.",
            cause: e,
          }),
      });

      const wasmContext = yield* Layer.build(layer);
      const wasm = Context.get(wasmContext, LibreOfficeWasm);

      return LibreOffice.of({
        convertLocalFile: (
          input: string,
          output: OutputPath,
          format?: string,
        ) =>
          Effect.gen(function* () {
            const parsedInput = path.parse(input);
            const parsedOutput = path.parse(output);

            const outputExt = format || parsedOutput.ext.slice(1);
            const inputExt = parsedInput.ext.slice(1);

            const inputData = yield* fs.readFile(input);

            const result = yield* wasm
              .convert(
                inputData,
                {
                  inputFormat:
                    inputExt as import("@matbee/libreoffice-converter/types").InputFormat,
                  outputFormat:
                    outputExt as import("@matbee/libreoffice-converter/types").OutputFormat,
                },
                parsedInput.base,
              )
              .pipe(
                Effect.catchAll(
                  (err) =>
                    new LibreOfficeError({
                      reason: "Unknown",
                      message: `WASM conversion failed: ${err.message}`,
                      cause: err,
                    }),
                ),
              );

            yield* fs.writeFile(output, result.data);
          }).pipe(
            Effect.catchAll((e) =>
              e instanceof LibreOfficeError
                ? Effect.fail(e)
                : new LibreOfficeError({
                    reason: "Unknown",
                    message: "Conversion failed",
                    cause: e,
                  }),
            ),
          ),
      });
    }),
  );
}
