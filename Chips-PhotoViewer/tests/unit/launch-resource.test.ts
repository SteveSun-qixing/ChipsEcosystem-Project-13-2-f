import { describe, expect, it } from "vitest";
import { resolveLaunchImagePath } from "../../src/utils/launch-resource";

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
});
