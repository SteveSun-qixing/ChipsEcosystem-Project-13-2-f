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

interface Mp4Box {
  type: string;
  headerSize: number;
  dataStart: number;
  end: number;
}

interface Mp4DataBox {
  typeIndicator: number;
  bytes: Uint8Array;
}

interface Mp4MetadataItem {
  mean?: string;
  name?: string;
  dataBoxes: Mp4DataBox[];
}

type MetadataTextField = "title" | "artist" | "album";

const MP4_CONTAINER_BOXES = new Set(["moov", "udta", "meta"]);
const VORBIS_TITLE_KEYS = ["TITLE"];
const VORBIS_ARTIST_KEYS = ["ARTIST", "ALBUMARTIST"];
const VORBIS_ALBUM_KEYS = ["ALBUM"];
const VORBIS_TIMED_LYRICS_KEYS = ["SYNCEDLYRICS", "SYNCHRONIZEDLYRICS", "TIMEDLYRICS"];
const VORBIS_LYRICS_KEYS = ["LYRICS", "UNSYNCEDLYRICS", "UNSYNCED LYRICS", "LYRIC", "UNSYNCED_LYRICS"];
const MP4_LYRICS_ALIASES = ["LYRICS", "UNSYNCEDLYRICS", "UNSYNCED LYRICS", "LYRIC"];
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: false });

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

