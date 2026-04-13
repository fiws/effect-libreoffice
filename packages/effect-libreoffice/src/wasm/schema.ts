import { Schema } from "effect";
import { LibreOfficeError } from "../error.ts";

export const InputFormat = Schema.Literal(
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "odg",
  "odf",
  "rtf",
  "txt",
  "html",
  "htm",
  "csv",
  "xml",
  "epub",
  "pdf",
);

export const OutputFormat = Schema.Literal(
  "pdf",
  "docx",
  "doc",
  "odt",
  "rtf",
  "txt",
  "html",
  "xlsx",
  "xls",
  "ods",
  "csv",
  "pptx",
  "ppt",
  "odp",
  "png",
  "jpg",
  "svg",
);

export const ConversionOptionsSchema = Schema.Struct({
  inputFormat: InputFormat.pipe(Schema.optional),
  outputFormat: OutputFormat,
  filterOptions: Schema.optional(Schema.String),
  password: Schema.optional(Schema.String),
  pdf: Schema.optional(
    Schema.Struct({
      pdfaLevel: Schema.Literal("PDF/A-1b", "PDF/A-2b", "PDF/A-3b").pipe(
        Schema.optional,
      ),
      quality: Schema.optional(Schema.Number),
    }),
  ),
  image: Schema.optional(
    Schema.Struct({
      pageIndex: Schema.optional(Schema.Number),
      width: Schema.optional(Schema.Number),
      height: Schema.optional(Schema.Number),
      dpi: Schema.optional(Schema.Number),
    }),
  ),
});

export const ConversionResultSchema = Schema.Struct({
  data: Schema.Uint8Array,
  mimeType: Schema.String,
  filename: Schema.String,
  duration: Schema.Number,
});

export const InputFormatOptionsSchema = Schema.Struct({
  inputFormat: InputFormat.pipe(Schema.optional),
});

export const DocumentInfoSchema = Schema.Struct({
  documentType: Schema.Number,
  documentTypeName: Schema.String,
  validOutputFormats: Schema.mutable(Schema.Array(OutputFormat)),
  pageCount: Schema.Number,
});

export const PagePreviewSchema = Schema.Struct({
  page: Schema.Number,
  data: Schema.Uint8Array,
  width: Schema.Number,
  height: Schema.Number,
});

export const RenderOptionsSchema = Schema.Struct({
  width: Schema.optional(Schema.Number),
  height: Schema.optional(Schema.Number),
  pageIndices: Schema.optional(
    Schema.Array(Schema.Number).pipe(Schema.mutable),
  ),
  editMode: Schema.optional(Schema.Boolean),
});

export const FullQualityRenderOptionsSchema = Schema.Struct({
  dpi: Schema.optional(Schema.Number),
  maxDimension: Schema.optional(Schema.Number),
  editMode: Schema.optional(Schema.Boolean),
});

export const FullQualityPagePreviewSchema = Schema.extend(
  PagePreviewSchema,
  Schema.Struct({ dpi: Schema.Number }),
);

export const EditorSessionSchema = Schema.Struct({
  sessionId: Schema.String,
  documentType: Schema.String,
  pageCount: Schema.Number,
});

export const EditorOperationResultSchema = Schema.Struct({
  success: Schema.Boolean,
  verified: Schema.optional(Schema.Boolean),
  data: Schema.optional(Schema.Any),
  error: Schema.optional(Schema.String),
  suggestion: Schema.optional(Schema.String),
});

export class ConvertRequest extends Schema.TaggedRequest<ConvertRequest>()(
  "Convert",
  {
    failure: LibreOfficeError,
    success: ConversionResultSchema,
    payload: {
      input: Schema.Uint8Array,
      options: ConversionOptionsSchema,
      filename: Schema.optional(Schema.String),
    },
  },
) {}

export class GetPageCountRequest extends Schema.TaggedRequest<GetPageCountRequest>()(
  "GetPageCount",
  {
    failure: LibreOfficeError,
    success: Schema.Number,
    payload: {
      input: Schema.Uint8Array,
      options: InputFormatOptionsSchema,
    },
  },
) {}

