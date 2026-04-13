import { WorkerRunner } from "@effect/platform";
import { Effect, Layer } from "effect";
import { LibreOfficeRequest } from "./schema.ts";
import {
  ConversionError,
  LibreOfficeConverter,
} from "@matbee/libreoffice-converter";
import { LibreOfficeError } from "../error.ts";

// @ts-expect-error
import loader from "@matbee/libreoffice-converter/wasm/loader";

console.log("hello from worker");

// const converterEffect = Effect.acquireRelease(
//   Effect.tryPromise({
//     try: () => createWorkerConverter(),
//     catch: (e) =>
//       new LibreOfficeError({
//         code: "UNKNOWN",
//         message: "Failed to initialize converter",
//         cause: e,
//       }),
//   }),
//   (converter) =>
//     Effect.tryPromise(() => converter.destroy()).pipe(Effect.ignoreLogged),
// );

const createWorker = Effect.gen(function* () {
  const converter = new LibreOfficeConverter({
    wasmLoader: loader,
  });

  yield* Effect.tryPromise(() => converter.initialize());

  return converter;
});

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

export const WorkerLive = Layer.unwrapScoped(
  Effect.gen(function* () {
    const converter = yield* Effect.acquireRelease(createWorker, (c) =>
      Effect.log("shutting down").pipe(
        Effect.andThen(
          Effect.tryPromise(() => c.destroy()).pipe(Effect.ignoreLogged),
        ),
        Effect.andThen(Effect.log("Destroy complete")),
      ),
    );

    const use = <A>(f: (c: LibreOfficeConverter) => Promise<A>) =>
      Effect.tryPromise(() => f(converter)).pipe(mapError, Effect.scoped);

    return WorkerRunner.layerSerialized(LibreOfficeRequest, {
      Convert: (req) =>
        use((c) =>
          c.convert(req.input, req.options, req.filename ?? undefined),
        ),
      GetPageCount: (req) => use((c) => c.getPageCount(req.input, req.options)),
      GetDocumentInfo: (req) =>
        use((c) => c.getDocumentInfo(req.input, req.options)),
      RenderPage: (req) =>
        use((c) =>
          c.renderPage(
            req.input,
            req.options,
            req.pageIndex,
            req.width,
            req.height ?? undefined,
          ),
        ),
      RenderPagePreviews: (req) =>
        use((c) =>
          c.renderPagePreviews(req.input, req.options, req.renderOptions),
        ),
      RenderPageFullQuality: (req) =>
        use((c) =>
          c.renderPageFullQuality(
            req.input,
            req.options,
            req.pageIndex,
            req.renderOptions,
          ),
        ),
      GetDocumentText: (req) =>
        use(async (c) => {
          const res = await c.getDocumentText(req.input, {
            inputFormat: req.inputFormat,
            outputFormat: "txt",
          });
          return res ?? null;
        }),
      GetPageNames: (req) =>
        use(async (c) => {
          const res = await c.getPageNames(req.input, {
            inputFormat: req.inputFormat,
            outputFormat: "txt",
          });
          return res;
        }),
      OpenDocument: (req) => use((c) => c.openDocument(req.input, req.options)),
      EditorOperation: (req) =>
        use((c) => c.editorOperation(req.sessionId, req.method, req.args)),
      CloseDocument: (req) =>
        use(async (c) => {
          const res = await c.closeDocument(req.sessionId);
          return res ?? null;
        }),
    });
  }),
);