function readUInt64BEAsNumber(bytes: Uint8Array, offset: number): number | undefined {
  if (offset + 8 > bytes.length) {
    return undefined;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = Number(view.getBigUint64(offset, false));
  return Number.isSafeInteger(size) ? size : undefined;
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

function decodeUtf8(bytes: Uint8Array): string {
  return UTF8_DECODER.decode(bytes).replace(/\u0000+$/g, "");
}

function decodeMp4Text(bytes: Uint8Array, typeIndicator: number): string {
  if (typeIndicator === 2) {
    return decodeUtf16(bytes);
  }

  if (bytes.length >= 2 && ((bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0xff && bytes[1] === 0xfe))) {
    return decodeUtf16(bytes);
  }

  return decodeUtf8(bytes);
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

function stripUnsynchronization(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const cleaned: number[] = [];

  for (let index = 0; index < bytes.length; index += 1) {
    const current = bytes[index];
    const next = bytes[index + 1];
    cleaned.push(current);

    if (current === 0xff && next === 0x00) {
      index += 1;
    }
  }

  const normalized = new Uint8Array(new ArrayBuffer(cleaned.length));
  cleaned.forEach((value, index) => {
    normalized[index] = value;
  });
  return normalized;
}

function copySlice(bytes: Uint8Array, start = 0, end = bytes.length): Uint8Array<ArrayBuffer> {
  const normalizedStart = Math.max(0, Math.min(bytes.length, start));
  const normalizedEnd = Math.max(normalizedStart, Math.min(bytes.length, end));
  const source = bytes.subarray(normalizedStart, normalizedEnd);
  const copy = new Uint8Array(new ArrayBuffer(source.byteLength));
  copy.set(source);
  return copy;
}

function normalizeText(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/\u0000/g, "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function mergePreferredText(current: string | undefined, next: string | undefined): string | undefined {
  return normalizeText(current) ?? normalizeText(next);
}

function mergeMetadata(preferred: EmbeddedAudioMetadata, fallback: EmbeddedAudioMetadata): EmbeddedAudioMetadata {
  return {
    title: mergePreferredText(preferred.title, fallback.title),
    artist: mergePreferredText(preferred.artist, fallback.artist),
    album: mergePreferredText(preferred.album, fallback.album),
    artwork: preferred.artwork ?? fallback.artwork,
    lyricsText: mergePreferredText(preferred.lyricsText, fallback.lyricsText),
    timedLyricsText: mergePreferredText(preferred.timedLyricsText, fallback.timedLyricsText),
  };
}

function formatLrcTimestamp(timeMs: number): string {
  const safe = Math.max(0, timeMs);
  const minutes = Math.floor(safe / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  const centiseconds = Math.floor((safe % 1_000) / 10);
  return `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}]`;
}

function looksLikeTimedLyrics(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/.test(value);
}

function assignMetadataText(metadata: EmbeddedAudioMetadata, field: MetadataTextField, value: string | undefined): void {
  metadata[field] = mergePreferredText(metadata[field], value);
}

function assignPreferredMetadataText(metadata: EmbeddedAudioMetadata, field: MetadataTextField, value: string | undefined): void {
  metadata[field] = mergePreferredText(value, metadata[field]);
}

function assignLyrics(metadata: EmbeddedAudioMetadata, value: string | undefined, preferTimed = false): void {
  const normalized = normalizeText(value);
  if (!normalized) {
    return;
  }

  if (preferTimed || looksLikeTimedLyrics(normalized)) {
    metadata.timedLyricsText = mergePreferredText(metadata.timedLyricsText, normalized);
    return;
  }

  metadata.lyricsText = mergePreferredText(metadata.lyricsText, normalized);
}

function assignPreferredLyrics(metadata: EmbeddedAudioMetadata, value: string | undefined, preferTimed = false): void {
  const normalized = normalizeText(value);
  if (!normalized) {
    return;
  }

  if (preferTimed || looksLikeTimedLyrics(normalized)) {
    metadata.timedLyricsText = mergePreferredText(normalized, metadata.timedLyricsText);
    return;
  }

  metadata.lyricsText = mergePreferredText(normalized, metadata.lyricsText);
}

function assignArtwork(metadata: EmbeddedAudioMetadata, artwork: EmbeddedArtwork | undefined): void {
  if (artwork && !metadata.artwork) {
    metadata.artwork = artwork;
  }
}

function detectImageMimeType(bytes: Uint8Array, fallbackTypeIndicator?: number): string | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    decodeIso88591(bytes.slice(0, 4)) === "RIFF" &&
    decodeIso88591(bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  if (bytes.length >= 6 && (decodeIso88591(bytes.slice(0, 6)) === "GIF87a" || decodeIso88591(bytes.slice(0, 6)) === "GIF89a")) {
    return "image/gif";
  }

  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && (bytes[3] === 0x2a || bytes[3] === 0x2b)))
  ) {
    return "image/tiff";
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }

  if (bytes.length >= 12 && decodeIso88591(bytes.slice(4, 8)) === "ftyp") {
    const brand = decodeIso88591(bytes.slice(8, 12));
    if (brand === "avif" || brand === "avis") {
      return "image/avif";
    }

    if (brand === "heic" || brand === "heix" || brand === "hevc" || brand === "hevx") {
      return "image/heic";
    }

    if (brand === "mif1" || brand === "msf1") {
      return "image/heif";
    }
  }

  if (fallbackTypeIndicator === 14) {
    return "image/png";
  }

  if (fallbackTypeIndicator === 13) {
    return "image/jpeg";
  }

  return undefined;
}

function normalizeMimeType(value: string | undefined): string | undefined {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "image/jpg") {
    return "image/jpeg";
  }

  return normalized;
}

function resolveArtworkMimeType(bytes: Uint8Array, declaredMimeType?: string, fallbackTypeIndicator?: number): string {
  const detectedMimeType = detectImageMimeType(bytes, fallbackTypeIndicator);
  if (detectedMimeType) {
    return detectedMimeType;
  }

  return normalizeMimeType(declaredMimeType) ?? "image/jpeg";
}

function decodeBase64ToBytes(value: string | undefined): Uint8Array | undefined {
  const normalized = value?.replace(/\s+/g, "");
  if (!normalized) {
    return undefined;
  }

  try {
    if (typeof atob === "function") {
      const decoded = atob(normalized);
      const bytes = new Uint8Array(decoded.length);
      for (let index = 0; index < decoded.length; index += 1) {
        bytes[index] = decoded.charCodeAt(index);
      }
      return bytes;
    }
  } catch {
    return undefined;
  }

  const maybeBuffer = (globalThis as { Buffer?: { from(input: string, encoding: string): Uint8Array } }).Buffer;
  if (!maybeBuffer) {
    return undefined;
  }

  try {
    return Uint8Array.from(maybeBuffer.from(normalized, "base64"));
  } catch {
    return undefined;
  }
}

