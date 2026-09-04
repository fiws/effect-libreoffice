import {
  ConversionError,
  LibreOfficeConverter,
} from "@matbee/libreoffice-converter";
// @ts-expect-error untyped wasm loader
import loader from "@matbee/libreoffice-converter/wasm/loader";
import { Effect, Layer } from "effect";
import { RpcServer } from "effect/unstable/rpc";
import { LibreOfficeError } from "../error.ts";
import { LibreOfficeRpcs } from "./schema.ts";

const createWorker = Effect.gen(function* () {
  const converter = new LibreOfficeConverter({
    wasmLoader: loader,
  });

  yield* Effect.tryPromise(() => converter.initialize());

  return converter;
});

const mapError = Effect.mapError((error) => {
  const cause =
    error && typeof error === "object" && "error" in error
      ? error.error
      : error;

  if (cause instanceof ConversionError) {
    return new LibreOfficeError({
      code: cause.code,
      message: cause.message,
      details: cause.details,
      cause: error,
    });
  }
  return new LibreOfficeError({
    code: "UNKNOWN",
    message: cause instanceof Error ? cause.message : String(cause),
    cause: error,
  });
});

const handlers = LibreOfficeRpcs.toLayer(
  Effect.gen(function* () {
    const converter = yield* Effect.acquireRelease(createWorker, (converter) =>
      Effect.tryPromise(() => converter.destroy()).pipe(
        Effect.ignore({ log: true }),
      ),
    );

    const use = <A>(
      operation: (converter: LibreOfficeConverter) => Promise<A>,
    ) => Effect.tryPromise(() => operation(converter)).pipe(mapError);

    return LibreOfficeRpcs.of({
      Convert: (request) =>
        use((converter) =>
          converter.convert(
            request.input,
            request.options,
            request.filename ?? undefined,
          ),
        ),
      GetPageCount: (request) =>
        use((converter) =>
          converter.getPageCount(request.input, request.options),
        ),
      GetDocumentInfo: (request) =>
        use((converter) =>
          converter.getDocumentInfo(request.input, request.options),
        ),
      RenderPage: (request) =>
        use((converter) =>
          converter.renderPage(
            request.input,
            request.options,
            request.pageIndex,
            request.width,
            request.height ?? undefined,
          ),
        ),
      RenderPagePreviews: (request) =>
        use((converter) =>
          converter.renderPagePreviews(
            request.input,
            request.options,
            request.renderOptions,
          ),
        ),
      RenderPageFullQuality: (request) =>
        use((converter) =>
          converter.renderPageFullQuality(
            request.input,
            request.options,
            request.pageIndex,
            request.renderOptions,
          ),
        ),
      GetDocumentText: (request) =>
        use(async (converter) => {
          const result = await converter.getDocumentText(request.input, {
            inputFormat: request.inputFormat,
            outputFormat: "txt",
          });
          return result ?? null;
        }),
      GetPageNames: (request) =>
        use((converter) =>
          converter.getPageNames(request.input, {
            inputFormat: request.inputFormat,
            outputFormat: "txt",
          }),
        ),
    });
  }),
);

export const layerWorker = RpcServer.layer(LibreOfficeRpcs).pipe(
  Layer.provide(handlers),
);
