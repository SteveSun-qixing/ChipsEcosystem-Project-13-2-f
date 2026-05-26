import { describe, it, expect } from "vitest";
import { App } from "../../src/App";
import { richTextEditorCommandDefinitions } from "../../src/commands/rich-text-editor-commands";

describe("App (标准应用插件根组件)", () => {
  it("应当导出一个可用的 React 组件", () => {
    expect(App).toBeTypeOf("function");
  });

  it("命令定义应当只声明多语言 key，不写原始展示文案", () => {
    for (const command of richTextEditorCommandDefinitions) {
      expect(command.commandId).toMatch(/^com\.chips\.rich-text-editor\./);
      expect(command.titleKey).toMatch(/^app\.commands\./);
      expect(command.handlerId).toMatch(/^rich-text-editor:/);
      expect(command).not.toHaveProperty("title");
      expect(command).not.toHaveProperty("description");
      expect(command).not.toHaveProperty("ariaLabel");
      expect(command).not.toHaveProperty("label");
    }
  });
});