function normalizeId3FrameId(frameId: string): string {
  switch (frameId) {
    case "TT2":
      return "TIT2";
    case "TP1":
      return "TPE1";
    case "TP2":
      return "TPE2";
    case "TAL":
      return "TALB";
    case "ULT":
      return "USLT";
    case "SLT":
      return "SYLT";
    case "PIC":
      return "APIC";
    case "COM":
      return "COMM";
    case "TXX":
      return "TXXX";
    default:
      return frameId;
  }
}

function parseTextFrame(payload: Uint8Array): string | undefined {
  if (payload.length < 2) {
    return undefined;
  }

  return normalizeText(decodeEncodedText(payload.slice(1), payload[0] ?? 0));
}

function parseUsltFrame(payload: Uint8Array): string | undefined {
  if (payload.length < 5) {
    return undefined;
  }

  const encoding = payload[0] ?? 0;
  const descriptor = readEncodedTerminatedText(payload, 4, encoding);
  return normalizeText(decodeEncodedText(payload.slice(descriptor.nextOffset), encoding));
}

function parseCommFrame(payload: Uint8Array): { description?: string; text?: string } {
  if (payload.length < 5) {
    return {};
  }

  const encoding = payload[0] ?? 0;
  const descriptor = readEncodedTerminatedText(payload, 4, encoding);

  return {
    description: normalizeText(descriptor.text),
    text: normalizeText(decodeEncodedText(payload.slice(descriptor.nextOffset), encoding)),
  };
}

function parseTxxxFrame(payload: Uint8Array): { description?: string; value?: string } {
  if (payload.length < 2) {
    return {};
  }

  const encoding = payload[0] ?? 0;
  const description = readEncodedTerminatedText(payload, 1, encoding);

  return {
    description: normalizeText(description.text),
    value: normalizeText(decodeEncodedText(payload.slice(description.nextOffset), encoding)),
  };
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

    const text = normalizeText(parsedText.text);
    if (text) {
      lines.push(`${formatLrcTimestamp(timestamp)}${text}`);
    }
  }

  return normalizeText(lines.join("\n"));
}

function parseApicFrame(payload: Uint8Array): EmbeddedArtwork | undefined {
  if (payload.length < 4) {
    return undefined;
  }

  const encoding = payload[0] ?? 0;
  const mime = readEncodedTerminatedText(payload, 1, 0);
  const pictureTypeOffset = mime.nextOffset;
  const description = readEncodedTerminatedText(payload, pictureTypeOffset + 1, encoding);
  const imageBytes = payload.slice(description.nextOffset);
  if (imageBytes.length === 0) {
    return undefined;
  }

  return {
    mimeType: resolveArtworkMimeType(imageBytes, mime.text),
    bytes: imageBytes,
    description: normalizeText(description.text),
  };
}

function parsePicFrame(payload: Uint8Array): EmbeddedArtwork | undefined {
  if (payload.length < 6) {
    return undefined;
  }

  const encoding = payload[0] ?? 0;
  const format = decodeIso88591(payload.slice(1, 4)).trim().toUpperCase();
  const description = readEncodedTerminatedText(payload, 5, encoding);
  const imageBytes = payload.slice(description.nextOffset);
  if (imageBytes.length === 0) {
    return undefined;
  }

  let mimeType = "image/jpeg";
  if (format === "PNG") {
    mimeType = "image/png";
  } else if (format === "GIF") {
    mimeType = "image/gif";
  }

  return {
    mimeType: resolveArtworkMimeType(imageBytes, mimeType),
    bytes: imageBytes,
    description: normalizeText(description.text),
  };
}

