import {
  ConversionErrorCode,
  createWorkerConverter,
  ConversionError as OriginalConversionError,
  type WorkerConverter,
} from "@matbee/libreoffice-converter/server";
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
import { Context, Effect, Layer, Pool, pipe, Schema } from "effect";

export interface LibreOfficeWasmApi {
  /**
   * Convert a document to a different format
   */
  convert: (
    input: Uint8Array,
    options: ConversionOptions,
    filename?: string,
  ) => Effect.Effect<ConversionResult, ConversionError>;

  /**
   * Get the number of pages/parts in a document
   */
  getPageCount: (
    input: Uint8Array,
    options: InputFormatOptions,
  ) => Effect.Effect<number, ConversionError>;

  /**
   * Get document information including type and valid output formats
   */
  getDocumentInfo: (
    input: Uint8Array,
    options: InputFormatOptions,
  ) => Effect.Effect<DocumentInfo, ConversionError>;

  /**
   * Render a single page as an image
   */
  renderPage: (
    input: Uint8Array,
    options: InputFormatOptions,
    pageIndex: number,
    width: number,
    height?: number,
  ) => Effect.Effect<PagePreview, ConversionError>;

  /**
   * Render multiple page previews
   */
  renderPagePreviews: (
    input: Uint8Array,
    options: InputFormatOptions,
    renderOptions?: RenderOptions,
  ) => Effect.Effect<PagePreview[], ConversionError>;

  /**
   * Render a page at full quality (native resolution based on DPI)
   */
  renderPageFullQuality: (
    input: Uint8Array,
    options: InputFormatOptions,
    pageIndex: number,
    renderOptions?: FullQualityRenderOptions,
  ) => Effect.Effect<FullQualityPagePreview, ConversionError>;

  /**
   * Extract text content from a document
   */
  getDocumentText: (
    input: Uint8Array,
    inputFormat: string,
  ) => Effect.Effect<string | null, ConversionError>;

  /**
   * Get page/slide names from a document
   */
  getPageNames: (
    input: Uint8Array,
    inputFormat: string,
  ) => Effect.Effect<string[], ConversionError>;

  /**
   * Open a document for editing
   * Returns a session ID that can be used for subsequent editor operations
   */
  openDocument: (
    input: Uint8Array,
    options: InputFormatOptions,
  ) => Effect.Effect<EditorSession, ConversionError>;

  /**
   * Execute an editor operation on an open document session
   */
  editorOperation: <T = unknown>(
    sessionId: string,
    method: string,
    args?: unknown[],
  ) => Effect.Effect<EditorOperationResult<T>, ConversionError>;

  /**
   * Close an editor session and get the modified document
   */
  closeDocument: (
    sessionId: string,
  ) => Effect.Effect<Uint8Array | undefined, ConversionError>;
}

export class ConversionError extends Schema.TaggedError<ConversionError>()(
  "ConversionError",
  {
    code: Schema.Enums(ConversionErrorCode),
    message: Schema.String,
    details: Schema.optional(Schema.String),
  },
) {}

export class LibreOfficeWasm extends Context.Tag(
  "effect-libreoffice/wasm/LibreOfficeWasm",
)<LibreOfficeWasm, LibreOfficeWasmApi>() {}

const mapError = Effect.mapError((e) => {
  const cause =
    e && typeof e === "object" && "error" in e ? (e as any).error : e;

  if (cause instanceof OriginalConversionError) {
    return new ConversionError({
      code: cause.code,
      message: cause.message,
      details: cause.details,
    });
  }
  return new ConversionError({
    code: ConversionErrorCode.UNKNOWN,
    message: cause instanceof Error ? cause.message : String(cause),
  });
});

export const layer = Layer.scoped(
  LibreOfficeWasm,
  Effect.gen(function* () {
    const acquireConverter = Effect.acquireRelease(
      Effect.tryPromise(() => createWorkerConverter()),
      (c) => Effect.tryPromise(() => c.destroy()).pipe(Effect.ignoreLogged),
    );

    const pool = yield* Pool.make({
      acquire: acquireConverter,
      size: 1,
    });

    // helper to use pool + promise based functions
    const use = <A>(
      fn: (converter: WorkerConverter) => Promise<A>,
    ): Effect.Effect<A, ConversionError> =>
      pipe(
        pool.get,
        Effect.flatMap((c) => Effect.tryPromise(() => fn(c))),
        mapError,
        Effect.scoped,
      );

    return LibreOfficeWasm.of({
      convert: (input, options, filename) =>
        use((c) => c.convert(input, options, filename)),
      getPageCount: (input, options) =>
        use((c) => c.getPageCount(input, options)),
      getDocumentInfo: (input, options) =>
        use((c) => c.getDocumentInfo(input, options)),
      renderPage: (input, options, pageIndex, width, height) =>
        use((c) => c.renderPage(input, options, pageIndex, width, height)),
      renderPagePreviews: (input, options, renderOptions) =>
        use((c) => c.renderPagePreviews(input, options, renderOptions)),
      renderPageFullQuality: (input, options, pageIndex, renderOptions) =>
        use((c) =>
          c.renderPageFullQuality(input, options, pageIndex, renderOptions),
        ),
      getDocumentText: (input, inputFormat) =>
        use((c) => c.getDocumentText(input, inputFormat)),
      getPageNames: (input, inputFormat) =>
        use((c) => c.getPageNames(input, inputFormat)),
      openDocument: (input, options) =>
        use((c) => c.openDocument(input, options)),
      editorOperation: (sessionId, method, args) =>
        use((c) => c.editorOperation(sessionId, method, args)),
      closeDocument: (sessionId) => use((c) => c.closeDocument(sessionId)),
    });
  }),
);
