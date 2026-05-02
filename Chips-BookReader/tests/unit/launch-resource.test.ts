import { describe, expect, it } from "vitest";
import { resolveLaunchBookTarget } from "../../src/utils/launch-resource";

describe("resolveLaunchBookTarget", () => {
  it("优先使用 resourceOpen.filePath 恢复本地电子书", () => {
    expect(
      resolveLaunchBookTarget({
        launchParams: {
          targetPath: "/tmp/fallback.epub",
          resourceOpen: {
            resourceId: "chips-resource://book/1",
            filePath: "/tmp/demo.epub",
            fileName: "demo.epub",
            mimeType: "application/epub+zip",
          },
        },
      }),
    ).toEqual({
      sourceId: "/tmp/demo.epub",
      filePath: "/tmp/demo.epub",
      fileName: "demo.epub",
      mimeType: "application/epub+zip",
      title: undefined,
    });
  });

  it("在远端电子书场景下回退到 resourceId", () => {
    expect(
      resolveLaunchBookTarget({
        launchParams: {
          resourceOpen: {
            resourceId: "https://example.com/demo.epub",
            mimeType: "application/epub+zip",
            title: "Remote Demo",
          },
        },
      }),
    ).toEqual({
      sourceId: "https://example.com/demo.epub",
      filePath: undefined,
      fileName: "demo.epub",
      mimeType: "application/epub+zip",
      title: "Remote Demo",
    });
  });

  it("在只有 targetPath 时恢复普通文件关联打开", () => {
    expect(
      resolveLaunchBookTarget({
        launchParams: {
          targetPath: "/tmp/file-association.epub",
        },
      }),
    ).toEqual({
      sourceId: "/tmp/file-association.epub",
      filePath: "/tmp/file-association.epub",
      fileName: "file-association.epub",
      mimeType: undefined,
      title: undefined,
    });
  });

  it("在没有任何可用目标时返回 null", () => {
    expect(
      resolveLaunchBookTarget({
        launchParams: {
          resourceOpen: {
            mimeType: "application/epub+zip",
          },
        },
      }),
    ).toBeNull();
  });

  it("优先消费电子书基础卡片 payload 中的书籍资源", () => {
    expect(
      resolveLaunchBookTarget({
        launchParams: {
          targetPath: "/tmp/fallback.pdf",
          resourceOpen: {
            resourceId: "chips-render://card-root/demo/book.pdf",
            filePath: "/tmp/card/book.pdf",
            fileName: "book.pdf",
            mimeType: "application/pdf",
            title: "Fallback Title",
            payload: {
              kind: "chips.book-card",
              version: "1.0.0",
              cardType: "base.book",
              mode: "ebook",
              resources: {
                book: {
                  resourceId: "chips-render://card-root/demo/book.pdf",
                  relativePath: "books/book.pdf",
                  fileName: "book.pdf",
                  mimeType: "application/pdf",
                },
              },
              display: {
                title: "Book Card Title",
                author: "Book Author",
              },
            },
          },
        },
      }),
    ).toEqual({
      sourceId: "chips-render://card-root/demo/book.pdf",
      filePath: "/tmp/card/book.pdf",
      fileName: "book.pdf",
      mimeType: "application/pdf",
      title: "Book Card Title",
      author: "Book Author",
      relativePath: "books/book.pdf",
    });
  });
});
