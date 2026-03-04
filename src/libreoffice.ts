import type {
  ConversionOptions,
  ConversionResult,
  DocumentInfo,
  EditorOperationResult,
  EditorSession,
  FullQualityPagePreview,
  FullQualityRenderOptions,
  InputFormatOptions,
  PagePreview,
  RenderOptions,
} from "@matbee/libreoffice-converter/types";
import { Context, Effect, Layer, type Option, Schema } from "effect";

/**
 * @category type ids
 * @since 2.0.0
 */
export const TypeId: TypeId = "~effect-libreoffice/LibreOffice";

/**
 * @category type ids
 * @since 2.0.0
 */
export type TypeId = "~effect-libreoffice/LibreOffice";

export interface LibreOffice {
  readonly [TypeId]: TypeId;
  /**
   * Convert a document to a different format
   *
   * @since 2.0.0
   */
  readonly convert: (
    input: Uint8Array,
    options: ConversionOptions,
    filename?: string,
  ) => Effect.Effect<ConversionResult, LibreOfficeError>;

  /**
   * Get the number of pages/parts in a document
   *
   * @since 2.0.0
   */
  readonly getPageCount: (
    input: Uint8Array,
    options: InputFormatOptions,
  ) => Effect.Effect<number, LibreOfficeError>;

  /**
   * Get document information including type and valid output formats
   *
   * @since 2.0.0
   */
  readonly getDocumentInfo: (
    input: Uint8Array,
    options: InputFormatOptions,
  ) => Effect.Effect<DocumentInfo, LibreOfficeError>;

  /**
   * Render a single page as an image
   *
   * @since 2.0.0
   */
  readonly renderPage: (
    input: Uint8Array,
    options: InputFormatOptions,
    pageIndex: number,
    width: number,
    height?: number,
  ) => Effect.Effect<PagePreview, LibreOfficeError>;

  /**
   * Render multiple page previews
   *
   * @since 2.0.0
   */
  readonly renderPagePreviews: (
    input: Uint8Array,
    options: InputFormatOptions,
    renderOptions?: RenderOptions,
  ) => Effect.Effect<PagePreview[], LibreOfficeError>;

  /**
   * Render a page at full quality (native resolution based on DPI)
   *
   * @since 2.0.0
   */
  readonly renderPageFullQuality: (
    input: Uint8Array,
    options: InputFormatOptions,
    pageIndex: number,
    renderOptions?: FullQualityRenderOptions,
  ) => Effect.Effect<FullQualityPagePreview, LibreOfficeError>;

  /**
   * Extract text content from a document
   *
   * @since 2.0.0
   */
  readonly getDocumentText: (
    input: Uint8Array,
    inputFormat: string,
  ) => Effect.Effect<Option.Option<string>, LibreOfficeError>;

  /**
   * Get page/slide names from a document
   *
   * @since 2.0.0
   */
  readonly getPageNames: (
    input: Uint8Array,
    inputFormat: string,
  ) => Effect.Effect<string[], LibreOfficeError>;

  /**
   * Open a document for editing
   * Returns a session ID that can be used for subsequent editor operations
   *
   * @since 2.0.0
   */
  readonly openDocument: (
    input: Uint8Array,
    options: InputFormatOptions,
  ) => Effect.Effect<EditorSession, LibreOfficeError>;

  /**
   * Execute an editor operation on an open document session
   *
   * @since 2.0.0
   */
  readonly editorOperation: <T = unknown>(
    sessionId: string,
    method: string,
    args?: unknown[],
  ) => Effect.Effect<EditorOperationResult<T>, LibreOfficeError>;

  /**
   * Close an editor session and get the modified document
   *
   * @since 2.0.0
   */
  readonly closeDocument: (
    sessionId: string,
  ) => Effect.Effect<Option.Option<Uint8Array>, LibreOfficeError>;
}

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

/**
 * @category tags
 * @since 2.0.0
 */
export const LibreOffice = Context.GenericTag<LibreOffice>(
  "effect-libreoffice/LibreOffice",
);

export const layer = Layer.scoped(
  LibreOffice,
  Effect.gen(function* () {
    const { layer } = yield* Effect.tryPromise({
      try: () => import("./wasm"),
      catch: (e) =>
        new LibreOfficeError({
          code: "LOAD_FAILED",
          message:
            "Failed to load WASM converter. Make sure @matbee/libreoffice-converter is installed.",
          cause: e,
        }),
    });

    const built = yield* Layer.build(layer);
    return Context.get(built, LibreOffice);
  }),
);
