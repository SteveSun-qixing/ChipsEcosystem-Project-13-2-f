import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface SerializerApi {
  encode(payload: unknown): Promise<string>;
  decode<T = unknown>(payload: string): Promise<T>;
  validate(payload: unknown, schema: string): Promise<boolean>;
}

export function createSerializerApi(client: CoreClient): SerializerApi {
  return {
    async encode(payload) {
      const result = await client.invoke<{ payload: unknown }, { payload: string }>(
        "serializer.encode",
        { payload },
      );
      return result.payload;
    },
    async decode<T = unknown>(payload: string) {
      if (!payload || payload.trim().length === 0) {
        throw createError("INVALID_ARGUMENT", "serializer.decode: payload is required.");
      }
      const result = await client.invoke<{ payload: string }, { payload: unknown }>(
        "serializer.decode",
        { payload },
      );
      return result.payload as T;
    },
    async validate(payload, schema) {
      if (typeof schema !== "string") {
        throw createError("INVALID_ARGUMENT", "serializer.validate: schema must be a string.");
      }
      const result = await client.invoke<
        { payload: unknown; schema: string },
        { valid: boolean }
      >("serializer.validate", { payload, schema });
      return result.valid === true;
    },
  };
}
