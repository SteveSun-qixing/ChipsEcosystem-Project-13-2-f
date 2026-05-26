import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveLaunchBookTarget } from "../../src/utils/launch-resource";

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

  it("通过正式资源打开上下文接收成品测试空间真实 EPUB", () => {
    const epubPath = requireFileMaterial("电子书.epub");

    expect(
      resolveLaunchBookTarget({
        launchParams: {
          trigger: "resource-open-service",
          targetPath: "/tmp/stale-book.epub",
          resourceOpen: {
            intent: "view",
            resourceId: epubPath,
            filePath: epubPath,
            fileName: "电子书.epub",
            mimeType: "application/epub+zip",
            title: "真实 EPUB 回归",
            matchedCapability: "resource-handler:view:application/epub+zip",
          },
        },
      }),
    ).toEqual({
      sourceId: epubPath,
      filePath: epubPath,
      fileName: "电子书.epub",
      mimeType: "application/epub+zip",
      title: "真实 EPUB 回归",
    });
  });

  it("通过电子书基础卡片 payload 接收真实 EPUB 展示上下文", () => {
    const epubPath = requireFileMaterial("电子书.epub");

    expect(
      resolveLaunchBookTarget({
        launchParams: {
          trigger: "resource-open-service",
          targetPath: "/tmp/stale-book.epub",
          resourceOpen: {
            intent: "view",
            resourceId: epubPath,
            filePath: epubPath,
            fileName: "电子书.epub",
            mimeType: "application/epub+zip",
            payload: {
              kind: "chips.book-card",
              version: "1.0.0",
              cardType: "base.book",
              mode: "ebook",
              resources: {
                book: {
                  resourceId: epubPath,
                  relativePath: "电子书.epub",
                  fileName: "电子书.epub",
                  mimeType: "application/epub+zip",
                },
              },
              display: {
                title: "真实 EPUB 书籍卡片",
                author: "Chips QA",
              },
            },
          },
        },
      }),
    ).toEqual({
      sourceId: epubPath,
      filePath: epubPath,
      fileName: "电子书.epub",
      mimeType: "application/epub+zip",
      title: "真实 EPUB 书籍卡片",
      author: "Chips QA",
      relativePath: "电子书.epub",
    });
  });
});
