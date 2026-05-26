import { createClient } from "chips-sdk";
import { createSdkLogger, createTraceId } from "../../config/logging";

export const videoPlayerTraceId = createTraceId("video-player");

export const chipsClient = createClient({
  logger: createSdkLogger({
    scope: "sdk",
    traceId: videoPlayerTraceId,
  }),
});

