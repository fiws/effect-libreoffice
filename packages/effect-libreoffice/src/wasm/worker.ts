import { WorkerRunner } from "@effect/platform";
import {
  ConversionError,
  LibreOfficeConverter,
} from "@matbee/libreoffice-converter";
// @ts-expect-error untyped wasm loader
import loader from "@matbee/libreoffice-converter/wasm/loader";
import { Effect, Layer } from "effect";
import { LibreOfficeError } from "../error.ts";
import { LibreOfficeRequest } from "./schema.ts";

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

export const layerWorker = Layer.unwrapScoped(
  Effect.gen(function* () {
    const converter = yield* Effect.acquireRelease(createWorker, (c) =>
      Effect.tryPromise(() => c.destroy()).pipe(Effect.ignoreLogged),
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
    });
  }),
);
