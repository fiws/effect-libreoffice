import {
  FileSystem,
  HttpApiBuilder,
  HttpApiScalar,
  HttpClient,
  HttpClientRequest,
  HttpLayerRouter,
  HttpServerResponse,
} from "@effect/platform";
import { LibreOfficeApi } from "@effect-libreoffice/api";
import { Effect, Layer, Stream } from "effect";
import { LibreOffice } from "effect-libreoffice";

// LibreOfficeApi route implementation
export const ConvertRoute = HttpApiBuilder.group(
  LibreOfficeApi,
  "conversion",
  (handlers) =>
    handlers
      .handle(
        "convert",
        Effect.fn("ConvertRoute")(function* (req) {
          const fs = yield* FileSystem.FileSystem;
          const libre = yield* LibreOffice.LibreOffice;

          // cleanup uploaded file
          yield* Effect.addFinalizer(() =>
            fs.remove(req.payload.file.path).pipe(Effect.logError),
          );

          const inputData = yield* fs.readFile(req.payload.file.path).pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                new LibreOffice.LibreOfficeError({
                  code: "UNKNOWN",
                  message: String(error),
                }),
              ),
            ),
          );

          const result = yield* libre.convert(inputData, {
            outputFormat: req.payload.format as any,
          });

          return HttpServerResponse.stream(Stream.make(result.data));
        }),
      )
      .handle(
        "convertUrl",
        Effect.fn("ConvertUrlRoute")(function* (req) {
          const httpClient = yield* HttpClient.HttpClient;
          const libre = yield* LibreOffice.LibreOffice;

          const request = HttpClientRequest.get(req.payload.inputUrl);
          const response = yield* httpClient.execute(request).pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                new LibreOffice.LibreOfficeError({
                  code: "UNKNOWN",
                  message: String(error),
                }),
              ),
            ),
          );
          const arrayBuffer = yield* response.arrayBuffer.pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                new LibreOffice.LibreOfficeError({
                  code: "UNKNOWN",
                  message: String(error),
                }),
              ),
            ),
          );
          const inputData = new Uint8Array(arrayBuffer);

          if (req.payload.outputUrl) {
            const result = yield* libre.convert(inputData, {
              outputFormat: req.payload.format as any,
            });

            const putRequest = HttpClientRequest.put(
              req.payload.outputUrl,
            ).pipe(HttpClientRequest.bodyUint8Array(result.data));

            yield* httpClient.execute(putRequest).pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new LibreOffice.LibreOfficeError({
                    code: "UNKNOWN",
                    message: String(error),
                  }),
                ),
              ),
            );
            return { status: "ok" as const };
          }

          const result = yield* libre.convert(inputData, {
            outputFormat: req.payload.format as any,
          });

          return HttpServerResponse.stream(Stream.make(result.data));
        }),
      ),
);

export const ManagementRoute = HttpApiBuilder.group(
  LibreOfficeApi,
  "management",
  (handlers) =>
    handlers.handle("health", () => Effect.succeed({ status: "ok" as const })),
);

export const HttpApiRoutes = HttpLayerRouter.addHttpApi(LibreOfficeApi, {
  openapiPath: "/docs/openapi.json",
}).pipe(
  // Provide the api handlers layer
  Layer.provide(ConvertRoute),
  Layer.provide(ManagementRoute),
);

// Create a /docs route for the API documentation
export const DocsRoute = HttpApiScalar.layerHttpLayerRouterCdn({
  api: LibreOfficeApi,
  path: "/docs",
  scalar: {
    defaultOpenAllTags: true,
  },
});

// redirect from "/" to "/docs"
export const RedirectRoute = HttpLayerRouter.add("GET", "/", () =>
  Effect.succeed(HttpServerResponse.redirect("/docs")),
);

export const AllRoutes = Layer.mergeAll(
  HttpApiRoutes,
  DocsRoute,
  RedirectRoute,
);
