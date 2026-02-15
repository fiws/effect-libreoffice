import { createServer, type Server } from "node:http";
import { createServer as createServerH2 } from "node:http2";
import { HttpLayerRouter } from "@effect/platform";
import {
  NodeContext,
  NodeHttpServer,
  NodeRuntime,
} from "@effect/platform-node";
import { Config, Effect, Layer, Logger } from "effect";
import { LibreOffice } from "effect-libreoffice";
import { AllRoutes } from "./index.ts";

const ServerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const h2c = yield* Config.boolean("H2C").pipe(Config.withDefault(false));
    const port = yield* Config.integer("PORT").pipe(Config.withDefault(3000));
    return h2c
      ? NodeHttpServer.layer(() => createServerH2() as unknown as Server, {
          port,
        })
      : NodeHttpServer.layer(createServer, { port });
  }),
);

// To start the server, we use `HttpLayerRouter.serve` with the routes layer
HttpLayerRouter.serve(AllRoutes).pipe(
  Layer.provide(ServerLive),
  Layer.provide(LibreOffice.layerCli),
  Layer.provide(NodeContext.layer),
  Layer.launch,
  process.env.NODE_ENV !== "production"
    ? Effect.provide(Logger.pretty)
    : Effect.provide(Logger.json),
  NodeRuntime.runMain({ disablePrettyLogger: true }),
);