function parseId3v2(bytes: Uint8Array): EmbeddedAudioMetadata {
  if (bytes.length < 10 || decodeIso88591(bytes.slice(0, 3)) !== "ID3") {
    return {};
  }

  const version = bytes[3] ?? 0;
  const flags = bytes[5] ?? 0;
  const tagSize = readSyncSafeInt(bytes, 6);
  let tagBody = copySlice(bytes, 10, 10 + tagSize);

  if ((flags & 0x80) !== 0) {
    tagBody = stripUnsynchronization(tagBody);
  }

  if (version >= 3 && (flags & 0x40) !== 0 && tagBody.length >= 4) {
    const extendedHeaderSize = version === 4 ? readSyncSafeInt(tagBody, 0) : readUInt32BE(tagBody, 0) + 4;
    tagBody = copySlice(tagBody, Math.min(extendedHeaderSize, tagBody.length));
  }

  const metadata: EmbeddedAudioMetadata = {};
  let offset = 0;

  while (offset < tagBody.length) {
    const isV22 = version === 2;
    const headerSize = isV22 ? 6 : 10;
    if (offset + headerSize > tagBody.length) {
      break;
    }

    const frameIdRaw = decodeIso88591(tagBody.slice(offset, offset + (isV22 ? 3 : 4)));
    if (!frameIdRaw.trim() || /^\x00+$/.test(frameIdRaw)) {
      break;
    }

    const frameId = normalizeId3FrameId(frameIdRaw);
    const isLegacyPictureFrame = frameIdRaw === "PIC";
    const frameSize = isV22 ? readUInt24BE(tagBody, offset + 3) : version === 4 ? readSyncSafeInt(tagBody, offset + 4) : readUInt32BE(tagBody, offset + 4);
    if (frameSize <= 0 || offset + headerSize + frameSize > tagBody.length) {
      break;
    }

    const payload = tagBody.slice(offset + headerSize, offset + headerSize + frameSize);

    switch (frameId) {
      case "TIT2":
        assignMetadataText(metadata, "title", parseTextFrame(payload));
        break;
      case "TPE1":
        assignPreferredMetadataText(metadata, "artist", parseTextFrame(payload));
        break;
      case "TPE2":
        assignMetadataText(metadata, "artist", parseTextFrame(payload));
        break;
      case "TALB":
        assignMetadataText(metadata, "album", parseTextFrame(payload));
        break;
      case "USLT":
        assignPreferredLyrics(metadata, parseUsltFrame(payload));
        break;
      case "SYLT":
        assignPreferredLyrics(metadata, parseSyltFrame(payload), true);
        break;
      case "COMM": {
        const comment = parseCommFrame(payload);
        const description = comment.description?.toUpperCase();
        if (description && MP4_LYRICS_ALIASES.includes(description)) {
          assignLyrics(metadata, comment.text);
        }
        break;
      }
      case "TXXX": {
        const text = parseTxxxFrame(payload);
        const description = text.description?.toUpperCase();
        if (description && MP4_LYRICS_ALIASES.includes(description)) {
          assignLyrics(metadata, text.value);
        }
        break;
      }
      case "APIC":
        assignArtwork(metadata, isLegacyPictureFrame ? parsePicFrame(payload) : parseApicFrame(payload));
        break;
      default:
        break;
    }

    offset += headerSize + frameSize;
  }

  return metadata;
}

function parseId3v1(bytes: Uint8Array): EmbeddedAudioMetadata {
  if (bytes.length < 128) {
    return {};
  }

  const tagOffset = bytes.length - 128;
  if (decodeIso88591(bytes.slice(tagOffset, tagOffset + 3)) !== "TAG") {
    return {};
  }

  return {
    title: normalizeText(decodeIso88591(bytes.slice(tagOffset + 3, tagOffset + 33))),
    artist: normalizeText(decodeIso88591(bytes.slice(tagOffset + 33, tagOffset + 63))),
    album: normalizeText(decodeIso88591(bytes.slice(tagOffset + 63, tagOffset + 93))),
  };
}

function parseVorbisComments(bytes: Uint8Array): Record<string, string[]> {
  const comments: Record<string, string[]> = {};
  if (bytes.length < 8) {
    return comments;
  }

  let offset = 0;
  const vendorLength = readUInt32LE(bytes, offset);
  offset += 4;
  if (offset + vendorLength + 4 > bytes.length) {
    return comments;
  }

  offset += vendorLength;

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

    const entry = decodeUtf8(bytes.slice(offset, offset + length));
    offset += length;

    const separatorIndex = entry.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = entry.slice(0, separatorIndex).trim().toUpperCase();
    const value = normalizeText(entry.slice(separatorIndex + 1));
    if (!key || !value) {
      continue;
    }

    comments[key] = comments[key] ?? [];
    comments[key].push(value);
  }

  return comments;
}

