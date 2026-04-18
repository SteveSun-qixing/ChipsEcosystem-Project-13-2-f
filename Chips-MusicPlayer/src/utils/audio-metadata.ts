import { resolveExtension } from "./music-player";

export interface EmbeddedArtwork {
  mimeType: string;
  bytes: Uint8Array;
  description?: string;
}

export interface EmbeddedAudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: EmbeddedArtwork;
  lyricsText?: string;
  timedLyricsText?: string;
}

function toUint8Array(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function readUInt32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function readUInt24BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
}

function readSyncSafeInt(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] & 0x7f) << 21) | ((bytes[offset + 1] & 0x7f) << 14) | ((bytes[offset + 2] & 0x7f) << 7) | (bytes[offset + 3] & 0x7f);
}

function decodeIso88591(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

function decodeUtf16(bytes: Uint8Array, bigEndian = false): string {
  let view = bytes;
  let resolvedBigEndian = bigEndian;

  if (view.length >= 2) {
    if (view[0] === 0xfe && view[1] === 0xff) {
      resolvedBigEndian = true;
      view = view.slice(2);
    } else if (view[0] === 0xff && view[1] === 0xfe) {
      resolvedBigEndian = false;
      view = view.slice(2);
    }
  }

  if (resolvedBigEndian) {
    const swapped = new Uint8Array(view.length);
    for (let index = 0; index < view.length; index += 2) {
      swapped[index] = view[index + 1] ?? 0;
      swapped[index + 1] = view[index] ?? 0;
    }
    view = swapped;
  }

  return new TextDecoder("utf-16le", { fatal: false }).decode(view).replace(/\u0000+$/g, "");
}

function decodeEncodedText(bytes: Uint8Array, encoding: number): string {
  switch (encoding) {
    case 0:
      return decodeIso88591(bytes).replace(/\u0000+$/g, "");
    case 1:
      return decodeUtf16(bytes);
    case 2:
      return decodeUtf16(bytes, true);
    case 3:
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\u0000+$/g, "");
    default:
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\u0000+$/g, "");
  }
}

function readEncodedTerminatedText(bytes: Uint8Array, startOffset: number, encoding: number): { text: string; nextOffset: number } {
  if (encoding === 1 || encoding === 2) {
    for (let offset = startOffset; offset + 1 < bytes.length; offset += 2) {
      if (bytes[offset] === 0 && bytes[offset + 1] === 0) {
        return {
          text: decodeEncodedText(bytes.slice(startOffset, offset), encoding),
          nextOffset: offset + 2,
        };
      }
    }

    return {
      text: decodeEncodedText(bytes.slice(startOffset), encoding),
      nextOffset: bytes.length,
    };
  }

  for (let offset = startOffset; offset < bytes.length; offset += 1) {
    if (bytes[offset] === 0) {
      return {
        text: decodeEncodedText(bytes.slice(startOffset, offset), encoding),
        nextOffset: offset + 1,
      };
    }
  }

  return {
    text: decodeEncodedText(bytes.slice(startOffset), encoding),
    nextOffset: bytes.length,
  };
}

function stripUnsynchronization(bytes: Uint8Array): Uint8Array {
  const cleaned: number[] = [];

  for (let index = 0; index < bytes.length; index += 1) {
    const current = bytes[index];
    const next = bytes[index + 1];
    cleaned.push(current);

    if (current === 0xff && next === 0x00) {
      index += 1;
    }
  }

  return Uint8Array.from(cleaned);
}

function mergePreferredText(current: string | undefined, next: string | undefined): string | undefined {
  return current?.trim() || next?.trim() || undefined;
}

