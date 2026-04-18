import { describe, expect, it } from "vitest";
import { parseEmbeddedAudioMetadata } from "../../src/utils/audio-metadata";

function createId3Frame(frameId: string, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(10 + payload.length);
  frame.set(new TextEncoder().encode(frameId), 0);
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

function createFlacCommentBlock(comments: string[]): Uint8Array {
  const encoder = new TextEncoder();
  const vendor = encoder.encode("chips");
  const commentBytes = comments.map((entry) => encoder.encode(entry));
  const length = 4 + vendor.length + 4 + commentBytes.reduce((sum, entry) => sum + 4 + entry.length, 0);
  const block = new Uint8Array(length);
  const view = new DataView(block.buffer);

  let offset = 0;
  view.setUint32(offset, vendor.length, true);
  offset += 4;
  block.set(vendor, offset);
  offset += vendor.length;
  view.setUint32(offset, commentBytes.length, true);
  offset += 4;

  for (const entry of commentBytes) {
    view.setUint32(offset, entry.length, true);
    offset += 4;
    block.set(entry, offset);
    offset += entry.length;
  }

  return block;
}

function createFlacWithComments(comments: string[]): Uint8Array {
  const commentBlock = createFlacCommentBlock(comments);
  const bytes = new Uint8Array(4 + 4 + commentBlock.length);
  bytes.set([0x66, 0x4c, 0x61, 0x43], 0);
  bytes.set([0x84, 0x00, 0x00, commentBlock.length], 4);
  bytes.set(commentBlock, 8);
  return bytes;
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

  it("parses flac vorbis comments", () => {
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createFlacWithComments(["TITLE=Demo Track", "ARTIST=Demo Artist", "LYRICS=Line 1"]),
      fileName: "demo.flac",
    });

    expect(metadata.title).toBe("Demo Track");
    expect(metadata.artist).toBe("Demo Artist");
    expect(metadata.lyricsText).toBe("Line 1");
  });
});
