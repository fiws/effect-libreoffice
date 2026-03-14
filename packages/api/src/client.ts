import { HttpApiClient } from "@effect/platform";
import type { Effect } from "effect";
import { LibreOfficeApi } from "./domain.ts";

export const make = (options?: Parameters<typeof HttpApiClient.make>[1]) =>
  HttpApiClient.make(LibreOfficeApi, options);

export type LibreOfficeClient = Effect.Effect.Success<ReturnType<typeof make>>;
