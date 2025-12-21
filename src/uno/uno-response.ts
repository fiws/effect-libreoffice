import { Schema } from "effect";

import { StructFromMembers } from "./schema-utils";

/**
 * Schema for fault response
 *
 * ## Original xml
 * ```xml
 * <?xml version='1.0'?>
 * <methodResponse>
 *   <fault>
 *     <value>
 *       <struct>
 *         <member>
 *           <name>faultCode</name>
 *           <value>
 *             <int>1</int>
 *           </value>
 *         </member>
 *         <member>
 *           <name>faultString</name>
 *           <value>
 *             <string>&lt;class 'RuntimeError'&gt;:Path /tmp/test-convert/test.txt does not exist.</string>
 *           </value>
 *         </member>
 *       </struct>
 *     </value>
 *   </fault>
 * </methodResponse>
 * ```
 */
const UnoFault = Schema.Struct({
  methodResponse: Schema.Struct({
    fault: Schema.Struct({
      value: Schema.Struct({
        struct: Schema.Struct({
          member: StructFromMembers({
            faultCode: Schema.Number,
            faultString: Schema.String,
          }),
        }),
      }),
    }),
  }),
}).pipe(
  Schema.transform(
    Schema.Struct({
      faultCode: Schema.Number,
      faultString: Schema.String,
    }),
    {
      strict: true,
      decode: (input) => input.methodResponse.fault.value.struct.member,
      encode: (input) => ({
        methodResponse: {
          fault: {
            value: {
              struct: {
                member: input,
              },
            },
          },
        },
      }),
    },
  ),
  Schema.asSchema,
);

/**
 * Schema for empty response (success)
 *
 * ## Original xml
 * ```xml
 * <?xml version='1.0'?>
 * <methodResponse>
 *   <params>
 *     <param>
 *       <value>
 *         <nil />
 *       </value>
 *     </param>
 *   </params>
 * </methodResponse>
 * ```
 */
export const UnoEmpty = Schema.Struct({
  methodResponse: Schema.Struct({
    params: Schema.Struct({
      param: Schema.Struct({
        value: Schema.Struct({
          nil: Schema.String,
        }),
      }),
    }),
  }),
}).pipe(Schema.asSchema);

export const UnoResponse = Schema.Union(UnoFault, UnoEmpty);

export const decodeUnoResponse = Schema.decodeUnknown(UnoResponse);
