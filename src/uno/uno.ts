import {
  Command,
  HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
} from "@effect/platform";
import { Effect, flow, Layer, Match, Schedule, Schema, String } from "effect";
import type { OutputPath } from "../shared";
import { decodeUnoResponse } from "./uno-response";
import { parseXML } from "./xml-parser";

/**
 * Error thrown when the uno server fails to start or when a conversion fails.
 */
export class UnoError extends Schema.TaggedError<UnoError>()("UnoError", {
  message: Schema.String,
  reason: Schema.Literal(
    "StartFailed",
    "Unknown",
    "InputFileNotFound",
    "BadOutputExtension",
    "MethodNotFound",
    "PermissionDenied",
  ),
  cause: Schema.optional(Schema.Unknown),
}) {}

/**
 * Tests if the uno server is running at the given URL by attempting to list its methods.
 *
 * @param url - The URL of the uno server to test.
 * @returns An Effect that succeeds if the server is responsive, or fails with a {@link UnoError}.
 */
export const testRunning = Effect.fn(function* (url: string) {
  return yield* Effect.tryPromise({
    try: () =>
      fetch(url, {
        method: "POST",
        body: `<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName><params></params></methodCall>`,
      }),
    catch: (e) =>
      new UnoError({
        reason: "StartFailed",
        message: globalThis.String(e),
      }),
  }).pipe(
    Effect.flatMap((res) =>
      res.ok
        ? Effect.void
        : new UnoError({
            reason: "StartFailed",
            message: "Server not ready",
          }),
    ),
  );
});

/**
 * Ensures the uno server is running at the given URL, retrying with a schedule if it's not yet ready.
 *
 * @param url - The URL of the uno server to wait for.
 * @returns An Effect that succeeds once the server is responsive.
 */
export const ensureRunning = flow(
  testRunning,
  Effect.retry({
    times: 40,
    schedule: Schedule.spaced("250 millis"),
  }),
);

/**
 * UnoServer service. The default implementation will try to spawn a new `unoserver` process.
 */
export class UnoServer extends Effect.Service<UnoServer>()(
  "libre-convert-effect/index/UnoServer",
  {
    scoped: Effect.gen(function* () {
      const acquire = Effect.gen(function* () {
        const process = yield* Command.start(Command.make("unoserver"));

        yield* ensureRunning(`http://localhost:2003/RPC2`).pipe(
          Effect.catchAll(
            () =>
              new UnoError({
                reason: "StartFailed",
                message: "Failed to start server",
              }),
          ),
        );

        return process;
      });

      yield* Effect.acquireRelease(acquire, (process) =>
        Effect.ignore(process.kill()),
      );
      return {
        /**
         * The url of the uno server
         */
        url: "http://localhost:2003/RPC2",
      };
    }),
  },
) {
  /**
   * Creates a {@link UnoServer} that will connect to a remote uno server at the given URL.
   *
   * Note that while any url can be passed, libreoffice will expect the given files
   * to be on disk and will write them to disk, so to be actually useful the server
   * should probably utilize the same file system as your process.
   *
   * This url can be useful if the uno server is running inside a docker (with a mounted file system)
   */
  static remoteWithURL = (url: string) =>
    Layer.scoped(
      UnoServer,
      Effect.gen(function* () {
        yield* ensureRunning(url);
        return UnoServer.make({
          url,
        });
      }),
    );
  /**
   * Static layer that expects the uno server to be running on localhost:2003
   */
  static Remote = UnoServer.remoteWithURL("http://localhost:2003/RPC2");
}

/**
 * Constructs an XML-RPC request body for document conversion.
 *
 * @param input - The absolute path to the input document.
 * @param output - The absolute path where the converted document should be saved.
 * @returns A HttpClientRequest configured for the conversion.
 */
const convertRequest = (input: string, output: string) => {
  const body = `<?xml version="1.0"?>
<methodCall>
  <methodName>convert</methodName>
  <params>
    <param><value><string>${input}</string></value></param>
    <param><value><nil/></value></param>
    <param><value><string>${output}</string></value></param>
  </params>
</methodCall>
`;

  return HttpClientRequest.post("").pipe(HttpClientRequest.bodyText(body));
};

/**
 * Constructs an XML-RPC request body for document comparison.
 *
 * @param input - The absolute path to the original document.
 * @param output - The absolute path where the comparison result should be saved.
 * @returns A HttpClientRequest configured for the comparison.
 */
const compareRequest = (input: string, output: string) => {
  const body = `<?xml version="1.0"?>
<methodCall>
  <methodName>compare</methodName>
  <params>
    <param><value><string>${input}</string></value></param>
    <param><value><nil/></value></param>
    <param><value><string>${output}</string></value></param>
  </params>
</methodCall>
`;

  return HttpClientRequest.post("").pipe(HttpClientRequest.bodyText(body));
};

/**
 * Maps a fault response from the Uno server to a specific {@link UnoError} reason.
 */
const getReason = Match.type<{ faultCode: number; faultString: string }>().pipe(
  Match.when(
    { faultCode: 1, faultString: String.includes("does not exist") },
    () => "InputFileNotFound" as const,
  ),
  Match.when(
    {
      faultCode: 1,
      faultString: String.includes("Unknown export file type"),
    },
    () => "BadOutputExtension" as const,
  ),
  Match.when(
    {
      faultCode: 1,
      faultString: String.includes("is not supported"),
    },
    () => "MethodNotFound" as const,
  ),
  Match.when(
    {
      faultCode: 1,
      faultString: String.includes("PermissionError"),
    },
    () => "PermissionDenied" as const,
  ),
  Match.when(
    {
      faultCode: 1,
      faultString: String.includes("Permission denied"),
    },
    () => "PermissionDenied" as const,
  ),
  Match.orElse(() => "Unknown" as const),
);

const handleResponse = (response: HttpClientResponse.HttpClientResponse) =>
  response.text.pipe(
    Effect.map(parseXML),
    Effect.flatMap(decodeUnoResponse),
    Effect.flatMap((decoded) => {
      if ("faultString" in decoded) {
        return new UnoError({
          reason: getReason(decoded),
          message: decoded.faultString,
          cause: decoded,
        });
      }
      return Effect.succeed(response);
    }),
  );

/**
 * UnoClient service. Provides a high-level API for interacting with a Uno server
 * to perform document conversions and comparisons.
 */
export class UnoClient extends Effect.Service<UnoClient>()(
  "libre-convert-effect/uno/UnoClient",
  {
    scoped: Effect.gen(function* () {
      const { url } = yield* UnoServer;

      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequestInput(flow(HttpClientRequest.prependUrl(url))),
        HttpClient.filterStatusOk,
      );

      return {
        /**
         * The underlying HTTP client used by the UnoClient.
         */
        client,
        /**
         * Converts a document from the specified input path to the specified output path.
         *
         * @param input - The absolute path to the input document.
         * @param output - The absolute path where the converted document should be saved.
         * @returns An Effect that performs the conversion and returns the HTTP response on success.
         */
        convert(input: string, output: OutputPath) {
          return client
            .execute(convertRequest(input, output))
            .pipe(Effect.flatMap(handleResponse));
        },
        /**
         * Compares two documents and saves the comparison result to the specified output path.
         *
         * @param input - The absolute path to the original document.
         * @param output - The absolute path where the comparison result (e.g., a PDF with tracked changes) should be saved.
         * @returns An Effect that performs the comparison and returns the HTTP response on success.
         */
        compare(input: string, output: string) {
          return client
            .execute(compareRequest(input, output))
            .pipe(Effect.flatMap(handleResponse));
        },
      };
    }),
  },
) {}
