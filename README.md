# effect-libreoffice

[![NPM Version](https://img.shields.io/npm/v/effect-libreoffice)](https://www.npmjs.com/package/effect-libreoffice)
[![GitHub License](https://img.shields.io/github/license/fiws/effect-libreoffice)](https://github.com/fiws/effect-libreoffice/blob/main/LICENSE)
[![Effect: yes](https://img.shields.io/badge/effect-yes-blue)](https://effect.website/)

A Effect-based wrapper for LibreOffice, providing multiple strategies for document conversion.

## Implementations

This library offers two distinct implementations for interacting with LibreOffice:

1.  **LibreOffice CLI (`LibreOffice.layerCli`)**: Uses the `soffice` command-line tool directly.
2.  **Uno (`LibreOffice.layerUno`)**: Connects to a running `unoserver` instance.

### Comparison

| Feature         | CLI (`layerCli`)                         | Uno (`layerUno`)                                           |
| :-------------- | :--------------------------------------- | :--------------------------------------------------------- |
| **Method**      | Spawns a new process for each conversion | Connects to a long-running server                          |
| **Performance** | Slower (~440ms/file)                     | Fast (~60ms/file)                                          |
| **Setup**       | Requires LibreOffice installed locally   | Requires [unoserver](https://github.com/unoconv/unoserver) |
| **Best For**    | CLI tools, low volume, simple setup      | Servers, high volume, performance critical                 |

## Usage

### Functional API (Pipeable)

For a more functional approach, you can use the `Conversion` module.

```typescript
import { Conversion, LibreOffice } from "effect-libreoffice";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";

const program = Conversion.fromFile("input.docx").pipe(
  Conversion.toFile("output.pdf", { format: "pdf" }),
);

program.pipe(
  Effect.provide(LibreOffice.layerCli),
  Effect.provide(NodeContext.layer),
  Effect.runPromise,
);
```

### Default Implementation (CLI)

Best for quick scripts or when you can't run a unoserver.

```typescript
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { LibreOffice } from "effect-libreoffice";

const program = Effect.gen(function* () {
  const libre = yield* LibreOffice;
  yield* libre.convertLocalFile("input.docx", "output.pdf");
});

const Layers = LibreOffice.layerCli.pipe(Layer.provide(NodeContext.layer));

program.pipe(Effect.provide(Layers), Effect.runPromise);
```

### Uno Implementation (Start Server)

Best for servers, has a lot better performance. This starts a unoserver for you. You will need to have [unoserver](https://github.com/unoconv/unoserver) binary installed and available in your PATH.

```typescript
import { NodeContext, NodeHttpClient } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { LibreOffice, UnoServer } from "effect-libreoffice";

const program = Effect.gen(function* () {
  const libre = yield* LibreOffice;
  yield* libre.convertLocalFile("input.docx", "output.pdf");
});

const Layers = LibreOffice.layerUno.pipe(
  Layer.provide(UnoServer.Default), // This will start a unoserver
  Layer.provide(NodeContext.layer),
  Layer.provide(NodeHttpClient.layer),
);

program.pipe(Effect.provide(Layers), Effect.runPromise);
```

### Uno Implementation (Remote)

If you want to manage the [unoserver](https://github.com/unoconv/unoserver) yourself, you can use the remote implementation of Uno.

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
import { NodeHttpClient } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { LibreOffice, UnoServer } from "effect-libreoffice";

const program = Effect.gen(function* () {
  const libre = yield* LibreOffice;
  yield* libre.convertLocalFile("input.docx", "output.pdf");
});

const UnoLayers = LibreOffice.layerUno.pipe(
  Layer.provide(NodeHttpClient.layerUndici),
  Layer.provide(UnoServer.Remote), // Defaults to localhost:2003
  // or: Layer.provide(UnoServer.remoteWithURL("http://localhost:1111/custom/RPC2"))
);

program.pipe(Effect.provide(UnoLayers), Effect.runPromise);
```
