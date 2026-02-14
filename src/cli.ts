import { Context, Effect, Match, Stream, String } from "effect";
import { LibreOfficeError } from "./shared";

export const runString = <E, R>(
  stream: Stream.Stream<Uint8Array, E, R>,
): Effect.Effect<string, E, R> =>
  stream.pipe(Stream.decodeText(), Stream.runFold(String.empty, String.concat));

/**
 * LibreOfficeCmd service. Used to specify the command and base arguments for spawning LibreOffice.
 * Defaults to `["soffice", "--headless"]`.
 */
export class LibreOfficeCmd extends Context.Reference<LibreOfficeCmd>()(
  "effect-libreoffice/index/LibreOfficeCmd",
  { defaultValue: () => ["soffice", "--headless"] },
) {}

export const mapOutputMessage = Match.type<string>().pipe(
  Match.when(
    String.includes("Error: source file could not be loaded"),
    (message) =>
      new LibreOfficeError({
        reason: "InputFileNotFound",
        message,
      }),
  ),
  Match.when(
    String.includes("Error: no export filter"),
    (message) =>
      new LibreOfficeError({
        reason: "BadOutputExtension",
        message,
      }),
  ),
  Match.when(
    String.includes("Permission denied"),
    (message) =>
      new LibreOfficeError({
        reason: "PermissionDenied",
        message,
      }),
  ),
  Match.when(
    String.includes("Error: "),
    (message) =>
      new LibreOfficeError({
        reason: "Unknown",
        message,
      }),
  ),
  Match.orElse(() => Effect.void),
);
