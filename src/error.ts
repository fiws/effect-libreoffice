import { Data } from "effect";

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
