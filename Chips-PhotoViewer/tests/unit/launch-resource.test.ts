import { describe, expect, it } from "vitest";
import { resolveLaunchImagePath, resolveLaunchImageTarget } from "../../src/utils/launch-resource";

describe("resolveLaunchImagePath", () => {
  it("在只有 targetPath 时回退到直接路径", () => {
    expect(
      resolveLaunchImagePath({
        launchParams: {
          targetPath: "/tmp/direct.png",
        },
      }),
    ).toBe("/tmp/direct.png");
  });

  it("在标准 resourceOpen 上下文中回退到 filePath", () => {
    expect(
      resolveLaunchImagePath({
        launchParams: {
          resourceOpen: {
            resourceId: "chips-render://card-root/test-token/assets/demo.png",
            filePath: "/tmp/demo.png",
          },
        },
      }),
    ).toBe("/tmp/demo.png");
  });

  it("在 Web 资源打开场景下允许回退到 resourceId", () => {
    expect(
      resolveLaunchImagePath({
        launchParams: {
          resourceOpen: {
            resourceId: "https://example.com/demo.png",
          },
        },
      }),
    ).toBe("https://example.com/demo.png");
  });

  it("当没有可用路径时返回 null", () => {
    expect(
      resolveLaunchImagePath({
        launchParams: {
          resourceOpen: {
            mimeType: "image/png",
          },
        },
      }),
    ).toBeNull();
  });

  it("识别电子书基础卡片图片序列 payload 并保留顺序", () => {
    expect(
      resolveLaunchImageTarget({
        launchParams: {
          resourceOpen: {
            resourceId: "chips-render://card-root/demo/page-02.jpg",
            fileName: "page-02.jpg",
            mimeType: "image/jpeg",
            payload: {
              kind: "chips.book-card",
              version: "1.0.0",
              cardType: "base.book",
              mode: "image-sequence",
              resources: {
                images: [
                  {
                    resourceId: "chips-render://card-root/demo/page-01.jpg",
                    relativePath: "comic/page-01.jpg",
                    fileName: "page-01.jpg",
                    mimeType: "image/jpeg",
                  },
                  {
                    resourceId: "chips-render://card-root/demo/page-02.jpg",
                    relativePath: "comic/page-02.jpg",
                    fileName: "page-02.jpg",
                    mimeType: "image/jpeg",
                  },
                ],
              },
              display: {
                title: "Demo Comic",
              },
            },
          },
        },
      }),
    ).toEqual({
      images: [
        {
          sourceId: "chips-render://card-root/demo/page-01.jpg",
          fileName: "page-01.jpg",
          mimeType: "image/jpeg",
          relativePath: "comic/page-01.jpg",
        },
        {
          sourceId: "chips-render://card-root/demo/page-02.jpg",
          fileName: "page-02.jpg",
          mimeType: "image/jpeg",
          relativePath: "comic/page-02.jpg",
        },
      ],
      initialIndex: 1,
      title: "Demo Comic",
    });
  });
});
