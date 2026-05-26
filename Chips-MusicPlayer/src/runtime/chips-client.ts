import { createClient, type Client } from "chips-sdk";
import { createSdkLogger, createTraceId } from "../../config/logging";

export const musicPlayerTraceId = createTraceId("music-player");

export const chipsClient: Client = createClient({
  logger: createSdkLogger({
    scope: "sdk",
    traceId: musicPlayerTraceId,
  }),
});

