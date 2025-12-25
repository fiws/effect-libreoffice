import { Data } from "effect";

/**
 * A list of common output formats supported by LibreOffice.
 */
export type KnownSupportedOutputFormat =
  | "pdf"
  | "docx"
  | "doc"
  | "odt"
  | "html"
  | "rtf"
  | "epub"
  | "jpg"
  | "txt";

/**
 * Represents a path to an output file, preferably with a known extension.
 */
export type OutputPath =
  | `${string}.${KnownSupportedOutputFormat}`
  | (string & {});

type Reason =
  | "InputFileNotFound"
  | "StartFailed"
  | "Unknown"
  | "BadOutputExtension"
  | "MethodNotFound"
  | "PermissionDenied";

/**
 * Error thrown by the LibreOffice service when a conversion or operation fails.
 */
export class LibreOfficeError extends Data.TaggedError("LibreOfficeError")<{
  /**
   * The specific reason for the failure.
   */
  reason: Reason;
  /**
   * A human-readable message describing the error.
   */
  message: string;
  /**
   * The underlying cause of the error, if any.
   */
  cause?: unknown;
}> {}
