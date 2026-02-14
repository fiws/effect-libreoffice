import { FileSystem, Path } from "@effect/platform";
import { Effect, Pipeable } from "effect";
import { LibreOffice } from "./index";
import type { OutputPath } from "./shared";

/**
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for(
  "effect-libreoffice/Conversion",
);

/**
 * @since 1.0.0
 */
export type TypeId = typeof TypeId;

/**
 * @since 1.0.0
 */
export type Input =
  | { readonly _tag: "File"; readonly path: string }
  | {
      readonly _tag: "Buffer";
      readonly data: Uint8Array;
      readonly format?: string;
    };

/**
 * @since 1.0.0
 */
export interface Conversion extends Pipeable.Pipeable {
  readonly [TypeId]: TypeId;
  readonly input: Input;
}

const proto = {
  [TypeId]: TypeId,
  pipe() {
    // biome-ignore lint/complexity/noArguments: effect pipe stuff
    return Pipeable.pipeArguments(this, arguments);
  },
};

/**
 * @since 1.0.0
 */
export const fromFile = (path: string): Conversion => {
  const conversion = Object.create(proto);
  conversion.input = { _tag: "File", path };
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
 * @since 1.0.0
 */
export const fromBuffer = (
  data: Uint8Array,
  options?: { readonly format?: string },
): Conversion => {
  const conversion = Object.create(proto);
  conversion.input = { _tag: "Buffer", data, format: options?.format };
  return conversion;
};

/**
 * @since 1.0.0
 */
export const toFile =
  (output: OutputPath, _options?: { readonly format?: string }) =>
  (self: Conversion) =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      let inputPath: string;

      if (self.input._tag === "File") {
        inputPath = self.input.path;
      } else {
        const tempDir = yield* fs.makeTempDirectoryScoped();
        const extension = self.input.format ? `.${self.input.format}` : "";
        inputPath = path.join(tempDir, `input${extension}`);
        yield* fs.writeFile(inputPath, self.input.data);
      }

      // TODO: Use options.format if provided, currently convertLocalFile relies on extension
      yield* libre.convertLocalFile(inputPath, output);
    }).pipe(Effect.scoped);
