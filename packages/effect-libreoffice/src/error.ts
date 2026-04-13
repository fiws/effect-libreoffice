import { Schema } from "effect";

/**
 * These are coming from the ConversionErrorCode enum from `@matbee/libreoffice-converter`
 * `PEER_DEPENDENCY_IMPORT_FAILED` is added by us
 *
 * @category errors
 * @since 2.0.0
 */
export const ConversionErrorCode = Schema.Literal(
  "UNKNOWN",
  "INVALID_INPUT",
  "UNSUPPORTED_FORMAT",
  "CORRUPTED_DOCUMENT",
  "PASSWORD_REQUIRED",
  "WASM_NOT_INITIALIZED",
  "CONVERSION_FAILED",
  "LOAD_FAILED",

  // added by us
  "PEER_DEPENDENCY_IMPORT_FAILED",
);

/**
 * @category errors
 * @since 2.0.0
 */
export class LibreOfficeError extends Schema.TaggedError<LibreOfficeError>()(
  "LibreOfficeError",
  {
    code: ConversionErrorCode,
    message: Schema.String,
    details: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {}
