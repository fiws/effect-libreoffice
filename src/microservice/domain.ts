import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  Multipart,
  OpenApi,
} from "@effect/platform";
import { Schema } from "effect";
import { constant } from "effect/Function";

// #MARK: Domain Errors
export class ConversionError extends Schema.TaggedError<ConversionError>()(
  "ConversionError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

// #MARK: Domain Schemas
export const TargetFormat = Schema.Literal(
  "pdf",
  "html",
  "docx",
  "txt",
  "png",
  "jpg",
).annotations({
  identifier: "TargetFormat",
  description: "The target format to convert the file to.",
  examples: ["pdf"],
});

// #MARK: API Groups
export const ConversionApi = HttpApiGroup.make("conversion")
  .add(
    HttpApiEndpoint.post("convert", "/upload")
      .setPayload(
        HttpApiSchema.Multipart(
          Schema.Struct({
            file: Multipart.SingleFileSchema,
            format: Schema.optionalWith(TargetFormat, {
              default: constant("pdf"),
            }).annotations({
              description:
                "Target format for the conversion. Defaults to 'pdf'.",
            }),
          }),
        ),
      )
      .addSuccess(
        Schema.Uint8ArrayFromSelf.pipe(
          HttpApiSchema.withEncoding({
            kind: "Uint8Array",
            contentType: "application/octet-stream",
          }),
        ).annotations({
          description: "A stream of the converted file.",
        }),
      )
      .addError(ConversionError)
      .annotate(
        OpenApi.Description,
        "Convert a local file to another format using LibreOffice.",
      ),
  )
  .prefix("/conversion");

export const ManagementApi = HttpApiGroup.make("management").add(
  HttpApiEndpoint.get("health", "/health")
    .addSuccess(Schema.Struct({ status: Schema.Literal("ok") }))
    .annotate(OpenApi.Description, "Check the service health status."),
);

// #MARK: Main API
export const LibreOfficeApi = HttpApi.make("LibreOffice")
  .add(ConversionApi)
  .add(ManagementApi)
  .annotate(OpenApi.Title, "LibreOffice Microservice")
  .annotate(
    OpenApi.Description,
    `A microservice for converting documents using LibreOffice.`,
  )
  .prefix("/v1")
  .annotate(OpenApi.Version, "1.0.0");
