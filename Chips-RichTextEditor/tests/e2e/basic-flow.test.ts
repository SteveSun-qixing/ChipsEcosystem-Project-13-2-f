import { describe, expect, it } from "vitest";
import { resolveLaunchCardPath } from "../../src/lib/launch-target";

describe("启动参数目标恢复", () => {
  it("应当只接受 .card 作为启动目标路径", () => {
    expect(
      resolveLaunchCardPath({
        launchParams: {
          targetPath: "/tmp/demo.card",
        },
      } as never),
    ).toBe("/tmp/demo.card");

    expect(
      resolveLaunchCardPath({
        launchParams: {
          targetPath: "/tmp/demo.txt",
        },
      } as never),
    ).toBeNull();
  });
});
