import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface CredentialApi {
  get(ref: string): Promise<string | null>;
  set(ref: string, value: string): Promise<void>;
  delete(ref: string): Promise<void>;
  rotate(ref: string): Promise<string>;
}

function assertRef(ref: string, action: string): void {
  if (!ref || ref.trim().length === 0) {
    throw createError("INVALID_ARGUMENT", `${action}: ref is required.`);
  }
}

export function createCredentialApi(client: CoreClient): CredentialApi {
  return {
    async get(ref) {
      assertRef(ref, "credential.get");
      const result = await client.invoke<{ ref: string }, { value: string | null }>("credential.get", { ref });
      return result.value;
    },
    async set(ref, value) {
      assertRef(ref, "credential.set");
      if (typeof value !== "string") {
        throw createError("INVALID_ARGUMENT", "credential.set: value must be a string.");
      }
      await client.invoke("credential.set", { ref, value });
    },
    async delete(ref) {
      assertRef(ref, "credential.delete");
      await client.invoke("credential.delete", { ref });
    },
    async rotate(ref) {
      assertRef(ref, "credential.rotate");
      const result = await client.invoke<{ ref: string }, { value: string }>("credential.rotate", { ref });
      return result.value;
    },
  };
}
