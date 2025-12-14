# effect-libreoffice

A powerful Effect-based wrapper for LibreOffice, providing multiple strategies for document conversion.

## Implementations

This library offers two distinct implementations for interacting with LibreOffice:

1.  **LibreOfficeCmd (Default)**: Uses the `soffice` command-line tool directly.
2.  **UnoClient (Uno)**: Connects to a running `unoserver` instance via XML-RPC.

### Comparison

| Feature         | LibreOfficeCmd (Default)                 | UnoClient (Uno)                            |
| :-------------- | :--------------------------------------- | :----------------------------------------- |
| **Method**      | Spawns a new process for each conversion | Connects to a long-running server          |
| **Performance** | Slower (~440ms/file)                     | Fast (~60ms/file)                          |
| **Concurrency** | Limited to 1 (via Semaphore)             | Single-threaded (queued)                   |
| **Setup**       | Requires LibreOffice installed locally   | Requires `unoserver` (e.g., Docker)        |
| **Best For**    | CLI tools, low volume, simple setup      | Servers, high volume, performance critical |

## Usage

### Default Implementation (CLI)

Best for quick scripts or when you don't want to manage a separate server.

```typescript
import { LibreOffice } from "libre-convert-effect";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";

const program = Effect.gen(function* () {
  const libre = yield* LibreOffice;
  yield* libre.convertLocalFile("input.docx", "output.pdf");
});

// Provide the Default layer (which uses LibreOfficeCmd) and NodeContext
program.pipe(
  Effect.provide(LibreOffice.Default),
  Effect.provide(NodeContext.layer),
  Effect.runPromise
);
```

### Uno Implementation (Remote)

Best for server environments. You need a running `unoserver`.

```yaml
# compose.yml
services:
  unoserver:
    image: libreofficedocker/libreoffice-unoserver:3.22
    ports:
      - "2003:2003"
```

```typescript
import { LibreOffice, UnoClient, UnoServer } from "libre-convert-effect";
import { NodeContext, NodeHttpClient } from "@effect/platform-node";
import { Effect, Layer } from "effect";

const program = Effect.gen(function* () {
  const libre = yield* LibreOffice;
  yield* libre.convertLocalFile("input.docx", "output.pdf");
});

const UnoLayer = LibreOffice.Uno.pipe(
  Layer.provide(UnoClient.Default),
  Layer.provide(UnoServer.Remote) // Defaults to localhost:2003
  // Layer.provide(UnoServer.remoteWithURL("http://unoserver:2003/RPC2"))
);

program.pipe(
  Effect.provide(UnoLayer),
  Effect.provide(NodeHttpClient.layer),
  Effect.provide(NodeContext.layer),
  Effect.runPromise
);
```
