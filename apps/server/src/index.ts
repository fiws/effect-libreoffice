import {
  FileSystem,
  HttpApiBuilder,
  HttpApiScalar,
  type HttpClient,
  HttpLayerRouter,
  HttpServerResponse,
  type Path,
} from "@effect/platform";
import { LibreOfficeApi } from "@effect-libreoffice/api";
import { Effect, Layer, Stream } from "effect";
import { Conversion, LibreOffice } from "effect-libreoffice";

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

          // cleanup uploaded file
          yield* Effect.addFinalizer(() =>
            fs.remove(req.payload.file.path).pipe(Effect.logError),
          );

          const context = yield* Effect.context<
            | FileSystem.FileSystem
            | Path.Path
            | LibreOffice.LibreOffice
            | HttpClient.HttpClient
          >();

          return Conversion.fromFile(req.payload.file.path).pipe(
            Conversion.toStream({ format: req.payload.format }),
            Stream.provideContext(context),
            HttpServerResponse.stream,
          );
        }),
      )
      .handle(
        "convertUrl",
        Effect.fn("ConvertUrlRoute")(function* (req) {
          const context = yield* Effect.context<
            | FileSystem.FileSystem
            | Path.Path
            | LibreOffice.LibreOffice
            | HttpClient.HttpClient
          >();

          if (req.payload.outputUrl) {
            yield* Conversion.fromUrl(req.payload.inputUrl).pipe(
              Conversion.toUrl(req.payload.outputUrl, {
                format: req.payload.format,
              }),
              // something is very wrong here, Predicate.is tag is not working
              // Effec.catchTag does not list the errors expected (PlatformError, HttpClientError, LibreOfficeError)
              Effect.mapError((error) =>
                error._tag === "LibreOfficeError"
                  ? error
                  : new LibreOffice.LibreOfficeError({
                      code: "UNKNOWN",
                      message: String(error),
                    }),
              ),
            );
            return { status: "ok" as const };
          }

          return Conversion.fromUrl(req.payload.inputUrl).pipe(
            Conversion.toStream({ format: req.payload.format }),
            Stream.provideContext(context),
            HttpServerResponse.stream,
          );
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
