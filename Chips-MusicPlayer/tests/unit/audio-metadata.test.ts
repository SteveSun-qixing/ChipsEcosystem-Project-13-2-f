import { describe, expect, it } from "vitest";
import { parseEmbeddedAudioMetadata } from "../../src/utils/audio-metadata";

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return combined;
}

function encodeAscii(value: string): Uint8Array {
  return Uint8Array.from(Array.from(value, (character) => character.charCodeAt(0)));
}

function writeUInt32BE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function writeUInt32LE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function createId3Frame(frameId: string, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(10 + payload.length);
  frame.set(encodeAscii(frameId), 0);
  const view = new DataView(frame.buffer);
  view.setUint32(4, payload.length, false);
  frame.set(payload, 10);
  return frame;
}

function toSyncSafe(size: number): Uint8Array {
  return new Uint8Array([
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f,
  ]);
}

function createId3Tag(frames: Uint8Array[]): Uint8Array {
  const totalSize = frames.reduce((sum, frame) => sum + frame.length, 0);
  const tag = new Uint8Array(10 + totalSize);
  tag.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00], 0);
  tag.set(toSyncSafe(totalSize), 6);

  let offset = 10;
  for (const frame of frames) {
    tag.set(frame, offset);
    offset += frame.length;
  }

  return tag;
}

function createId3v22Frame(frameId: string, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(6 + payload.length);
  frame.set(encodeAscii(frameId), 0);
  frame[3] = (payload.length >> 16) & 0xff;
  frame[4] = (payload.length >> 8) & 0xff;
  frame[5] = payload.length & 0xff;
  frame.set(payload, 6);
  return frame;
}

function createId3v22Tag(frames: Uint8Array[]): Uint8Array {
  const totalSize = frames.reduce((sum, frame) => sum + frame.length, 0);
  const tag = new Uint8Array(10 + totalSize);
  tag.set([0x49, 0x44, 0x33, 0x02, 0x00, 0x00], 0);
  tag.set(toSyncSafe(totalSize), 6);

  let offset = 10;
  for (const frame of frames) {
    tag.set(frame, offset);
    offset += frame.length;
  }

  return tag;
}

function createId3v1Tag(title: string, artist: string, album: string): Uint8Array {
  const bytes = new Uint8Array(128);
  bytes.set(encodeAscii("TAG"), 0);
  bytes.set(new TextEncoder().encode(title.slice(0, 30)), 3);
  bytes.set(new TextEncoder().encode(artist.slice(0, 30)), 33);
  bytes.set(new TextEncoder().encode(album.slice(0, 30)), 63);
  return bytes;
}

function createVorbisCommentPayload(comments: string[]): Uint8Array {
  const encoder = new TextEncoder();
  const vendor = encoder.encode("chips");
  const commentBytes = comments.map((entry) => encoder.encode(entry));
  const parts = [writeUInt32LE(vendor.length), vendor, writeUInt32LE(commentBytes.length)];

  for (const entry of commentBytes) {
    parts.push(writeUInt32LE(entry.length), entry);
  }

  return concatBytes(parts);
}

function createFlacCommentBlock(comments: string[]): Uint8Array {
  return createVorbisCommentPayload(comments);
}

function createFlacPictureBlock(mimeType: string, imageBytes: Uint8Array, description = ""): Uint8Array {
  const encoder = new TextEncoder();
  const mime = encoder.encode(mimeType);
  const descriptionBytes = encoder.encode(description);

  return concatBytes([
    writeUInt32BE(3),
    writeUInt32BE(mime.length),
    mime,
    writeUInt32BE(descriptionBytes.length),
    descriptionBytes,
    writeUInt32BE(512),
    writeUInt32BE(512),
    writeUInt32BE(24),
    writeUInt32BE(0),
    writeUInt32BE(imageBytes.length),
    imageBytes,
  ]);
}

function createFlacWithMetadata(comments: string[], pictureBlock?: Uint8Array): Uint8Array {
  const commentBlock = createFlacCommentBlock(comments);
  const blocks: Uint8Array[] = [];

  if (pictureBlock) {
    blocks.push(new Uint8Array([0x04, 0x00, 0x00, commentBlock.length]), commentBlock);
    blocks.push(new Uint8Array([0x86, 0x00, 0x00, pictureBlock.length]), pictureBlock);
  } else {
    blocks.push(new Uint8Array([0x84, 0x00, 0x00, commentBlock.length]), commentBlock);
  }

  return concatBytes([encodeAscii("fLaC"), ...blocks]);
}

