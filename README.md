# effect-libreoffice

[![NPM Version](https://img.shields.io/npm/v/effect-libreoffice)](https://www.npmjs.com/package/effect-libreoffice)
[![GitHub License](https://img.shields.io/github/license/fiws/effect-libreoffice)](https://github.com/fiws/effect-libreoffice/blob/main/LICENSE)
[![Effect: yes](https://img.shields.io/badge/effect-yes-blue)](https://effect.website/)

An Effect-based wrapper for document conversion using LibreOffice compiled to WebAssembly.

## Overview

Starting with version `2.x.x`, `effect-libreoffice` executes conversions directly within your Node.js application using `@matbee/libreoffice-converter`. It requires **no local installation** of LibreOffice and **no external servers**, making it highly portable and easy to use.

### Installation

Install the library along with its peer dependencies:

```bash
pnpm add effect-libreoffice effect @effect/platform
```

You must also install the WebAssembly converter package:

```bash
pnpm add @matbee/libreoffice-converter
```

## Usage

### Direct Service Usage

For lower-level access, you can use the `LibreOffice` service directly. This provides methods like `convert`, `getPageCount`, `getDocumentInfo`, and more.

```typescript
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform";
import { LibreOffice } from "effect-libreoffice";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const libre = yield* LibreOffice.LibreOffice;
  
  // Read the input document into a Uint8Array
  const inputData = yield* fs.readFile("input.docx");
  
  // Convert it using the LibreOffice engine
  const result = yield* libre.convert(inputData, {
    inputFormat: "docx",
    outputFormat: "pdf",
  });
  
  // Write the resulting Uint8Array to disk
  yield* fs.writeFile("output.pdf", result.data);
  
  // You can also access other document utilities:
  const pageCount = yield* libre.getPageCount(inputData, { inputFormat: "docx" });
  console.log(`The document has ${pageCount} pages.`);
});

const MainLayer = Layer.mergeAll(
  LibreOffice.layer,
  NodeContext.layer
);

program.pipe(Effect.provide(MainLayer), Effect.runPromise);
```

## Available Service Methods

The `LibreOffice.LibreOffice` service exposes the following WASM-based operations:

- `convert`: Convert documents to a different format
- `getPageCount`: Get the number of pages/parts in a document
- `getDocumentInfo`: Get document type and valid output formats
- `renderPage`: Render a single page as an image
- `renderPagePreviews`: Render multiple page previews
- `renderPageFullQuality`: Render a page at full quality natively
- `getDocumentText`: Extract text content from a document
- `getPageNames`: Get page or slide names from a document
- `openDocument` / `editorOperation` / `closeDocument`: Session-based document editing
