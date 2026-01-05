import { Data, Effect } from "effect";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser();

export class UnoXMLParseError extends Data.TaggedError("UnoXMLParseError")<{
  cause: unknown;
}> {}

/**
 * Parses an XML string into a JavaScript object.
 * The underlying parser is not very strict, so it will accept many weird strings as XML.
 *
 * @param input - The XML string to parse.
 * @returns An Effect that succeeds with the parsed object or fails with a {@link UnoXMLParseError}.
 */
export function parseXML(
  input: string,
): Effect.Effect<unknown, UnoXMLParseError> {
  return Effect.try({
    try: () => parser.parse(input),
    catch: (cause) => new UnoXMLParseError({ cause }),
  });
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it("should parse xml", () => {
    const xml = `<root><child>text</child></root>`;
    const result = Effect.runSync(parseXML(xml));
    expect(result).toEqual({ root: { child: "text" } });
  });

  it("should fail on invalid xml", () => {
    const xml = `<root><![CDATA[unclosed`;
    const result = Effect.runSyncExit(parseXML(xml));
    expect(result._tag).toBe("Failure");
  });
}