function createMp4Box(type: string, payload: Uint8Array): Uint8Array {
  return concatBytes([writeUInt32BE(payload.length + 8), encodeAscii(type), payload]);
}

function createMp4DataBox(typeIndicator: number, payload: Uint8Array): Uint8Array {
  return createMp4Box(
    "data",
    concatBytes([
      new Uint8Array([0x00, (typeIndicator >> 16) & 0xff, (typeIndicator >> 8) & 0xff, typeIndicator & 0xff]),
      new Uint8Array(4),
      payload,
    ]),
  );
}

function createMp4TextItem(type: string, value: string): Uint8Array {
  return createMp4Box(type, createMp4DataBox(1, new TextEncoder().encode(value)));
}

function createMp4FreeformItem(name: string, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const meanBox = createMp4Box("mean", concatBytes([new Uint8Array(4), encoder.encode("com.apple.iTunes")]));
  const nameBox = createMp4Box("name", concatBytes([new Uint8Array(4), encoder.encode(name)]));
  const dataBox = createMp4DataBox(1, encoder.encode(value));
  return createMp4Box("----", concatBytes([meanBox, nameBox, dataBox]));
}

function createMp4CoverItem(imageBytes: Uint8Array, typeIndicator = 14): Uint8Array {
  return createMp4Box("covr", createMp4DataBox(typeIndicator, imageBytes));
}

function createMp4File(items: Uint8Array[]): Uint8Array {
  const ftyp = createMp4Box("ftyp", concatBytes([encodeAscii("M4A "), writeUInt32BE(0), encodeAscii("isom")]));
  const ilst = createMp4Box("ilst", concatBytes(items));
  const meta = createMp4Box("meta", concatBytes([new Uint8Array(4), ilst]));
  const udta = createMp4Box("udta", meta);
  const moov = createMp4Box("moov", udta);
  return concatBytes([ftyp, moov]);
}

function createOggPage(serial: number, sequence: number, headerType: number, packet: Uint8Array): Uint8Array {
  const page = new Uint8Array(27 + 1 + packet.length);
  page.set(encodeAscii("OggS"), 0);
  page[4] = 0x00;
  page[5] = headerType;
  new DataView(page.buffer).setUint32(14, serial, true);
  new DataView(page.buffer).setUint32(18, sequence, true);
  page[26] = 1;
  page[27] = packet.length;
  page.set(packet, 28);
  return page;
}

function createOggVorbisFile(comments: string[]): Uint8Array {
  const identification = concatBytes([new Uint8Array([0x01]), encodeAscii("vorbis")]);
  const commentPacket = concatBytes([new Uint8Array([0x03]), encodeAscii("vorbis"), createVorbisCommentPayload(comments)]);
  return concatBytes([createOggPage(1, 0, 0x02, identification), createOggPage(1, 1, 0x00, commentPacket)]);
}

