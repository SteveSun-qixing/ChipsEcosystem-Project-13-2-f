import { createClient, type Client } from "chips-sdk";
import { createSdkLogger } from "../../config/logging";

export const PHOTO_VIEWER_RUNTIME_TRACE_ID = "photo-viewer-runtime";

let clientInstance: Client | null = null;

export function getPhotoViewerClient(): Client {
  if (!clientInstance) {
    clientInstance = createClient({
      logger: createSdkLogger({
        scope: "sdk",
        traceId: PHOTO_VIEWER_RUNTIME_TRACE_ID,
      }),
    });
  }

  return clientInstance;
}

export const chipsClient = getPhotoViewerClient();
