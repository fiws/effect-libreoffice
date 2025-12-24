# effect-libreoffice

[![NPM Version](https://img.shields.io/npm/v/effect-libreoffice)](https://www.npmjs.com/package/effect-libreoffice)
[![GitHub License](https://img.shields.io/github/license/fiws/effect-libreoffice)](https://github.com/fiws/effect-libreoffice/blob/main/LICENSE)
[![Effect: yes](https://img.shields.io/badge/effect-yes-blue)](https://effect.website/)

A Effect-based wrapper for LibreOffice, providing multiple strategies for document conversion.

## Implementations

This library offers two distinct implementations for interacting with LibreOffice:

1.  **LibreOfficeCmd (Default)**: Uses the `soffice` command-line tool directly.
2.  **UnoClient (Uno)**: Connects to a running `unoserver` instance.

### Comparison

| Feature         | LibreOfficeCmd (Default)                 | UnoClient (Uno)                            |
| :-------------- | :--------------------------------------- | :----------------------------------------- |
| **Method**      | Spawns a new process for each conversion | Connects to a long-running server          |
| **Performance** | Slower (~440ms/file)                     | Fast (~60ms/file)                          |
| **Setup**       | Requires LibreOffice installed locally   | Requires `unoserver`                       |
| **Best For**    | CLI tools, low volume, simple setup      | Servers, high volume, performance critical |

## Usage

### Default Implementation (CLI)

Best for quick scripts or when you don't want to manage a separate server.

```typescript
import { LibreOffice } from "effect-libreoffice";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";

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
    volumes:
      - /tmp:/tmp # some shared directory where files can be written and read
```

```typescript
import { LibreOffice, UnoClient, UnoServer } from "effect-libreoffice";
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
