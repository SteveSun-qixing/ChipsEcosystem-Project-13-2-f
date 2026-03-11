import { createClient, type Client } from "chips-sdk";

let cachedClient: Client | null = null;

export function getChipsClient(): Client {
  if (!cachedClient) {
    cachedClient = createClient({ environment: "auto" });
  }
  return cachedClient;
}