function readFirstComment(comments: Record<string, string[]>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = comments[key]?.find((entry) => normalizeText(entry));
    if (value) {
      return value;
    }
  }

  return undefined;
}

function parseFlacPicture(bytes: Uint8Array): EmbeddedArtwork | undefined {
  if (bytes.length < 32) {
    return undefined;
  }

  let offset = 0;
  offset += 4;

  if (offset + 4 > bytes.length) {
    return undefined;
  }

  const mimeLength = readUInt32BE(bytes, offset);
  offset += 4;
  if (offset + mimeLength + 4 > bytes.length) {
    return undefined;
  }

  const mimeType = decodeUtf8(bytes.slice(offset, offset + mimeLength));
  offset += mimeLength;

  const descriptionLength = readUInt32BE(bytes, offset);
  offset += 4;
  if (offset + descriptionLength + 20 > bytes.length) {
    return undefined;
  }

  const description = decodeUtf8(bytes.slice(offset, offset + descriptionLength));
  offset += descriptionLength;

  offset += 16;
  const dataLength = readUInt32BE(bytes, offset);
  offset += 4;

  if (offset + dataLength > bytes.length) {
    return undefined;
  }

  const imageBytes = bytes.slice(offset, offset + dataLength);
  return {
    mimeType: resolveArtworkMimeType(imageBytes, mimeType),
    bytes: imageBytes,
    description: normalizeText(description),
  };
}

function extractVorbisArtwork(comments: Record<string, string[]>): EmbeddedArtwork | undefined {
  const pictureBlock = readFirstComment(comments, ["METADATA_BLOCK_PICTURE"]);
  if (pictureBlock) {
    const pictureBytes = decodeBase64ToBytes(pictureBlock);
    const artwork = pictureBytes ? parseFlacPicture(pictureBytes) : undefined;
    if (artwork) {
      return artwork;
    }
  }

  const coverArt = readFirstComment(comments, ["COVERART"]);
  if (!coverArt) {
    return undefined;
  }

  const coverBytes = decodeBase64ToBytes(coverArt);
  if (!coverBytes) {
    return undefined;
  }

  return {
    mimeType: resolveArtworkMimeType(coverBytes, readFirstComment(comments, ["COVERARTMIME"])),
    bytes: coverBytes,
  };
}

function applyVorbisMetadata(metadata: EmbeddedAudioMetadata, comments: Record<string, string[]>): void {
  assignMetadataText(metadata, "title", readFirstComment(comments, VORBIS_TITLE_KEYS));
  assignMetadataText(metadata, "artist", readFirstComment(comments, VORBIS_ARTIST_KEYS));
  assignMetadataText(metadata, "album", readFirstComment(comments, VORBIS_ALBUM_KEYS));
  assignLyrics(metadata, readFirstComment(comments, VORBIS_TIMED_LYRICS_KEYS), true);
  assignLyrics(metadata, readFirstComment(comments, VORBIS_LYRICS_KEYS));
  assignArtwork(metadata, extractVorbisArtwork(comments));
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
      applyVorbisMetadata(metadata, parseVorbisComments(block));
    } else if (blockType === 6) {
      assignArtwork(metadata, parseFlacPicture(block));
    }
  }

  return metadata;
}

function readMp4Box(bytes: Uint8Array, offset: number, limit: number): Mp4Box | undefined {
  if (offset + 8 > limit || offset + 8 > bytes.length) {
    return undefined;
  }

  let size = readUInt32BE(bytes, offset);
  const type = decodeIso88591(bytes.slice(offset + 4, offset + 8));
  let headerSize = 8;

  if (size === 1) {
    const largeSize = readUInt64BEAsNumber(bytes, offset + 8);
    if (!largeSize) {
      return undefined;
    }
    size = largeSize;
    headerSize = 16;
  } else if (size === 0) {
    size = limit - offset;
  }

  if (size < headerSize || offset + size > limit || offset + size > bytes.length) {
    return undefined;
  }

  return {
    type,
    headerSize,
    dataStart: offset + headerSize,
    end: offset + size,
  };
}

