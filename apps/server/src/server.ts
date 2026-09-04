import { createServer, type Server } from "node:http";
import { createServer as createServerH2 } from "node:http2";
import {
  NodeHttpClient,
  NodeHttpServer,
  NodeRuntime,
} from "@effect/platform-node";
import { Config, Effect, Layer, Logger } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { LibreOfficeNode } from "effect-libreoffice/node";
import { AllRoutes } from "./index.ts";

const ServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const h2c = yield* Config.schema(Config.Boolean, "H2C").pipe(
      Config.withDefault(false),
    );
    const port = yield* Config.schema(Config.Port, "PORT").pipe(
      Config.withDefault(3000),
    );
    return h2c
      ? NodeHttpServer.layer(() => createServerH2() as unknown as Server, {
          port,
        })
      : NodeHttpServer.layer(createServer, { port });
  }),
);

HttpRouter.serve(AllRoutes).pipe(
  Layer.provide(ServerLive),
  Layer.provide(LibreOfficeNode.layer),
  Layer.provide(NodeHttpClient.layerUndici),
  Layer.launch,
  Effect.provide(
    Logger.layer([
      process.env.NODE_ENV !== "production"
        ? Logger.consolePretty()
        : Logger.consoleJson,
    ]),
  ),
  NodeRuntime.runMain,
);
