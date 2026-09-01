import { assert, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { LibreOffice } from "effect-libreoffice";
import { LibreOfficeNode } from "effect-libreoffice/node";

const inputData = new TextEncoder().encode("Hello PDF");
const inputOptions = { inputFormat: "txt" } as const;

it.layer(LibreOfficeNode.layer)("LibreOffice (Node)", (it) => {
  it.effect("converts a document", () =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const result = yield* libre.convert(inputData, {
        ...inputOptions,
        outputFormat: "pdf",
      });

      assert.strictEqual(result.mimeType, "application/pdf");
      assert.strictEqual(
        new TextDecoder().decode(result.data.slice(0, 4)),
        "%PDF",
      );
    }),
  );

  it.effect("handles two conversions in parallel", () =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const options = { ...inputOptions, outputFormat: "pdf" } as const;

      const results = yield* Effect.all(
        [libre.convert(inputData, options), libre.convert(inputData, options)],
        { concurrency: "unbounded" },
      );

      for (const result of results) {
        assert.strictEqual(
          new TextDecoder().decode(result.data.slice(0, 4)),
          "%PDF",
        );
      }
    }),
  );

  it.effect("gets the page count", () =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const result = yield* libre.getPageCount(inputData, inputOptions);

      assert.strictEqual(result, 1);
    }),
  );

  it.effect("gets document information", () =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const result = yield* libre.getDocumentInfo(inputData, inputOptions);

      assert.strictEqual(result.pageCount, 1);
      assert.strictEqual(typeof result.documentTypeName, "string");
      assert.include(result.validOutputFormats, "pdf");
    }),
  );

  it.effect("renders a page", () =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const result = yield* libre.renderPage(inputData, inputOptions, 0, 64);

      assert.strictEqual(result.page, 0);
      assert.strictEqual(result.width, 64);
      assert.isAbove(result.height, 0);
      assert.strictEqual(result.data.length, result.width * result.height * 4);
    }),
  );

  it.effect("renders page previews", () =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const result = yield* libre.renderPagePreviews(inputData, inputOptions, {
        width: 64,
      });

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]?.page, 0);
      assert.strictEqual(result[0]?.width, 64);
      assert.isAbove(result[0]?.data.length ?? 0, 0);
    }),
  );

  it.effect("renders a page at full quality", () =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const result = yield* libre.renderPageFullQuality(
        inputData,
        inputOptions,
        0,
        { dpi: 72, maxDimension: 128 },
      );

      assert.strictEqual(result.page, 0);
      assert.isAtMost(result.width, 128);
      assert.isAtMost(result.height, 128);
      assert.isAbove(result.dpi, 0);
      assert.strictEqual(result.data.length, result.width * result.height * 4);
    }),
  );

  it.effect.fails("FIXME: extracts document text", () =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const result = yield* libre.getDocumentText(inputData, "txt");

      assert(Option.isSome(result), "document text is missing");
      assert.include(result.value, "Hello PDF");
    }),
  );

  it.effect("gets page names", () =>
    Effect.gen(function* () {
      const libre = yield* LibreOffice.LibreOffice;
      const result = yield* libre.getPageNames(inputData, "txt");

      assert.strictEqual(result.length, 1);
      assert.strictEqual(typeof result[0], "string");
    }),
  );
});