function parseMp4MetadataItem(bytes: Uint8Array, start: number, end: number): Mp4MetadataItem {
  const item: Mp4MetadataItem = {
    dataBoxes: [],
  };
  let offset = start;

  while (offset < end) {
    const box = readMp4Box(bytes, offset, end);
    if (!box) {
      break;
    }

    if (box.type === "data" && box.dataStart + 8 <= box.end) {
      const body = bytes.slice(box.dataStart, box.end);
      item.dataBoxes.push({
        typeIndicator: readUInt24BE(body, 1),
        bytes: body.slice(8),
      });
    } else if ((box.type === "mean" || box.type === "name") && box.dataStart + 4 <= box.end) {
      const text = normalizeText(decodeUtf8(bytes.slice(box.dataStart + 4, box.end)));
      if (box.type === "mean") {
        item.mean = text;
      } else {
        item.name = text;
      }
    }

    offset = box.end;
  }

  return item;
}

function resolveMp4ItemName(itemType: string, item: Mp4MetadataItem): string {
  if (itemType !== "----") {
    return itemType;
  }

  const freeformName = item.name?.trim().toUpperCase();
  return freeformName ? `----:${freeformName}` : itemType;
}

function applyMp4Item(metadata: EmbeddedAudioMetadata, itemType: string, item: Mp4MetadataItem): void {
  const resolvedType = resolveMp4ItemName(itemType, item);

  for (const dataBox of item.dataBoxes) {
    if (resolvedType === "covr") {
      if (dataBox.bytes.length === 0) {
        continue;
      }

      assignArtwork(metadata, {
        mimeType: resolveArtworkMimeType(dataBox.bytes, undefined, dataBox.typeIndicator),
        bytes: dataBox.bytes,
      });
      continue;
    }

    const text = normalizeText(decodeMp4Text(dataBox.bytes, dataBox.typeIndicator));
    if (!text) {
      continue;
    }

      switch (resolvedType) {
      case "©nam":
        assignMetadataText(metadata, "title", text);
        break;
      case "©ART":
        assignPreferredMetadataText(metadata, "artist", text);
        break;
      case "aART":
        assignMetadataText(metadata, "artist", text);
        break;
      case "©alb":
        assignMetadataText(metadata, "album", text);
        break;
      case "©lyr":
        assignPreferredLyrics(metadata, text);
        break;
      default: {
        const freeformName = resolvedType.startsWith("----:") ? resolvedType.slice(5) : undefined;
        if (freeformName && MP4_LYRICS_ALIASES.includes(freeformName)) {
          assignLyrics(metadata, text);
        }
        break;
      }
    }
  }
}

function walkMp4Boxes(bytes: Uint8Array, start: number, end: number, metadata: EmbeddedAudioMetadata): void {
  let offset = start;

  while (offset < end) {
    const box = readMp4Box(bytes, offset, end);
    if (!box) {
      break;
    }

    if (box.type === "ilst") {
      let itemOffset = box.dataStart;
      while (itemOffset < box.end) {
        const itemBox = readMp4Box(bytes, itemOffset, box.end);
        if (!itemBox) {
          break;
        }

        applyMp4Item(metadata, itemBox.type, parseMp4MetadataItem(bytes, itemBox.dataStart, itemBox.end));
        itemOffset = itemBox.end;
      }
    } else if (MP4_CONTAINER_BOXES.has(box.type)) {
      const childStart = box.type === "meta" ? box.dataStart + 4 : box.dataStart;
      if (childStart <= box.end) {
        walkMp4Boxes(bytes, childStart, box.end, metadata);
      }
    }

    offset = box.end;
  }
}

function parseMp4(bytes: Uint8Array): EmbeddedAudioMetadata {
  if (bytes.length < 12 || decodeIso88591(bytes.slice(4, 8)) !== "ftyp") {
    return {};
  }

  const metadata: EmbeddedAudioMetadata = {};
  walkMp4Boxes(bytes, 0, bytes.length, metadata);
  return metadata;
}

