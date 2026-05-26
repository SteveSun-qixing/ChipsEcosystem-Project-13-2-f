import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveLaunchImagePath, resolveLaunchImageTarget } from "../../src/utils/launch-resource";

const workspaceRoot = resolve(__dirname, "../../..");
const testingSpaceRoot = resolve(workspaceRoot, "ProductFinishedProductTestingSpace");

function requireMaterial(relativePath: string): string {
  const filePath = resolve(testingSpaceRoot, relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`真实素材缺失：${filePath}`);
  }

  return filePath;
}

function requireFileMaterial(relativePath: string): string {
  const filePath = requireMaterial(relativePath);
  if (!statSync(filePath).isFile()) {
    throw new Error(`真实素材不是文件：${filePath}`);
  }

  return filePath;
}

function requireDirectoryMaterial(relativePath: string): string {
  const dirPath = requireMaterial(relativePath);
  if (!statSync(dirPath).isDirectory()) {
    throw new Error(`真实素材不是目录：${dirPath}`);
  }

  return dirPath;
}

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
          targetPath: "/tmp/fallback.png",
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

  it("通过正式资源打开上下文接收成品测试空间真实图片", () => {
    const imagePath = requireFileMaterial("图片.jpg");

    expect(
      resolveLaunchImageTarget({
        launchParams: {
          trigger: "resource-open-service",
          targetPath: "/tmp/stale-target.jpg",
          resourceOpen: {
            intent: "view",
            resourceId: imagePath,
            filePath: imagePath,
            mimeType: "image/jpeg",
            fileName: "图片.jpg",
            title: "成品测试图片",
            matchedCapability: "resource-handler:view:image/*",
          },
        },
      }),
    ).toEqual({
      images: [
        {
          sourceId: imagePath,
          filePath: imagePath,
          fileName: "图片.jpg",
          mimeType: "image/jpeg",
          title: "成品测试图片",
        },
      ],
      initialIndex: 0,
      title: "成品测试图片",
    });
  });

  it("使用真实电子书图片包解包目录构造 image-sequence 队列", () => {
    const imageArchivePath = requireFileMaterial("电子书图片.zip");
    expect(statSync(imageArchivePath).size).toBeGreaterThan(0);

    const imageDirectory = requireDirectoryMaterial("电子书图片");
    const imageFiles = readdirSync(imageDirectory)
      .filter((fileName) => /\.(png|jpe?g|webp|avif)$/i.test(fileName))
      .sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
    expect(imageFiles.length).toBeGreaterThanOrEqual(3);

    const imageResources = imageFiles.slice(0, 3).map((fileName) => {
      const imagePath = resolve(imageDirectory, fileName);
      return {
        resourceId: imagePath,
        relativePath: `电子书图片/${fileName}`,
        fileName,
        mimeType: "image/png",
      };
    });

    expect(
      resolveLaunchImageTarget({
        launchParams: {
          trigger: "resource-open-service",
          resourceOpen: {
            intent: "view",
            resourceId: imageResources[1].resourceId,
            filePath: imageResources[1].resourceId,
            fileName: basename(imageResources[1].resourceId),
            mimeType: "image/png",
            payload: {
              kind: "chips.book-card",
              version: "1.0.0",
              cardType: "base.book",
              mode: "image-sequence",
              resources: {
                images: imageResources,
              },
              display: {
                title: "真实电子书图片包",
              },
            },
          },
        },
      }),
    ).toEqual({
      images: imageResources.map((resource) => ({
        sourceId: resource.resourceId,
        fileName: resource.fileName,
        mimeType: resource.mimeType,
        relativePath: resource.relativePath,
      })),
      initialIndex: 1,
      title: "真实电子书图片包",
    });
  });
});
