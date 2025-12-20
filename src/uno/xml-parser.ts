import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser();

export function parseXML(input: string): unknown {
  return parser.parse(input);
}