function extractOggPackets(bytes: Uint8Array, maxPackets = 8): Uint8Array[] {
  const packets: Uint8Array[] = [];
  let offset = 0;
  let targetSerial: number | null = null;
  let packetChunks: Uint8Array[] = [];
  let packetLength = 0;

  while (offset + 27 <= bytes.length && packets.length < maxPackets) {
    if (decodeIso88591(bytes.slice(offset, offset + 4)) !== "OggS") {
      break;
    }

    const pageSegments = bytes[offset + 26] ?? 0;
    const segmentTableStart = offset + 27;
    const segmentTableEnd = segmentTableStart + pageSegments;
    if (segmentTableEnd > bytes.length) {
      break;
    }

    const serial = readUInt32LE(bytes, offset + 14);
    const payloadSize = Array.from(bytes.slice(segmentTableStart, segmentTableEnd)).reduce((sum, value) => sum + value, 0);
    const payloadStart = segmentTableEnd;
    const payloadEnd = payloadStart + payloadSize;
    if (payloadEnd > bytes.length) {
      break;
    }

    if (targetSerial === null) {
      targetSerial = serial;
    }

    if (serial === targetSerial) {
      const isContinuation = (bytes[offset + 5] & 0x01) !== 0;
      if (!isContinuation && packetChunks.length > 0) {
        packetChunks = [];
        packetLength = 0;
      }

      let pageDataOffset = payloadStart;
      for (let segmentIndex = 0; segmentIndex < pageSegments; segmentIndex += 1) {
        const segmentLength = bytes[segmentTableStart + segmentIndex] ?? 0;
        const segment = bytes.slice(pageDataOffset, pageDataOffset + segmentLength);
        packetChunks.push(segment);
        packetLength += segment.length;
        pageDataOffset += segmentLength;

        if (segmentLength < 255) {
          const packet = new Uint8Array(packetLength);
          let chunkOffset = 0;
          for (const chunk of packetChunks) {
            packet.set(chunk, chunkOffset);
            chunkOffset += chunk.length;
          }

          packets.push(packet);
          packetChunks = [];
          packetLength = 0;

          if (packets.length >= maxPackets) {
            break;
          }
        }
      }
    }

    offset = payloadEnd;
  }

  return packets;
}

function parseOgg(bytes: Uint8Array): EmbeddedAudioMetadata {
  if (bytes.length < 4 || decodeIso88591(bytes.slice(0, 4)) !== "OggS") {
    return {};
  }

  const packets = extractOggPackets(bytes, 4);
  if (packets.length < 2) {
    return {};
  }

  const identification = packets[0];
  const commentsPacket = packets[1];
  const metadata: EmbeddedAudioMetadata = {};

  if (identification.length >= 7 && identification[0] === 0x01 && decodeIso88591(identification.slice(1, 7)) === "vorbis") {
    if (commentsPacket.length >= 7 && commentsPacket[0] === 0x03 && decodeIso88591(commentsPacket.slice(1, 7)) === "vorbis") {
      applyVorbisMetadata(metadata, parseVorbisComments(commentsPacket.slice(7)));
    }
  } else if (identification.length >= 8 && decodeIso88591(identification.slice(0, 8)) === "OpusHead") {
    if (commentsPacket.length >= 8 && decodeIso88591(commentsPacket.slice(0, 8)) === "OpusTags") {
      applyVorbisMetadata(metadata, parseVorbisComments(commentsPacket.slice(8)));
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
    return mergeMetadata(parseId3v2(bytes), parseId3v1(bytes));
  }

  if (bytes.length >= 4 && decodeIso88591(bytes.slice(0, 4)) === "fLaC") {
    return parseFlac(bytes);
  }

  if (bytes.length >= 4 && decodeIso88591(bytes.slice(0, 4)) === "OggS") {
    return parseOgg(bytes);
  }

  if (bytes.length >= 12 && decodeIso88591(bytes.slice(4, 8)) === "ftyp") {
    return parseMp4(bytes);
  }

  if (mimeType === "audio/mpeg" || extension === ".mp3") {
    return mergeMetadata(parseId3v2(bytes), parseId3v1(bytes));
  }

  if (mimeType === "audio/flac" || extension === ".flac") {
    return parseFlac(bytes);
  }

  if (mimeType === "audio/ogg" || extension === ".ogg" || extension === ".oga" || extension === ".opus") {
    return parseOgg(bytes);
  }

  if (mimeType === "audio/mp4" || mimeType === "audio/aac" || extension === ".m4a" || extension === ".aac") {
    return parseMp4(bytes);
  }

  return parseId3v1(bytes);
}