function createOpusFile(comments: string[]): Uint8Array {
  const identification = encodeAscii("OpusHead");
  const commentPacket = concatBytes([encodeAscii("OpusTags"), createVorbisCommentPayload(comments)]);
  return concatBytes([createOggPage(2, 0, 0x02, identification), createOggPage(2, 1, 0x00, commentPacket)]);
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

describe("audio metadata parser", () => {
  it("parses id3 title and plain lyrics from mp3 tags", () => {
    const textEncoder = new TextEncoder();
    const titleFrame = createId3Frame("TIT2", Uint8Array.from([0x03, ...textEncoder.encode("Song Title")]));
    const lyricsFrame = createId3Frame("USLT", Uint8Array.from([0x03, 0x65, 0x6e, 0x67, 0x00, ...textEncoder.encode("Line 1\nLine 2")]));
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createId3Tag([titleFrame, lyricsFrame]),
      fileName: "demo.mp3",
    });

    expect(metadata.title).toBe("Song Title");
    expect(metadata.lyricsText).toBe("Line 1\nLine 2");
  });

  it("falls back to id3v1 metadata when id3v2 tags are missing", () => {
    const metadata = parseEmbeddedAudioMetadata({
      bytes: concatBytes([new Uint8Array(32), createId3v1Tag("Legacy Song", "Legacy Artist", "Legacy Album")]),
      fileName: "legacy.mp3",
    });

    expect(metadata.title).toBe("Legacy Song");
    expect(metadata.artist).toBe("Legacy Artist");
    expect(metadata.album).toBe("Legacy Album");
  });

  it("parses legacy id3v2.2 picture frames", () => {
    const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pictureFrame = createId3v22Frame("PIC", Uint8Array.from([0x03, ...encodeAscii("PNG"), 0x03, 0x00, ...pngBytes]));
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createId3v22Tag([pictureFrame]),
      fileName: "legacy-picture.mp3",
    });

    expect(metadata.artwork?.mimeType).toBe("image/png");
  });

  it("prefers detected artwork bytes over a mismatched apic mime type", () => {
    const tiffBytes = Uint8Array.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08]);
    const pictureFrame = createId3Frame("APIC", Uint8Array.from([0x00, ...encodeAscii("image/jpeg"), 0x00, 0x00, 0x00, ...tiffBytes]));
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createId3Tag([pictureFrame]),
      fileName: "mismatched-cover.mp3",
    });

    expect(metadata.artwork?.mimeType).toBe("image/tiff");
  });

  it("parses flac vorbis comments and picture blocks", () => {
    const imageBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pictureBlock = createFlacPictureBlock("image/png", imageBytes, "front cover");
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createFlacWithMetadata(["TITLE=Demo Track", "ARTIST=Demo Artist", "LYRICS=Line 1"], pictureBlock),
      fileName: "demo.flac",
    });

    expect(metadata.title).toBe("Demo Track");
    expect(metadata.artist).toBe("Demo Artist");
    expect(metadata.lyricsText).toBe("Line 1");
    expect(metadata.artwork?.mimeType).toBe("image/png");
    expect(metadata.artwork?.description).toBe("front cover");
  });

  it("parses mp4 metadata atoms including lyrics and cover art", () => {
    const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const bytes = createMp4File([
      createMp4TextItem("©nam", "MP4 Song"),
      createMp4TextItem("©ART", "MP4 Artist"),
      createMp4TextItem("©alb", "MP4 Album"),
      createMp4TextItem("©lyr", "Line 1\nLine 2"),
      createMp4CoverItem(pngBytes),
    ]);

    const metadata = parseEmbeddedAudioMetadata({
      bytes,
      fileName: "demo.m4a",
      mimeType: "audio/mp4",
    });

    expect(metadata.title).toBe("MP4 Song");
    expect(metadata.artist).toBe("MP4 Artist");
    expect(metadata.album).toBe("MP4 Album");
    expect(metadata.lyricsText).toBe("Line 1\nLine 2");
    expect(metadata.artwork?.mimeType).toBe("image/png");
  });

  it("parses freeform mp4 lyrics atoms", () => {
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createMp4File([createMp4FreeformItem("LYRICS", "[00:01.00]Line 1")]),
      fileName: "demo.m4a",
    });

    expect(metadata.timedLyricsText).toBe("[00:01.00]Line 1");
  });

  it("prefers primary mp4 artist atoms over album artist fallback", () => {
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createMp4File([createMp4TextItem("aART", "Album Artist"), createMp4TextItem("©ART", "Track Artist")]),
      fileName: "artist-priority.m4a",
    });

    expect(metadata.artist).toBe("Track Artist");
  });

  it("parses ogg vorbis comments with embedded picture metadata", () => {
    const jpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb]);
    const picture = createFlacPictureBlock("image/jpeg", jpegBytes);
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createOggVorbisFile([
        "TITLE=Ogg Song",
        "ARTIST=Ogg Artist",
        "LYRICS=Ogg Line",
        `METADATA_BLOCK_PICTURE=${encodeBase64(picture)}`,
      ]),
      fileName: "demo.ogg",
      mimeType: "audio/ogg",
    });

    expect(metadata.title).toBe("Ogg Song");
    expect(metadata.artist).toBe("Ogg Artist");
    expect(metadata.lyricsText).toBe("Ogg Line");
    expect(metadata.artwork?.mimeType).toBe("image/jpeg");
  });

  it("parses opus tags and promotes timed lyrics when comment content is lrc", () => {
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createOpusFile(["TITLE=Opus Song", "ARTIST=Opus Artist", "LYRICS=[00:12.00]Line 1"]),
      fileName: "demo.opus",
      mimeType: "audio/ogg",
    });

    expect(metadata.title).toBe("Opus Song");
    expect(metadata.artist).toBe("Opus Artist");
    expect(metadata.timedLyricsText).toBe("[00:12.00]Line 1");
  });
});
