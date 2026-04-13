import { Worker } from "@effect/platform";
import { Effect, Layer, Option, type ParseResult } from "effect";
import { LibreOffice } from "./libreoffice.ts";
import { LibreOfficeError } from "./error.ts";
import {
  type LibreOfficeRequest,
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
} from "./wasm/schema.ts";
import type { WorkerError } from "@effect/platform/WorkerError";

export const layer = Layer.scoped(
  LibreOffice,
  Effect.gen(function* () {
    const pool = yield* Worker.makePoolSerialized<LibreOfficeRequest>({
      size: 1,
    });

    const run = <R extends LibreOfficeRequest>(request: R) =>
      pool.executeEffect(request);

    const mapErrors = <A, E extends Error>(
      effect: Effect.Effect<A, WorkerError | ParseResult.ParseError | E>,
    ) =>
      effect.pipe(
        Effect.catchTag("WorkerError", (error) =>
          Effect.fail(
            new LibreOfficeError({
              message: error.message,
              code: "UNKNOWN",
              cause: error.cause,
            }),
          ),
        ),
        Effect.catchTag("ParseError", (error) =>
          Effect.fail(
            new LibreOfficeError({
              message: error.message,
              code: "UNKNOWN",
              cause: error.cause,
            }),
          ),
        ),
      );

    return LibreOffice.of({
      convert: (input, options, filename) =>
        run(new ConvertRequest({ input, options, filename })).pipe(mapErrors),
      getPageCount: (input, options) =>
        run(new GetPageCountRequest({ input, options })).pipe(mapErrors),
      getDocumentInfo: (input, options) =>
        run(new GetDocumentInfoRequest({ input, options })).pipe(mapErrors),
      renderPage: (input, options, pageIndex, width, height) =>
        run(
          new RenderPageRequest({ input, options, pageIndex, width, height }),
        ).pipe(mapErrors),
      renderPagePreviews: (input, options, renderOptions) =>
        run(
          new RenderPagePreviewsRequest({ input, options, renderOptions }),
        ).pipe(mapErrors),
      renderPageFullQuality: (input, options, pageIndex, renderOptions) =>
        run(
          new RenderPageFullQualityRequest({
            input,
            options,
            pageIndex,
            renderOptions,
          }),
        ).pipe(mapErrors),
      getDocumentText: (input, inputFormat) =>
        run(new GetDocumentTextRequest({ input, inputFormat })).pipe(
          Effect.map(Option.fromNullable),
          mapErrors,
        ),
      getPageNames: (input, inputFormat) =>
        run(new GetPageNamesRequest({ input, inputFormat })).pipe(mapErrors),
      openDocument: (input, options) =>
        run(new OpenDocumentRequest({ input, options })).pipe(mapErrors),
      editorOperation: (sessionId, method, args) =>
        run(new EditorOperationRequest({ sessionId, method, args })).pipe(
          mapErrors,
        ),
      closeDocument: (sessionId) =>
        run(new CloseDocumentRequest({ sessionId })).pipe(
          Effect.map(Option.fromNullable),
          mapErrors,
        ),
    });
  }),
);
