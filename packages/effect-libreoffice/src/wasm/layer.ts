import { Effect, Layer, Option } from "effect";
import { RpcClient } from "effect/unstable/rpc";
import type { RpcClientError } from "effect/unstable/rpc/RpcClientError";
import { LibreOfficeError } from "../error.ts";
import { LibreOffice } from "../libreoffice.ts";
import { LibreOfficeRpcs } from "./schema.ts";

const clientLayer = Layer.effect(
  LibreOffice,
  Effect.gen(function* () {
    const client = yield* RpcClient.make(LibreOfficeRpcs);

    const mapErrors = <A>(
      effect: Effect.Effect<A, LibreOfficeError | RpcClientError>,
    ) =>
      effect.pipe(
        Effect.catchTag("RpcClientError", (error) =>
          Effect.fail(
            new LibreOfficeError({
              message: error.message,
              code: "UNKNOWN",
              cause: error,
            }),
          ),
        ),
      );

    return LibreOffice.of({
      convert: (input, options, filename) =>
        client.Convert({ input, options, filename }).pipe(mapErrors),
      getPageCount: (input, options) =>
        client.GetPageCount({ input, options }).pipe(mapErrors),
      getDocumentInfo: (input, options) =>
        client.GetDocumentInfo({ input, options }).pipe(mapErrors),
      renderPage: (input, options, pageIndex, width, height) =>
        client
          .RenderPage({ input, options, pageIndex, width, height })
          .pipe(mapErrors),
      renderPagePreviews: (input, options, renderOptions) =>
        client
          .RenderPagePreviews({ input, options, renderOptions })
          .pipe(mapErrors),
      renderPageFullQuality: (input, options, pageIndex, renderOptions) =>
        client
          .RenderPageFullQuality({
            input,
            options,
            pageIndex,
            renderOptions,
          })
          .pipe(mapErrors),
      getDocumentText: (input, inputFormat) =>
        client
          .GetDocumentText({ input, inputFormat })
          .pipe(Effect.map(Option.fromNullishOr), mapErrors),
      getPageNames: (input, inputFormat) =>
        client.GetPageNames({ input, inputFormat }).pipe(mapErrors),
    });
  }),
);

export const layer = clientLayer.pipe(
  Layer.provide(RpcClient.layerProtocolWorker({ size: 1 })),
);
