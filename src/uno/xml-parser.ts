import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser();

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
