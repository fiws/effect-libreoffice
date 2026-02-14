import { assert } from "@effect/vitest";
import { Schema } from "effect";
import { describe, it } from "vitest";
import { StructFromMembers } from "./schema-utils.js";

describe("StructFromMembers", () => {
  it("decodes valid members to struct", () => {
    const Target = StructFromMembers({
      count: Schema.Number,
      message: Schema.String,
      optional: Schema.optional(Schema.String),
    });

    const input = [
      { name: "count", value: { int: 42 } },
      { name: "message", value: { string: "hello" } },
    ];

    const result = Schema.decodeSync(Target)(input);
    assert.deepStrictEqual(result, { count: 42, message: "hello" });
  });

  it("encodes struct to members", () => {
    const Target = StructFromMembers({
      count: Schema.Number,
      message: Schema.String,
    });

    const input = { count: 42, message: "hello" };
    const result = Schema.encodeSync(Target)(input);

    // Sort to ensure order independence in test, though map preserves order
    const sorted = [...result].sort((a, b) => a.name.localeCompare(b.name));

    assert.deepStrictEqual(sorted, [
      { name: "count", value: { int: 42 } },
      { name: "message", value: { string: "hello" } },
    ]);
  });

  it("fails decode on mismatched types", () => {
    const Target = StructFromMembers({
      count: Schema.Number, // Expects number
    });

    const input = [{ name: "count", value: { string: "not a number" } }];

    assert.throws(() => Schema.decodeSync(Target)(input));
  });

  it("fails decode on missing required fields", () => {
    const Target = StructFromMembers({
      required: Schema.String,
    });

    const input: unknown[] = [];
    assert.throws(() => Schema.decodeUnknownSync(Target)(input));
  });
});
