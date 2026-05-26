import { createClient, type Client } from "chips-sdk";
import { createSdkLogger } from "../../config/logging";

export const RICH_TEXT_EDITOR_RUNTIME_TRACE_ID = "rich-text-editor-runtime";

let clientInstance: Client | null = null;

export function getRichTextEditorClient(): Client {
  if (!clientInstance) {
    clientInstance = createClient({
      logger: createSdkLogger({
        scope: "sdk",
        traceId: RICH_TEXT_EDITOR_RUNTIME_TRACE_ID,
      }),
    });
  }

  return clientInstance;
}

export const chipsClient = getRichTextEditorClient();

