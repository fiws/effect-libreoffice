import { Effect, Schema } from "effect";
import { Multipart } from "effect/unstable/http";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { LibreOffice } from "effect-libreoffice";

// #MARK: Domain Schemas
export const TargetFormat = Schema.Literals([
  "pdf",
  "html",
  "docx",
  "txt",
  "png",
  "jpg",
]).annotate({
  identifier: "TargetFormat",
  description: "The target format to convert the file to.",
  examples: ["pdf"],
});

export const ConvertUrlPayload = Schema.Struct({
  inputUrl: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  outputUrl: Schema.optional(
    Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  ),
  format: TargetFormat.pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed("pdf")),
  ),
});

// #MARK: API Groups
export const ConversionApi = HttpApiGroup.make("conversion")
  .add(
    HttpApiEndpoint.post("convert", "/upload", {
      payload: Schema.Struct({
        file: Multipart.SingleFileSchema,
        format: TargetFormat.pipe(
          Schema.withDecodingDefaultTypeKey(Effect.succeed("pdf")),
          Schema.annotate({
            description: "Target format for the conversion. Defaults to 'pdf'.",
          }),
        ),
      }).pipe(HttpApiSchema.asMultipart()),
      success: Schema.Uint8Array.pipe(
        HttpApiSchema.asUint8Array({
          contentType: "application/octet-stream",
        }),
        Schema.annotate({
          description: "The converted file.",
        }),
      ),
      error: LibreOffice.LibreOfficeError,
    }).annotate(
      OpenApi.Description,
      "Convert a local file to another format using LibreOffice.",
    ),
  )
  .add(
    HttpApiEndpoint.post("convertUrl", "/url", {
      payload: ConvertUrlPayload,
      success: [
        Schema.Struct({ status: Schema.Literal("ok") }),
        Schema.Uint8Array.pipe(
          HttpApiSchema.asUint8Array({
            contentType: "application/octet-stream",
          }),
          Schema.annotate({
            description: "The converted file when outputUrl is omitted.",
          }),
        ),
      ],
      error: LibreOffice.LibreOfficeError,
    }).annotate(OpenApi.Description, "Convert a document from a URL."),
  )
  .prefix("/conversion");

export const ManagementApi = HttpApiGroup.make("management").add(
  HttpApiEndpoint.get("health", "/health", {
    success: Schema.Struct({ status: Schema.Literal("ok") }),
  }).annotate(OpenApi.Description, "Check the service health status."),
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