function formatLrcTimestamp(timeMs: number): string {
  const safe = Math.max(0, timeMs);
  const minutes = Math.floor(safe / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  const centiseconds = Math.floor((safe % 1_000) / 10);
  return `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}]`;
}

function parseSyltFrame(payload: Uint8Array): string | undefined {
  if (payload.length < 10) {
    return undefined;
  }

  const encoding = payload[0] ?? 0;
  const timestampFormat = payload[4] ?? 0;
  let offset = 6;
  offset = readEncodedTerminatedText(payload, offset, encoding).nextOffset;

  if (timestampFormat !== 1) {
    return undefined;
  }

  const lines: string[] = [];

  while (offset < payload.length) {
    const parsedText = readEncodedTerminatedText(payload, offset, encoding);
    offset = parsedText.nextOffset;
    if (offset + 4 > payload.length) {
      break;
    }

    const timestamp = readUInt32BE(payload, offset);
    offset += 4;

    const text = parsedText.text.trim();
    if (text) {
      lines.push(`${formatLrcTimestamp(timestamp)}${text}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : undefined;
}

function parseId3v2(bytes: Uint8Array): EmbeddedAudioMetadata {
  if (bytes.length < 10 || decodeIso88591(bytes.slice(0, 3)) !== "ID3") {
    return {};
  }

  const version = bytes[3] ?? 0;
  const flags = bytes[5] ?? 0;
  const tagSize = readSyncSafeInt(bytes, 6);
  let tagBody = bytes.slice(10, 10 + tagSize);

  if ((flags & 0x80) !== 0) {
    tagBody = stripUnsynchronization(tagBody);
  }

  if ((flags & 0x40) !== 0 && tagBody.length >= 4) {
    const extendedHeaderSize = version === 4 ? readSyncSafeInt(tagBody, 0) : readUInt32BE(tagBody, 0) + 4;
    tagBody = tagBody.slice(Math.min(extendedHeaderSize, tagBody.length));
  }

  const metadata: EmbeddedAudioMetadata = {};

  for (let offset = 0; offset + 10 <= tagBody.length; ) {
    const frameId = decodeIso88591(tagBody.slice(offset, offset + 4));
    if (!frameId.trim() || /^\x00+$/.test(frameId)) {
      break;
    }

    const frameSize = version === 4 ? readSyncSafeInt(tagBody, offset + 4) : readUInt32BE(tagBody, offset + 4);
    if (frameSize <= 0 || offset + 10 + frameSize > tagBody.length) {
      break;
    }

    const payload = tagBody.slice(offset + 10, offset + 10 + frameSize);
    switch (frameId) {
      case "TIT2":
        metadata.title = mergePreferredText(metadata.title, decodeEncodedText(payload.slice(1), payload[0] ?? 0).trim());
        break;
      case "TPE1":
        metadata.artist = mergePreferredText(metadata.artist, decodeEncodedText(payload.slice(1), payload[0] ?? 0).trim());
        break;
      case "TALB":
        metadata.album = mergePreferredText(metadata.album, decodeEncodedText(payload.slice(1), payload[0] ?? 0).trim());
        break;
      case "USLT": {
        const encoding = payload[0] ?? 0;
        const descriptor = readEncodedTerminatedText(payload, 4, encoding);
        const lyricsText = decodeEncodedText(payload.slice(descriptor.nextOffset), encoding).trim();
        metadata.lyricsText = mergePreferredText(metadata.lyricsText, lyricsText);
        break;
      }
      case "SYLT":
        metadata.timedLyricsText = mergePreferredText(metadata.timedLyricsText, parseSyltFrame(payload));
        break;
      case "APIC": {
        const encoding = payload[0] ?? 0;
        const mime = readEncodedTerminatedText(payload, 1, 0);
        const pictureTypeOffset = mime.nextOffset;
        const description = readEncodedTerminatedText(payload, pictureTypeOffset + 1, encoding);
        const imageBytes = payload.slice(description.nextOffset);
        if (imageBytes.length > 0) {
          metadata.artwork = {
            mimeType: mime.text || "image/jpeg",
            bytes: imageBytes,
            description: description.text,
          };
        }
        break;
      }
      default:
        break;
    }

    offset += 10 + frameSize;
  }

  return metadata;
}

function parseVorbisComments(bytes: Uint8Array): Record<string, string> {
  const comments: Record<string, string> = {};
  if (bytes.length < 8) {
    return comments;
  }

  let offset = 0;
  const vendorLength = readUInt32LE(bytes, offset);
  offset += 4 + vendorLength;
  if (offset + 4 > bytes.length) {
    return comments;
  }

  const commentCount = readUInt32LE(bytes, offset);
  offset += 4;

  for (let index = 0; index < commentCount; index += 1) {
    if (offset + 4 > bytes.length) {
      break;
    }

    const length = readUInt32LE(bytes, offset);
    offset += 4;
    if (offset + length > bytes.length) {
      break;
    }

    const entry = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(offset, offset + length));
    offset += length;

    const separatorIndex = entry.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = entry.slice(0, separatorIndex).trim().toUpperCase();
    const value = entry.slice(separatorIndex + 1).trim();
    if (key && value) {
      comments[key] = value;
    }
  }

  return comments;
}

function parseFlacPicture(bytes: Uint8Array): EmbeddedArtwork | undefined {
  if (bytes.length < 32) {
    return undefined;
  }

  let offset = 0;
  offset += 4;

  const mimeLength = readUInt32BE(bytes, offset);
  offset += 4;
  const mimeType = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(offset, offset + mimeLength));
  offset += mimeLength;

  const descriptionLength = readUInt32BE(bytes, offset);
  offset += 4;
  const description = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(offset, offset + descriptionLength));
  offset += descriptionLength;

  offset += 16;
  const dataLength = readUInt32BE(bytes, offset);
  offset += 4;

  if (offset + dataLength > bytes.length) {
    return undefined;
  }

  return {
    mimeType: mimeType || "image/jpeg",
    bytes: bytes.slice(offset, offset + dataLength),
    description,
  };
}

function parseFlac(bytes: Uint8Array): EmbeddedAudioMetadata {
  if (bytes.length < 4 || decodeIso88591(bytes.slice(0, 4)) !== "fLaC") {
    return {};
  }

  const metadata: EmbeddedAudioMetadata = {};
  let offset = 4;
  let isLastBlock = false;

  while (!isLastBlock && offset + 4 <= bytes.length) {
    const header = bytes[offset] ?? 0;
    isLastBlock = (header & 0x80) !== 0;
    const blockType = header & 0x7f;
    const blockLength = readUInt24BE(bytes, offset + 1);
    offset += 4;

    if (offset + blockLength > bytes.length) {
      break;
    }

    const block = bytes.slice(offset, offset + blockLength);
    offset += blockLength;

    if (blockType === 4) {
      const comments = parseVorbisComments(block);
      metadata.title = mergePreferredText(metadata.title, comments.TITLE);
      metadata.artist = mergePreferredText(metadata.artist, comments.ARTIST);
      metadata.album = mergePreferredText(metadata.album, comments.ALBUM);
      metadata.lyricsText =
        mergePreferredText(metadata.lyricsText, comments.LYRICS) ??
        mergePreferredText(metadata.lyricsText, comments.UNSYNCEDLYRICS) ??
        mergePreferredText(metadata.lyricsText, comments["UNSYNCED LYRICS"]);
    } else if (blockType === 6) {
      metadata.artwork = metadata.artwork ?? parseFlacPicture(block);
    }
  }

  return metadata;
}

export function parseEmbeddedAudioMetadata(input: {
  bytes: ArrayBuffer | Uint8Array;
  fileName?: string;
  mimeType?: string;
}): EmbeddedAudioMetadata {
  const bytes = toUint8Array(input.bytes);
  const mimeType = input.mimeType?.trim().toLowerCase();
  const extension = resolveExtension(input.fileName ?? "");

  if (bytes.length >= 3 && decodeIso88591(bytes.slice(0, 3)) === "ID3") {
    return parseId3v2(bytes);
  }

  if (bytes.length >= 4 && decodeIso88591(bytes.slice(0, 4)) === "fLaC") {
    return parseFlac(bytes);
  }

  if (mimeType === "audio/mpeg" || extension === ".mp3") {
    return parseId3v2(bytes);
  }

  if (mimeType === "audio/flac" || extension === ".flac") {
    return parseFlac(bytes);
  }

  return {};
}