export class GetDocumentInfoRequest extends Schema.TaggedRequest<GetDocumentInfoRequest>()(
  "GetDocumentInfo",
  {
    failure: LibreOfficeError,
    success: DocumentInfoSchema,
    payload: {
      input: Schema.Uint8Array,
      options: InputFormatOptionsSchema,
    },
  },
) {}

export class RenderPageRequest extends Schema.TaggedRequest<RenderPageRequest>()(
  "RenderPage",
  {
    failure: LibreOfficeError,
    success: PagePreviewSchema,
    payload: {
      input: Schema.Uint8Array,
      options: InputFormatOptionsSchema,
      pageIndex: Schema.Number,
      width: Schema.Number,
      height: Schema.optional(Schema.Number),
    },
  },
) {}

export class RenderPagePreviewsRequest extends Schema.TaggedRequest<RenderPagePreviewsRequest>()(
  "RenderPagePreviews",
  {
    failure: LibreOfficeError,
    success: Schema.mutable(Schema.Array(PagePreviewSchema)),
    payload: {
      input: Schema.Uint8Array,
      options: InputFormatOptionsSchema,
      renderOptions: Schema.optional(RenderOptionsSchema),
    },
  },
) {}

export class RenderPageFullQualityRequest extends Schema.TaggedRequest<RenderPageFullQualityRequest>()(
  "RenderPageFullQuality",
  {
    failure: LibreOfficeError,
    success: FullQualityPagePreviewSchema,
    payload: {
      input: Schema.Uint8Array,
      options: InputFormatOptionsSchema,
      pageIndex: Schema.Number,
      renderOptions: Schema.optional(FullQualityRenderOptionsSchema),
    },
  },
) {}

export class GetDocumentTextRequest extends Schema.TaggedRequest<GetDocumentTextRequest>()(
  "GetDocumentText",
  {
    failure: LibreOfficeError,
    success: Schema.NullOr(Schema.String),
    payload: {
      input: Schema.Uint8Array,
      inputFormat: InputFormat,
    },
  },
) {}

export class GetPageNamesRequest extends Schema.TaggedRequest<GetPageNamesRequest>()(
  "GetPageNames",
  {
    failure: LibreOfficeError,
    success: Schema.mutable(Schema.Array(Schema.String)),
    payload: {
      input: Schema.Uint8Array,
      inputFormat: InputFormat,
    },
  },
) {}

export class OpenDocumentRequest extends Schema.TaggedRequest<OpenDocumentRequest>()(
  "OpenDocument",
  {
    failure: LibreOfficeError,
    success: EditorSessionSchema,
    payload: {
      input: Schema.Uint8Array,
      options: InputFormatOptionsSchema,
    },
  },
) {}

export class EditorOperationRequest extends Schema.TaggedRequest<EditorOperationRequest>()(
  "EditorOperation",
  {
    failure: LibreOfficeError,
    success: EditorOperationResultSchema,
    payload: {
      sessionId: Schema.String,
      method: Schema.String,
      args: Schema.optional(Schema.Array(Schema.Unknown).pipe(Schema.mutable)),
    },
  },
) {}

export class CloseDocumentRequest extends Schema.TaggedRequest<CloseDocumentRequest>()(
  "CloseDocument",
  {
    failure: LibreOfficeError,
    success: Schema.NullOr(Schema.Uint8Array),
    payload: {
      sessionId: Schema.String,
    },
  },
) {}

export const LibreOfficeRequest = Schema.Union(
  ConvertRequest,
  GetPageCountRequest,
  GetDocumentInfoRequest,
  RenderPageRequest,
  RenderPagePreviewsRequest,
  RenderPageFullQualityRequest,
  GetDocumentTextRequest,
  GetPageNamesRequest,
  OpenDocumentRequest,
  EditorOperationRequest,
  CloseDocumentRequest,
);

export type LibreOfficeRequest = Schema.Schema.Type<typeof LibreOfficeRequest>;
