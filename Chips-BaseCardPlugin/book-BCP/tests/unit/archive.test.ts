import { describe, expect, it } from "vitest";
import { extractZipEntry, parseZipEntries } from "../../src/shared/archive";
import { createStoredZip, JPEG_BYTES, PNG_BYTES } from "../helpers/zip";

describe("archive image bundle utilities", () => {
  it("parses ZIP central directory metadata", () => {
    const zip = createStoredZip([
      {
        path: "comic/002.jpg",
        data: JPEG_BYTES,
        modifiedAt: new Date("2026-01-02T10:00:00"),
      },
      {
        path: "comic/readme.txt",
        data: "ignore",
      },
    ]);

    const entries = parseZipEntries(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      path: "comic/002.jpg",
      fileName: "002.jpg",
      compressionMethod: 0,
      isDirectory: false,
    });
    expect(entries[0]?.entryTime).toBeTypeOf("number");
  });

  it("extracts stored ZIP entries for EPUB metadata parsing", async () => {
    const zip = createStoredZip([
      { path: "comic/010.jpg", data: JPEG_BYTES },
      { path: "comic/002.png", data: PNG_BYTES },
      { path: "comic/readme.txt", data: "ignore" },
    ]);
    const buffer = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength);
    const entries = parseZipEntries(buffer);
    const pngEntry = entries.find((entry) => entry.path === "comic/002.png");

    expect(pngEntry).toBeDefined();
    await expect(extractZipEntry(buffer, pngEntry!)).resolves.toEqual(PNG_BYTES);
  });

  it("preserves ZIP entry time for EPUB cover metadata", () => {
    const zip = createStoredZip([
      {
        path: "comic/003.jpg",
        data: JPEG_BYTES,
        modifiedAt: new Date("2026-01-03T00:00:00"),
      },
      {
        path: "comic/001.jpg",
        data: JPEG_BYTES,
        modifiedAt: new Date("2026-01-01T00:00:00"),
      },
    ]);

    const entries = parseZipEntries(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));

    expect(entries.map((entry) => entry.entryTime)).toEqual([
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(((entries[0]?.entryTime) ?? 0) > ((entries[1]?.entryTime) ?? 0)).toBe(true);
  });
});
