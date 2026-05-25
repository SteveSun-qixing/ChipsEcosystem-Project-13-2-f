import { createClient, type Client } from "chips-sdk";
import { createSdkLogger } from "../../config/logging";

export const CARD_VIEWER_RUNTIME_TRACE_ID = "card-viewer-runtime";

let clientInstance: Client | null = null;

export function getCardViewerClient(): Client {
  if (!clientInstance) {
    clientInstance = createClient({
      logger: createSdkLogger({
        scope: "sdk",
        traceId: CARD_VIEWER_RUNTIME_TRACE_ID,
      }),
    });
  }

  return clientInstance;
}

export const chipsClient = getCardViewerClient();
