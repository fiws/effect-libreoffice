import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser();

/**
 * Parses an XML string into a JavaScript object.
 *
 * @param input - The XML string to parse.
 * @returns The parsed object.
 */
export function parseXML(input: string): unknown {
  return parser.parse(input);
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it("should parse xml", () => {
    const xml = `<root><child>text</child></root>`;
    const result = parseXML(xml);
    expect(result).toEqual({ root: { child: "text" } });
  });
}
