import {
  FileSystem,
  HttpApiBuilder,
  HttpApiScalar,
  HttpLayerRouter,
  HttpServerResponse,
  type Path,
} from "@effect/platform";
import { Effect, Layer, Stream } from "effect";
import { Conversion, type LibreOffice } from "effect-libreoffice";
import { ConversionError, LibreOfficeApi } from "./domain.ts";

export * from "./domain.ts";

// LibreOfficeApi route implementation
export const ConvertRoute = HttpApiBuilder.group(
  LibreOfficeApi,
  "conversion",
  (handlers) =>
    handlers.handle(
      "convert",
      Effect.fn("ConvertRoute")(function* (req) {
        const fs = yield* FileSystem.FileSystem;
        const context = yield* Effect.context<
          FileSystem.FileSystem | Path.Path | LibreOffice
        >();

        // cleanup uploaded file
        yield* Effect.addFinalizer(() =>
          fs.remove(req.payload.file.path).pipe(Effect.logError),
        );

        return Conversion.fromFile(req.payload.file.path).pipe(
          Conversion.toStream({ format: "pdf" }),
          Stream.mapError((e) => new ConversionError({ message: e.message })),
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
