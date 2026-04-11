import type { CoreClient } from "../types/client";

export interface AssociationCapabilities {
  fileAssociation: boolean;
  urlScheme: boolean;
  shareTarget: boolean;
}

export interface AssociationOpenPathResult {
  targetPath: string;
  extension: string;
  mode: "card" | "box" | "plugin" | "shell";
  windowId?: string;
  pluginId?: string;
}

export interface AssociationOpenUrlResult {
  url: string;
  mode: "external";
}

export type AssociationOpenResult = AssociationOpenPathResult | AssociationOpenUrlResult;

export interface AssociationApi {
  getCapabilities(): Promise<AssociationCapabilities>;
  openPath(path: string): Promise<AssociationOpenPathResult>;
  openUrl(url: string): Promise<AssociationOpenUrlResult>;
}

export function createAssociationApi(client: CoreClient): AssociationApi {
  return {
    async getCapabilities() {
      const result = await client.invoke<Record<string, never>, { capabilities: AssociationCapabilities }>(
        "association.getCapabilities",
        {}
      );
      return result.capabilities;
    },
    async openPath(path) {
      const result = await client.invoke<{ path: string }, { result: AssociationOpenPathResult }>("association.openPath", {
        path,
      });
      return result.result;
    },
    async openUrl(url) {
      const result = await client.invoke<{ url: string }, { result: AssociationOpenUrlResult }>("association.openUrl", {
        url,
      });
      return result.result;
    },
  };
}
