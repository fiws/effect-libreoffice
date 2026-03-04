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
import { LibreOfficeError } from "../libreoffice";

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

export const ConvertUrlPayload = Schema.Struct({
  inputUrl: Schema.String.pipe(Schema.nonEmptyString()),
  outputUrl: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  format: Schema.optionalWith(TargetFormat, {
    default: constant("pdf"),
  }),
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
      .addError(LibreOfficeError)
      .annotate(
        OpenApi.Description,
        "Convert a local file to another format using LibreOffice.",
      ),
  )
  .add(
    HttpApiEndpoint.post("convertUrl", "/url")
      .setPayload(ConvertUrlPayload)
      .addSuccess(
        Schema.Union(
          Schema.Struct({ status: Schema.Literal("ok") }),
          Schema.Uint8ArrayFromSelf.pipe(
            HttpApiSchema.withEncoding({
              kind: "Uint8Array",
              contentType: "application/octet-stream",
            }),
          ),
        ).annotations({
          description:
            "A stream of the converted file if no outputUrl provided, or { status: 'ok' } if outputUrl was provided.",
        }),
      )
      .addError(LibreOfficeError)
      .annotate(OpenApi.Description, "Convert a document from a URL."),
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
