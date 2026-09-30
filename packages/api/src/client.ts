import { HttpApiClient } from "effect/http-api";
import { LibreOfficeApi } from "./domain.ts";

export const make = (options?: Parameters<typeof HttpApiClient.make>[1]) =>
  HttpApiClient.make(LibreOfficeApi, options);

export type LibreOfficeClient = HttpApiClient.ForApi<typeof LibreOfficeApi>;
