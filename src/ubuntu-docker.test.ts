import { Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { assert, expect, it } from "@effect/vitest";
import { Effect, Layer, Predicate } from "effect";
import { GenericContainer } from "testcontainers";
import { LibreOffice, LibreOfficeCmd } from "./index";

const UbuntuContainer = Layer.scoped(
  LibreOfficeCmd,
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const dockerfilePath = path.join(process.cwd(), "docker");

    const container = yield* Effect.acquireRelease(
      Effect.promise(async () => {
        const image = await GenericContainer.fromDockerfile(
          dockerfilePath,
          "ubuntu.Dockerfile",
        ).build("fiws/effect-libreoffice-ubuntu:latest", {
          deleteOnExit: false,
        });

        return await image
          .withReuse()
          .withCommand(["tail", "-f", "/dev/null"])
          .start();
      }),
      (container) => Effect.promise(() => container.stop()),
    );

    return ["docker", "exec", container.getId(), "soffice", "--headless"];
  }),
);

const TestLive = LibreOffice.Default.pipe(
  Layer.provideMerge(UbuntuContainer),
  Layer.provideMerge(NodeContext.layer),
);

it.layer(TestLive, { timeout: 120_000 })(
  "Libreoffice (Ubuntu Docker)",
  (it) => {
    it.effect(
      "should fails with source file not found",
      Effect.fn(function* () {
        const libre = yield* LibreOffice;
        const result = yield* libre
          .convertLocalFile("./fixtures/test-not-found.txt", "test.out.pdf")
          .pipe(Effect.flip);

        expect(result._tag).toBe("LibreOfficeError");

        assert(
          Predicate.isTagged(result, "LibreOfficeError"),
          "result is not LibreOfficeError",
        );
        expect(result.reason).toBe("InputFileNotFound");
      }),
    );
  },
);
