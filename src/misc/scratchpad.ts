import { Command } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

const compose = Command.make("docker", "compose", "up").pipe(
  Command.stdout("inherit"),
  Command.stderr("inherit"),
);

const program = Effect.gen(function* () {
  // const process = yield* Command.start(compose);

  yield* Effect.acquireRelease(Command.start(compose), (process) =>
    Effect.ignore(process.kill("SIGTERM")),
  );

  yield* Effect.log("hello");
  yield* Effect.sleep("10 seconds");
  yield* Effect.log("world");

  // yield* process.kill();
});

NodeRuntime.runMain(
  program.pipe(Effect.scoped, Effect.provide(NodeContext.layer)),
);
