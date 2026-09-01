import type {
  ConversionOptions,
  ConversionResult,
  DocumentInfo,
  FullQualityPagePreview,
  FullQualityRenderOptions,
  InputFormat,
  InputFormatOptions,
  PagePreview,
  RenderOptions,
} from "@matbee/libreoffice-converter/types";
import { Context, type Effect, type Option } from "effect";
import type { LibreOfficeError } from "./error.ts";

export { LibreOfficeError } from "./error.ts";

export interface LibreOffice {
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
    inputFormat: InputFormat,
  ) => Effect.Effect<Option.Option<string>, LibreOfficeError>;

  /**
   * Get page/slide names from a document
   *
   * @since 2.0.0
   */
  readonly getPageNames: (
    input: Uint8Array,
    inputFormat: InputFormat,
  ) => Effect.Effect<string[], LibreOfficeError>;
}

/**
 * @category tags
 * @since 2.0.0
 */
export const LibreOffice = Context.GenericTag<LibreOffice>(
  "effect-libreoffice/LibreOffice",
);
