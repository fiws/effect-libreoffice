import { Schema } from "effect";

const MemberValue = Schema.Union(
  Schema.Struct({ int: Schema.Number }),
  Schema.Struct({ string: Schema.String }),
);

const Member = Schema.Struct({
  name: Schema.String,
  value: MemberValue,
});

const Members = Schema.Array(Member);

export const StructFromMembers = <Fields extends Schema.Struct.Fields>(
  fields: Fields,
) =>
  Schema.transform(Members, Schema.Struct(fields), {
    strict: false,
    decode: (input) => {
      const output: Record<string, string | number> = {};
      for (const member of input) {
        if ("int" in member.value) {
          output[member.name] = member.value.int;
        } else if ("string" in member.value) {
          output[member.name] = member.value.string;
        }
      }
      return output;
    },
    encode: (input) => {
      return Object.entries(input).map(([name, value]) => {
        if (typeof value === "number") {
          return { name, value: { int: value } };
        }
        if (typeof value === "string") {
          return { name, value: { string: value } };
        }
        throw new Error(
          `Unsupported value type for member ${name}: ${typeof value}`,
        );
      });
    },
  });

