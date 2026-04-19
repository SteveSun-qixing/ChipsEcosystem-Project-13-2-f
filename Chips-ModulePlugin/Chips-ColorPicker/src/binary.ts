import { createColorPickerError } from "./errors";
import type { ColorPickerContext } from "./types";

const toOwnedBytes = (value: ArrayBuffer | ArrayBufferView): Uint8Array => {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value.slice(0));
  }

  const copy = new Uint8Array(value.byteLength);
  copy.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  return copy;
};

const isBufferJsonPayload = (value: unknown): value is { type: "Buffer"; data: number[] } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as { type?: unknown; data?: unknown };
  return candidate.type === "Buffer" && Array.isArray(candidate.data);
};

const decodeBase64ToBytes = (input: string): Uint8Array => {
  const bufferCtor = (globalThis as typeof globalThis & {
    Buffer?: {
      from(data: string, encoding: string): Uint8Array;
    };
  }).Buffer;

  if (bufferCtor) {
    return toOwnedBytes(bufferCtor.from(input, "base64"));
  }

  const decoded = atob(input);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
};

const decodeByteString = (input: string): Uint8Array => {
  const bytes = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    bytes[index] = input.charCodeAt(index) & 0xff;
  }
  return bytes;
};

const shouldDecodeStringAsBase64 = (input: string): boolean => {
  const normalized = input.replace(/\s+/g, "");
  if (normalized.length === 0 || normalized.length % 4 !== 0) {
    return false;
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    return false;
  }

  return normalized.includes("=") || normalized.includes("+") || normalized.includes("/") || /\s/.test(input);
};

export const normalizeBinaryPayload = (value: unknown): Uint8Array => {
  if (value instanceof ArrayBuffer) {
    return toOwnedBytes(value);
  }

  if (ArrayBuffer.isView(value)) {
    return toOwnedBytes(value);
  }

  if (typeof value === "string") {
    return shouldDecodeStringAsBase64(value) ? decodeBase64ToBytes(value) : decodeByteString(value);
  }

  if (isBufferJsonPayload(value)) {
    return Uint8Array.from(value.data);
  }

  if (Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
    return Uint8Array.from(value);
  }

  if (value && typeof value === "object" && "data" in value) {
    return normalizeBinaryPayload((value as { data?: unknown }).data);
  }

  throw createColorPickerError("COLOR_PICKER_IMAGE_SAMPLE_FAILED", "Host file.read did not return binary image data.");
};

export const readBinaryFile = async (ctx: ColorPickerContext, filePath: string): Promise<Uint8Array> => {
  const response = await ctx.host.invoke<{ content?: unknown }>("file.read", {
    path: filePath,
    options: {
      encoding: "binary",
    },
  });

  const payload =
    response && typeof response === "object" && "content" in response
      ? (response as { content?: unknown }).content
      : response;

  return normalizeBinaryPayload(payload);
};
