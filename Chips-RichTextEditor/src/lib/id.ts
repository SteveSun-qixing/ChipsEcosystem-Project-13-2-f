const ID_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function getRandomBytes(length: number): Uint8Array | null {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  return null;
}

function buildIdFromRandom(length: number): string {
  const bytes = getRandomBytes(length);
  if (bytes) {
    let id = "";
    for (let index = 0; index < length; index += 1) {
      const value = bytes[index] ?? 0;
      id += ID_CHARS[value % ID_CHARS.length];
    }
    return id;
  }

  let fallback = "";
  for (let index = 0; index < length; index += 1) {
    fallback += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
  }
  return fallback;
}

export function generateId62(length = 10): string {
  if (length <= 0) {
    throw new Error("ID length must be greater than 0");
  }

  const zeroId = "0".repeat(length);
  let nextId = buildIdFromRandom(length);
  while (nextId === zeroId) {
    nextId = buildIdFromRandom(length);
  }
  return nextId;
}
