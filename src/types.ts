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
