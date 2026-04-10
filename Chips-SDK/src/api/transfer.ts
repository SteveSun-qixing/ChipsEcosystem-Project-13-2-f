import type { CoreClient } from "../types/client";

export interface TransferShareInput {
  title?: string;
  text?: string;
  url?: string;
  files?: string[];
}

export interface TransferApi {
  openPath(path: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  revealInShell(path: string): Promise<void>;
  share(input: TransferShareInput): Promise<boolean>;
}

export function createTransferApi(client: CoreClient): TransferApi {
  return {
    async openPath(path) {
      await client.invoke("transfer.openPath", { path });
    },
    async openExternal(url) {
      await client.invoke("transfer.openExternal", { url });
    },
    async revealInShell(path) {
      await client.invoke("transfer.revealInShell", { path });
    },
    async share(input) {
      const result = await client.invoke<{ input: TransferShareInput }, { shared: boolean }>("transfer.share", {
        input,
      });
      return result.shared === true;
    },
  };
}
