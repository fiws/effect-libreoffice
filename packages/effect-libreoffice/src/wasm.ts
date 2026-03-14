import {
  ConversionError,
  createWorkerConverter,
  type WorkerConverter,
} from "@matbee/libreoffice-converter/server";
import { Effect, Layer, Option, Pool, pipe } from "effect";
import { LibreOffice, LibreOfficeError, TypeId } from "./libreoffice";

const mapError = Effect.mapError((e) => {
  const cause = e && typeof e === "object" && "error" in e ? e.error : e;

  if (cause instanceof ConversionError) {
    return new LibreOfficeError({
      code: cause.code,
      message: cause.message,
      details: cause.details,
      cause: e,
    });
  }
  return new LibreOfficeError({
    code: "UNKNOWN",
    message: cause instanceof Error ? cause.message : String(cause),
    cause: e,
  });
});

export const layer = Layer.scoped(
  LibreOffice,
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
    ): Effect.Effect<A, LibreOfficeError> =>
      pipe(
        pool.get,
        Effect.flatMap((c) => Effect.tryPromise(() => fn(c))),
        mapError,
        Effect.scoped,
      );

    return LibreOffice.of({
      [TypeId]: TypeId as TypeId,
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
        use((c) => c.getDocumentText(input, inputFormat)).pipe(
          Effect.map(Option.fromNullable),
        ),
      getPageNames: (input, inputFormat) =>
        use((c) => c.getPageNames(input, inputFormat)),
      openDocument: (input, options) =>
        use((c) => c.openDocument(input, options)),
      editorOperation: (sessionId, method, args) =>
        use((c) => c.editorOperation(sessionId, method, args)),
      closeDocument: (sessionId) =>
        use((c) => c.closeDocument(sessionId)).pipe(
          Effect.map(Option.fromNullable),
        ),
    });
  }),
);
