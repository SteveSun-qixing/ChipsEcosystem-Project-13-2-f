import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const testDir = fileURLToPath(new URL(".", import.meta.url));

describe("应用插件基础流程基线", () => {
  it("声明了设置面板运行所需的正式入口与权限", () => {
    const manifest = readFileSync(resolve(testDir, "../../manifest.yaml"), "utf8");

    expect(manifest).toContain("id: com.chips.eco-settings-panel");
    expect(manifest).toContain("entry: dist/index.html");

    for (const permission of [
      "theme.read",
      "theme.write",
      "i18n.read",
      "i18n.write",
      "plugin.read",
      "plugin.manage",
      "platform.read",
      "platform.external",
    ]) {
      expect(manifest).toContain(`- ${permission}`);
    }
  });
});
