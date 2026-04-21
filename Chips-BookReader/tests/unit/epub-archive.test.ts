import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { openEpubArchive } from "../../src/domain/epub/archive";

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;

const writeUInt16LE = (value: number): Buffer => {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
};

const writeUInt32LE = (value: number): Buffer => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
};

function createZipBuffer(
  entries: Array<{
    path: string;
    content: Buffer;
    compressionMethod?: 0 | 8;
  }>,
): Uint8Array {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(entry.path, "utf-8");
    const compressionMethod = entry.compressionMethod ?? 0;
    const compressedData = compressionMethod === 8 ? zlib.deflateRawSync(entry.content) : entry.content;

    const localHeader = Buffer.concat([
      writeUInt32LE(LOCAL_FILE_HEADER_SIGNATURE),
      writeUInt16LE(20),
      writeUInt16LE(0),
      writeUInt16LE(compressionMethod),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(0),
      writeUInt32LE(compressedData.length),
      writeUInt32LE(entry.content.length),
      writeUInt16LE(fileName.length),
      writeUInt16LE(0),
      fileName,
    ]);

    localChunks.push(localHeader, compressedData);

    const centralDirectory = Buffer.concat([
      writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE),
      writeUInt16LE(20),
      writeUInt16LE(20),
      writeUInt16LE(0),
      writeUInt16LE(compressionMethod),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(0),
      writeUInt32LE(compressedData.length),
      writeUInt32LE(entry.content.length),
      writeUInt16LE(fileName.length),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(0),
      writeUInt32LE(offset),
      fileName,
    ]);

    centralChunks.push(centralDirectory);
    offset += localHeader.length + compressedData.length;
  }

  const centralDirectory = Buffer.concat(centralChunks);
  const localSection = Buffer.concat(localChunks);
  const eocd = Buffer.concat([
    writeUInt32LE(EOCD_SIGNATURE),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt16LE(entries.length),
    writeUInt16LE(entries.length),
    writeUInt32LE(centralDirectory.length),
    writeUInt32LE(localSection.length),
    writeUInt16LE(0),
  ]);

  return new Uint8Array(Buffer.concat([localSection, centralDirectory, eocd]));
}

describe("EpubArchive", () => {
  it("能读取 store-only ZIP 中的文本资源", async () => {
    const archive = await openEpubArchive(
      createZipBuffer([
        {
          path: "META-INF/container.xml",
          content: Buffer.from("<rootfiles />", "utf-8"),
        },
      ]),
    );

    await expect(archive.readText("META-INF/container.xml")).resolves.toBe("<rootfiles />");
  });

  it("能读取 deflate 压缩的章节内容", async () => {
    const archive = await openEpubArchive(
      createZipBuffer([
        {
          path: "OPS/text/chapter-1.xhtml",
          content: Buffer.from("<h1>Hello</h1>", "utf-8"),
          compressionMethod: 8,
        },
      ]),
    );

    await expect(archive.readText("OPS/text/chapter-1.xhtml")).resolves.toBe("<h1>Hello</h1>");
  });

  it("会拒绝路径穿越 ZIP 条目", async () => {
    await expect(
      openEpubArchive(
        createZipBuffer([
          {
            path: "../evil.xhtml",
            content: Buffer.from("nope", "utf-8"),
          },
        ]),
      ),
    ).rejects.toThrow("path traversal");
  });
});
