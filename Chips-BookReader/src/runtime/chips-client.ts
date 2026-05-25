import { createClient, type Client } from "chips-sdk";
import { createSdkLogger } from "../../config/logging";

export const BOOK_READER_RUNTIME_TRACE_ID = "book-reader-runtime";

let clientInstance: Client | null = null;

export function getBookReaderClient(): Client {
  if (!clientInstance) {
    clientInstance = createClient({
      logger: createSdkLogger({
        scope: "sdk",
        traceId: BOOK_READER_RUNTIME_TRACE_ID,
      }),
    });
  }

  return clientInstance;
}

export const chipsClient = getBookReaderClient();
