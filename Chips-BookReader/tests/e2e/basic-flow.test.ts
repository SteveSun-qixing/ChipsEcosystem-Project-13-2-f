// @vitest-environment jsdom

import { Buffer } from "node:buffer";
import { Blob as NodeBlob } from "node:buffer";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadReadableBook } from "../../src/domain/book/virtual-book";
import { renderSectionDocument } from "../../src/domain/epub/markup";
import { SearchEngine } from "../../src/engine/search-engine";
import {
  createBookSourceDescriptor,
  isSupportedBookResource,
  type BookSourceDescriptor,
  type LaunchBookTarget,
} from "../../src/utils/book-reader";
import { resolveLaunchBookTarget } from "../../src/utils/launch-resource";

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const encoder = new TextEncoder();
const workspaceRoot = resolve(__dirname, "../../..");
const testingSpaceRoot = resolve(workspaceRoot, "ProductFinishedProductTestingSpace");

function requireFileMaterial(relativePath: string): string {
  const filePath = resolve(testingSpaceRoot, relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`真实素材缺失：${filePath}`);
  }

  if (!statSync(filePath).isFile()) {
    throw new Error(`真实素材不是文件：${filePath}`);
  }

  return filePath;
}

function writeUInt16LE(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function writeUInt32LE(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function createZipBuffer(entries: Array<{ path: string; content: string | Uint8Array }>): Uint8Array {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(entry.path, "utf-8");
    const content = typeof entry.content === "string" ? Buffer.from(entry.content, "utf-8") : Buffer.from(entry.content);
    const localHeader = Buffer.concat([
      writeUInt32LE(ZIP_LOCAL_FILE_HEADER_SIGNATURE),
      writeUInt16LE(20),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(0),
      writeUInt32LE(content.length),
      writeUInt32LE(content.length),
      writeUInt16LE(fileName.length),
      writeUInt16LE(0),
      fileName,
    ]);

    localChunks.push(localHeader, content);

    centralChunks.push(Buffer.concat([
      writeUInt32LE(ZIP_CENTRAL_DIRECTORY_SIGNATURE),
      writeUInt16LE(20),
      writeUInt16LE(20),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(0),
      writeUInt32LE(content.length),
      writeUInt32LE(content.length),
      writeUInt16LE(fileName.length),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(0),
      writeUInt32LE(offset),
      fileName,
    ]));

    offset += localHeader.length + content.length;
  }

  const localSection = Buffer.concat(localChunks);
  const centralDirectory = Buffer.concat(centralChunks);
  const eocd = Buffer.concat([
    writeUInt32LE(ZIP_EOCD_SIGNATURE),
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

function createMinimalEpubBytes(): Uint8Array {
  return createZipBuffer([
    {
      path: "META-INF/container.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`,
    },
    {
      path: "OEBPS/content.opf",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Minimal EPUB</dc:title>
    <dc:creator>Chips QA</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="book-id">urn:chips:book-reader:e2e:minimal</dc:identifier>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="chapter-1" href="text/chapter-1.xhtml" media-type="application/xhtml+xml" />
    <item id="style" href="styles/book.css" media-type="text/css" />
    <item id="cover" href="images/cover.png" media-type="image/png" properties="cover-image" />
  </manifest>
  <spine>
    <itemref idref="chapter-1" />
  </spine>
</package>`,
    },
    {
      path: "OEBPS/nav.xhtml",
      content: `<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <body>
    <nav epub:type="toc">
      <ol>
        <li><a href="text/chapter-1.xhtml">Start</a></li>
      </ol>
    </nav>
  </body>
</html>`,
    },
    {
      path: "OEBPS/text/chapter-1.xhtml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <title>Start</title>
    <link rel="stylesheet" href="../styles/book.css" />
  </head>
  <body>
    <h1>Start</h1>
    <p>Minimal EPUB body with chips search marker.</p>
    <p id="note">Internal target.</p>
    <p><a href="#note">Jump to note</a></p>
    <img src="../images/cover.png" alt="cover" />
  </body>
</html>`,
    },
    {
      path: "OEBPS/styles/book.css",
      content: "body { color: #222; background-image: url('../images/cover.png'); }",
    },
    {
      path: "OEBPS/images/cover.png",
      content: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    },
  ]);
}

function source(overrides: Partial<BookSourceDescriptor> & { fileName: string; title: string }): BookSourceDescriptor {
  return {
    sourceId: `/samples/${overrides.fileName}`,
    fileName: overrides.fileName,
    title: overrides.title,
    format: overrides.format,
    mimeType: overrides.mimeType,
    resourceUri: overrides.resourceUri,
    isRemote: false,
  };
}

async function loadAndRender(input: {
  bytes: Uint8Array;
  source: BookSourceDescriptor;
}): Promise<{ bookTitle: string; sectionTitle: string; html: string }> {
  const book = await loadReadableBook(input);
  const section = book.sections[0];
  expect(section).toBeTruthy();
  const rendered = await renderSectionDocument(book, section?.path ?? "");

  return {
    bookTitle: book.metadata.title,
    sectionTitle: rendered.title,
    html: rendered.html,
  };
}

describe("书籍阅读器基础流程真实回归", () => {
  it("从 Host 启动上下文归一空启动、targetPath、resourceOpen、远程 URL 与 chips.book-card payload", () => {
    expect(resolveLaunchBookTarget({ launchParams: {} })).toBeNull();

    expect(
      resolveLaunchBookTarget({
        launchParams: {
          targetPath: "/books/local.epub",
        },
      }),
    ).toMatchObject({
      sourceId: "/books/local.epub",
      filePath: "/books/local.epub",
      fileName: "local.epub",
    });

    const remoteTarget = resolveLaunchBookTarget({
      launchParams: {
        resourceOpen: {
          resourceId: "https://example.com/library/minimal.epub",
          mimeType: "application/epub+zip",
          title: "Remote Minimal",
        },
      },
    });
    expect(remoteTarget).toMatchObject({
      sourceId: "https://example.com/library/minimal.epub",
      fileName: "minimal.epub",
      title: "Remote Minimal",
    });
    expect(createBookSourceDescriptor(remoteTarget as LaunchBookTarget).isRemote).toBe(true);

    expect(
      resolveLaunchBookTarget({
        launchParams: {
          targetPath: "/tmp/fallback.pdf",
          resourceOpen: {
            resourceId: "chips-render://card-root/book-card/books/minimal.pdf",
            filePath: "/resolved/card/books/minimal.pdf",
            fileName: "minimal.pdf",
            mimeType: "application/pdf",
            payload: {
              kind: "chips.book-card",
              version: "1.0.0",
              cardType: "base.book",
              mode: "ebook",
              resources: {
                book: {
                  resourceId: "chips-render://card-root/book-card/books/minimal.pdf",
                  relativePath: "books/minimal.pdf",
                  fileName: "minimal.pdf",
                  mimeType: "application/pdf",
                },
              },
              display: {
                title: "Book Card Title",
                author: "Book Card Author",
              },
            },
          },
        },
      }),
    ).toMatchObject({
      sourceId: "chips-render://card-root/book-card/books/minimal.pdf",
      filePath: "/resolved/card/books/minimal.pdf",
      relativePath: "books/minimal.pdf",
      title: "Book Card Title",
      author: "Book Card Author",
      mimeType: "application/pdf",
    });

    expect(
      resolveLaunchBookTarget({
        launchParams: {
          resourceOpen: {
            resourceId: "https://community.example/cache/assets/content/books/minimal.epub",
            fileName: "minimal.epub",
            mimeType: "application/epub+zip",
            payload: {
              kind: "chips.book-card",
              version: "1.0.0",
              cardType: "base.book",
              mode: "ebook",
              resources: {
                book: {
                  resourceId: "books/minimal.epub",
                  relativePath: "books/minimal.epub",
                  fileName: "minimal.epub",
                  mimeType: "application/epub+zip",
                },
              },
              display: {
                title: "Community Cached Book",
                author: "Book Card Author",
              },
            },
          },
        },
      }),
    ).toMatchObject({
      sourceId: "https://community.example/cache/assets/content/books/minimal.epub",
      relativePath: "books/minimal.epub",
      title: "Community Cached Book",
      author: "Book Card Author",
      mimeType: "application/epub+zip",
    });
  });

  it("加载并渲染 EPUB / EPUB3 最小样本，保留目录、资源内联和内部链接改写", async () => {
    const epubBytes = createMinimalEpubBytes();
    const epub = await loadAndRender({
      bytes: epubBytes,
      source: source({
        fileName: "minimal.epub",
        title: "Minimal EPUB",
        format: "epub",
        mimeType: "application/epub+zip",
      }),
    });

    expect(epub.bookTitle).toBe("Minimal EPUB");
    expect(epub.sectionTitle).toBe("Start");
    expect(epub.html).toContain("Minimal EPUB body with chips search marker.");
    expect(epub.html).toContain("data:image/png;base64,");
    expect(epub.html).toContain('data-epub-target="OEBPS/text/chapter-1.xhtml#note"');
    expect(epub.html).toContain('data-chips-app="book-reader.chapter"');

    const epub3 = await loadReadableBook({
      bytes: epubBytes,
      source: source({
        fileName: "minimal.epub3",
        title: "Minimal EPUB3",
        format: "epub3",
        mimeType: "application/epub+zip",
      }),
    });
    expect(epub3.sections.map((section) => section.title)).toEqual(["Start"]);
    expect(epub3.navigation[0]?.label).toBe("Start");
  });

  it("加载成品测试空间真实 EPUB 并解析目录、章节与封面资源", async () => {
    const originalBlob = globalThis.Blob;
    globalThis.Blob = NodeBlob as typeof Blob;
    const epubPath = requireFileMaterial("电子书.epub");
    try {
      const book = await loadReadableBook({
        bytes: readFileSync(epubPath),
        source: createBookSourceDescriptor({
          sourceId: epubPath,
          filePath: epubPath,
          fileName: "电子书.epub",
          mimeType: "application/epub+zip",
          title: "真实 EPUB 回归",
        }),
      });

      expect(book.source).toMatchObject({
        sourceId: epubPath,
        filePath: epubPath,
        fileName: "电子书.epub",
        mimeType: "application/epub+zip",
        format: "epub",
        isRemote: false,
      });
      expect(book.metadata.title).toBeTruthy();
      expect(book.sections.length).toBeGreaterThan(0);
      expect(book.navigation.length).toBeGreaterThan(0);

      const firstSection = book.sections[0];
      expect(firstSection?.path).toBeTruthy();
      const rendered = await renderSectionDocument(book, firstSection?.path ?? "");
      expect(rendered.html).toContain('data-chips-app="book-reader.chapter"');
      expect(rendered.html.length).toBeGreaterThan(100);
    } finally {
      globalThis.Blob = originalBlob;
    }
  });

  it("加载并渲染 PDF / TXT / Markdown / FB2 / RTF 最小样本", async () => {
    const cases: Array<{
      label: string;
      bytes: Uint8Array;
      source: BookSourceDescriptor;
      expectedTitle: string;
      expectedHtml: string[];
    }> = [
      {
        label: "PDF",
        bytes: encoder.encode("%PDF-1.7\n%%EOF"),
        source: source({
          fileName: "minimal.pdf",
          title: "Minimal PDF",
          format: "pdf",
          mimeType: "application/pdf",
          resourceUri: "chips-resource://book-reader/minimal.pdf",
        }),
        expectedTitle: "Minimal PDF",
        expectedHtml: ["chips-reader-pdf", "chips-resource://book-reader/minimal.pdf"],
      },
      {
        label: "TXT",
        bytes: encoder.encode("第一章\n\nchips text body"),
        source: source({
          fileName: "minimal.txt",
          title: "Minimal TXT",
          format: "txt",
          mimeType: "text/plain",
        }),
        expectedTitle: "Minimal TXT",
        expectedHtml: ["<p>第一章</p>", "chips text body"],
      },
      {
        label: "Markdown",
        bytes: encoder.encode("# Markdown Title\n\n- chips markdown item"),
        source: source({
          fileName: "minimal.md",
          title: "Minimal Markdown",
          format: "md",
          mimeType: "text/markdown",
        }),
        expectedTitle: "Minimal Markdown",
        expectedHtml: ["<h1>Markdown Title</h1>", "<li>chips markdown item</li>"],
      },
      {
        label: "FB2",
        bytes: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<FictionBook>
  <description>
    <title-info>
      <book-title>Minimal FB2</book-title>
      <author><first-name>Fiction</first-name><last-name>Author</last-name></author>
    </title-info>
  </description>
  <body>
    <section>
      <title><p>FB2 Chapter</p></title>
      <p>chips fb2 body</p>
    </section>
  </body>
</FictionBook>`),
        source: source({
          fileName: "minimal.fb2",
          title: "Fallback FB2",
          format: "fb2",
          mimeType: "application/x-fictionbook+xml",
        }),
        expectedTitle: "Minimal FB2",
        expectedHtml: ["FB2 Chapter", "chips fb2 body"],
      },
      {
        label: "RTF",
        bytes: encoder.encode("{\\rtf1\\ansi RTF Title\\par chips rtf body}"),
        source: source({
          fileName: "minimal.rtf",
          title: "Minimal RTF",
          format: "rtf",
          mimeType: "application/rtf",
        }),
        expectedTitle: "Minimal RTF",
        expectedHtml: ["RTF Title", "chips rtf body"],
      },
    ];

    for (const item of cases) {
      const rendered = await loadAndRender({
        bytes: item.bytes,
        source: item.source,
      });
      expect(rendered.bookTitle, item.label).toBe(item.expectedTitle);
      for (const expected of item.expectedHtml) {
        expect(rendered.html, item.label).toContain(expected);
      }
    }
  });

  it("能在已加载文档上执行搜索回归", async () => {
    const book = await loadReadableBook({
      bytes: encoder.encode("Searchable chips body\n\nSecond chips paragraph"),
      source: source({
        fileName: "search.txt",
        title: "Search TXT",
        format: "txt",
        mimeType: "text/plain",
      }),
    });
    const engine = new SearchEngine(book);
    const results = [];

    for await (const batch of engine.search("chips", { maxResults: 4 })) {
      results.push(...batch);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      sectionIndex: 0,
      sectionTitle: "Search TXT",
      query: "chips",
    });
  });

  it("识别重型文档启动目标，但在缺少正式解码器时给出明确错误", async () => {
    const heavyFormats = [
      { fileName: "sample.mobi", mimeType: "application/x-mobipocket-ebook", format: "mobi", error: "MOBI" },
      { fileName: "sample.azw", mimeType: "application/vnd.amazon.ebook", format: "azw", error: "AZW" },
      { fileName: "sample.azw3", mimeType: "application/vnd.amazon.ebook", format: "azw3", error: "AZW3" },
      { fileName: "sample.djvu", mimeType: "image/vnd.djvu", format: "djvu", error: "DJVU" },
      { fileName: "sample.doc", mimeType: "application/msword", format: "doc", error: "DOC" },
      {
        fileName: "sample.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        format: "docx",
        error: "DOCX",
      },
    ];

    for (const item of heavyFormats) {
      const target: LaunchBookTarget = {
        sourceId: `/samples/${item.fileName}`,
        fileName: item.fileName,
        mimeType: item.mimeType,
      };
      expect(isSupportedBookResource(target), item.fileName).toBe(true);
      await expect(loadReadableBook({
        bytes: encoder.encode("binary"),
        source: source({
          fileName: item.fileName,
          title: item.fileName,
          format: item.format,
          mimeType: item.mimeType,
        }),
      }), item.fileName).rejects.toThrow(item.error);
    }
  });
});
