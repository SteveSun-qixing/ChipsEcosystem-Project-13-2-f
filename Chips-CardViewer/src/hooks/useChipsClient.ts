import { useMemo } from "react";
import { createClient, type Client } from "chips-sdk";
import { createSdkLogger } from "../../config/logging";

export function useChipsClient(traceId: string): Client {
  return useMemo(
    () =>
      createClient({
        logger: createSdkLogger({
          scope: "sdk",
          traceId,
        }),
      }),
    [traceId],
  );
}
