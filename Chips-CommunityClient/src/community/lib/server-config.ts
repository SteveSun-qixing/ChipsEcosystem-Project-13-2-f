import { appConfig } from "../../../config/app-config";
import type { Client } from "chips-sdk";

export const COMMUNITY_SERVER_URL_CONFIG_KEY = "community.server.baseUrl";
export const COMMUNITY_REFRESH_TOKEN_REF = "community.refreshToken";

export async function loadCommunityServerUrl(client: Client): Promise<string> {
  try {
    const stored = await client.config.get<string>(COMMUNITY_SERVER_URL_CONFIG_KEY);
    const normalized = typeof stored === "string" ? stored.trim() : "";
    return normalized.length > 0 ? normalized : appConfig.communityServerUrl;
  } catch {
    return appConfig.communityServerUrl;
  }
}

export async function saveCommunityServerUrl(client: Client, baseUrl: string): Promise<void> {
  await client.config.set(COMMUNITY_SERVER_URL_CONFIG_KEY, baseUrl.trim().replace(/\/+$/, ""));
}

export async function loadStoredRefreshToken(client: Client): Promise<string | null> {
  try {
    const value = await client.credential.get(COMMUNITY_REFRESH_TOKEN_REF);
    return value && value.trim().length > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function saveStoredRefreshToken(client: Client, refreshToken: string | null): Promise<void> {
  if (!refreshToken) {
    await client.credential.delete(COMMUNITY_REFRESH_TOKEN_REF).catch(() => undefined);
    return;
  }
  await client.credential.set(COMMUNITY_REFRESH_TOKEN_REF, refreshToken);
}

export function normalizeCommunityServerUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let normalized: URL;
  try {
    normalized = new URL(trimmed);
  } catch {
    return null;
  }

  if (normalized.protocol !== "https:" && normalized.protocol !== "http:") {
    return null;
  }

  return normalized.toString().replace(/\/+$/, "");
}
