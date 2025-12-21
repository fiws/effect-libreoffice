import { Command, FileSystem, Path } from "@effect/platform";
import { Context, Effect, flow, Layer, Match, Stream, String } from "effect";
import { LibreOfficeError } from "./error";
import type { OutputPath } from "./types";
import { UnoClient, UnoError } from "./uno/uno";

const runString = <E, R>(
  stream: Stream.Stream<Uint8Array, E, R>,
): Effect.Effect<string, E, R> =>
  stream.pipe(Stream.decodeText(), Stream.runFold(String.empty, String.concat));

export class LibreOfficeCmd extends Context.Reference<LibreOfficeCmd>()(
  "libre-convert-effect/index/LibreOfficeCmd",
  { defaultValue: () => ["soffice", "--headless"] },
) {}

export class LibreOffice extends Effect.Service<LibreOffice>()(
  "libre-convert-effect/index/LibreOffice",
  {
    scoped: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const sem = yield* Effect.makeSemaphore(1);

      return {
        /**
         * Converts a file to a different format.
         * @param input The input file path.
         * @param output The output file path.
         */
        convertLocalFile: Effect.fn(function* (
          input: string,
          output: OutputPath,
        ) {
          const [cmd, ...args] = yield* LibreOfficeCmd;

          const parsedInput = path.parse(input);
          const parsedOutput = path.parse(output);

          // to preserve compatiblity with unoserver we have to check if the output is a directory
          if (
            yield* fs.stat(output).pipe(
              Effect.map((stat) => stat.type === "Directory"),
              Effect.catchAll(() => Effect.succeed(false)),
            )
          ) {
            return yield* Effect.fail(
              new LibreOfficeError({
                reason: "BadOutputExtension",
                message: "Output path is a directory",
              }),
            );
          }

          // we need a temporary directory to ensure parallel conversions do not conflict
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
                parsedOutput.ext.slice(1),
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
              yield* Match.value(String.trim(result)).pipe(
                Match.when(
                  String.includes("Error: source file could not be loaded"),
                  () =>
                    new LibreOfficeError({
                      reason: "InputFileNotFound",
                      message: result,
                    }),
                ),
                Match.when(
                  String.includes("Error: no export filter"),
                  () =>
                    new LibreOfficeError({
                      reason: "BadOutputExtension",
                      message: result,
                    }),
                ),
                Match.when(
                  String.includes("Error: "),
                  () =>
                    new LibreOfficeError({
                      reason: "Unknown",
                      message: result,
                    }),
                ),
                Match.orElse(() => Effect.void),
              );

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
                String.concat(parsedInput.name, parsedOutput.ext),
              );

              // so we rename the file to the expected output path
              yield* fs.copyFile(libreOutputPath, output);
              // return output;
            }),
          );
        }, Effect.scoped),
      };
    }),
  },
) {
  /**
   * The Uno layer uses a unoserver to convert files.
   */
  static Uno = Layer.scoped(
    LibreOffice,
    Effect.gen(function* () {
      const client = yield* UnoClient;

      return LibreOffice.make({
        convertLocalFile: flow(
          client.convert,
          Effect.as(undefined),
          Effect.mapError((err) =>
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
    }),
  );
}
