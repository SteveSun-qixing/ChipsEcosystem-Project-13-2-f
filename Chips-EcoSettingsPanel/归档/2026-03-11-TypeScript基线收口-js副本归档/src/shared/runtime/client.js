import { createClient } from "chips-sdk";
let cachedClient = null;
export function getChipsClient() {
    if (!cachedClient) {
        cachedClient = createClient({ environment: "auto" });
    }
    return cachedClient;
}
