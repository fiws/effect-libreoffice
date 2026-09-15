import { LibreOfficeApi } from "@effect-libreoffice/api";
import { Effect, FileSystem, Layer } from "effect";
import {
  HttpClient,
  HttpClientRequest,
  HttpRouter,
  HttpServerResponse,
} from "effect/unstable/http";
import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi";
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
            Effect.mapError(
              (error) =>
                new LibreOffice.LibreOfficeError({
                  code: "UNKNOWN",
                  message: String(error),
                }),
            ),
          );

          const result = yield* libre.convert(inputData, {
            outputFormat: req.payload.format,
          });

          return HttpServerResponse.uint8Array(result.data);
        }),
      )
      .handle(
        "convertUrl",
        Effect.fn("ConvertUrlRoute")(function* (req) {
          const httpClient = yield* HttpClient.HttpClient;
          const libre = yield* LibreOffice.LibreOffice;

          const request = HttpClientRequest.get(req.payload.inputUrl);
          const response = yield* httpClient.execute(request).pipe(
            Effect.mapError(
              (error) =>
                new LibreOffice.LibreOfficeError({
                  code: "UNKNOWN",
                  message: String(error),
                }),
            ),
          );
          const arrayBuffer = yield* response.arrayBuffer.pipe(
            Effect.mapError(
              (error) =>
                new LibreOffice.LibreOfficeError({
                  code: "UNKNOWN",
                  message: String(error),
                }),
            ),
          );
          const inputData = new Uint8Array(arrayBuffer);

          if (req.payload.outputUrl) {
            const result = yield* libre.convert(inputData, {
              outputFormat: req.payload.format,
            });

            const putRequest = HttpClientRequest.put(
              req.payload.outputUrl,
            ).pipe(HttpClientRequest.bodyUint8Array(result.data));

            yield* httpClient.execute(putRequest).pipe(
              Effect.mapError(
                (error) =>
                  new LibreOffice.LibreOfficeError({
                    code: "UNKNOWN",
                    message: String(error),
                  }),
              ),
            );
            return { status: "ok" as const };
          }

          const result = yield* libre.convert(inputData, {
            outputFormat: req.payload.format,
          });

          return HttpServerResponse.uint8Array(result.data);
        }),
      ),
);

export const ManagementRoute = HttpApiBuilder.group(
  LibreOfficeApi,
  "management",
  (handlers) =>
    handlers.handle("health", () => Effect.succeed({ status: "ok" as const })),
);

export const HttpApiRoutes = HttpApiBuilder.layer(LibreOfficeApi, {
  openapiPath: "/docs/openapi.json",
}).pipe(Layer.provide(ConvertRoute), Layer.provide(ManagementRoute));

// Create a /docs route for the API documentation
export const DocsRoute = HttpApiScalar.layerCdn(LibreOfficeApi, {
  path: "/docs",
  scalar: {
    defaultOpenAllTags: true,
  },
});

// redirect from "/" to "/docs"
export const RedirectRoute = HttpRouter.add("GET", "/", () =>
  Effect.succeed(HttpServerResponse.redirect("/docs")),
);

export const AllRoutes = Layer.mergeAll(
  HttpApiRoutes,
  DocsRoute,
  RedirectRoute,
);
