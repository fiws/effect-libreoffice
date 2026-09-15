import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { LibreOfficeError } from "../error.ts";

export const InputFormat = Schema.Literals([
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
]);

export const OutputFormat = Schema.Literals([
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
]);

export const ConversionOptionsSchema = Schema.Struct({
  inputFormat: InputFormat.pipe(Schema.optional),
  outputFormat: OutputFormat,
  filterOptions: Schema.optional(Schema.String),
  password: Schema.optional(Schema.String),
  pdf: Schema.optional(
    Schema.Struct({
      pdfaLevel: Schema.Literals(["PDF/A-1b", "PDF/A-2b", "PDF/A-3b"]).pipe(
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

export const FullQualityPagePreviewSchema = PagePreviewSchema.pipe(
  Schema.fieldsAssign({ dpi: Schema.Number }),
);

export class ConvertRequest extends Rpc.make("Convert", {
  error: LibreOfficeError,
  success: ConversionResultSchema,
  payload: {
    input: Schema.Uint8Array,
    options: ConversionOptionsSchema,
    filename: Schema.optional(Schema.String),
  },
}) {}

export class GetPageCountRequest extends Rpc.make("GetPageCount", {
  error: LibreOfficeError,
  success: Schema.Number,
  payload: {
    input: Schema.Uint8Array,
    options: InputFormatOptionsSchema,
  },
}) {}

export class GetDocumentInfoRequest extends Rpc.make("GetDocumentInfo", {
  error: LibreOfficeError,
  success: DocumentInfoSchema,
  payload: {
    input: Schema.Uint8Array,
    options: InputFormatOptionsSchema,
  },
}) {}

export class RenderPageRequest extends Rpc.make("RenderPage", {
  error: LibreOfficeError,
  success: PagePreviewSchema,
  payload: {
    input: Schema.Uint8Array,
    options: InputFormatOptionsSchema,
    pageIndex: Schema.Number,
    width: Schema.Number,
    height: Schema.optional(Schema.Number),
  },
}) {}

export class RenderPagePreviewsRequest extends Rpc.make("RenderPagePreviews", {
  error: LibreOfficeError,
  success: Schema.mutable(Schema.Array(PagePreviewSchema)),
  payload: {
    input: Schema.Uint8Array,
    options: InputFormatOptionsSchema,
    renderOptions: Schema.optional(RenderOptionsSchema),
  },
}) {}

export class RenderPageFullQualityRequest extends Rpc.make(
  "RenderPageFullQuality",
  {
    error: LibreOfficeError,
    success: FullQualityPagePreviewSchema,
    payload: {
      input: Schema.Uint8Array,
      options: InputFormatOptionsSchema,
      pageIndex: Schema.Number,
      renderOptions: Schema.optional(FullQualityRenderOptionsSchema),
    },
  },
) {}

export class GetDocumentTextRequest extends Rpc.make("GetDocumentText", {
  error: LibreOfficeError,
  success: Schema.NullOr(Schema.String),
  payload: {
    input: Schema.Uint8Array,
    inputFormat: InputFormat,
  },
}) {}

export class GetPageNamesRequest extends Rpc.make("GetPageNames", {
  error: LibreOfficeError,
  success: Schema.mutable(Schema.Array(Schema.String)),
  payload: {
    input: Schema.Uint8Array,
    inputFormat: InputFormat,
  },
}) {}

export class LibreOfficeRpcs extends RpcGroup.make(
  ConvertRequest,
  GetPageCountRequest,
  GetDocumentInfoRequest,
  RenderPageRequest,
  RenderPagePreviewsRequest,
  RenderPageFullQualityRequest,
  GetDocumentTextRequest,
  GetPageNamesRequest,
) {}
