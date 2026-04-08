import { describe, expect, it } from "vitest";
import { resolveLaunchImagePath } from "../../src/utils/launch-resource";

describe("resolveLaunchImagePath", () => {
  it("优先读取直接 targetPath", () => {
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

  it("当没有可用路径时返回 null", () => {
    expect(
      resolveLaunchImagePath({
        launchParams: {
          resourceOpen: {
            resourceId: "https://example.com/demo.png",
          },
        },
      }),
    ).toBeNull();
  });
});
