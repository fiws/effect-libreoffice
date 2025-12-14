import { Data } from "effect";

type Reason =
  | "InputFileNotFound"
  | "StartFailed"
  | "Unknown"
  | "BadOutputExtension"
  | "MethodNotFound";

export class LibreOfficeError extends Data.TaggedClass("LibreOfficeError")<{
  reason: Reason;
  message: string;
  cause?: unknown;
}> {}
