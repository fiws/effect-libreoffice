import { Data } from "effect";

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

export class LibreOfficeError extends Data.TaggedError("LibreOfficeError")<{
  reason: Reason;
  message: string;
  cause?: unknown;
}> {}
