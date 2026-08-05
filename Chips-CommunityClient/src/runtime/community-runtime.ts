import type { Client } from "chips-sdk";
import { configureCommunityApiBaseUrl, setRefreshTokenReader } from "../community/api/client";
import {
  COMMUNITY_REFRESH_TOKEN_REF,
  loadCommunityServerUrl,
} from "../community/lib/server-config";

export {
  COMMUNITY_REFRESH_TOKEN_REF,
  loadCommunityServerUrl,
  saveCommunityServerUrl,
  normalizeCommunityServerUrl,
} from "../community/lib/server-config";

export { configureCommunityApiBaseUrl, setRefreshTokenReader, getCommunityApiBaseUrl } from "../community/api/client";

export function bindCommunityRuntime(client: Client): void {
  setRefreshTokenReader(() => client.credential.get(COMMUNITY_REFRESH_TOKEN_REF));
}
