import { describe, expect, it, vi } from "vitest";
import type { Client } from "chips-sdk";
import { mountModule } from "../../src";

function createMockClient() {
  const handlers = new Map<string, (payload: unknown) => void>();

  const client = {
    theme: {
      getAllCss: vi.fn().mockResolvedValue({
        css: ":root { --chips-module-tone-primary: #0f62fe; }",
        themeId: "chips-official.default-theme",
      }),
      getCurrent: vi.fn().mockResolvedValue({
        themeId: "chips-official.default-theme",
        displayName: "Default Theme",
        version: "0.1.0",
      }),
    },
    i18n: {
      getCurrent: vi.fn().mockResolvedValue("en-US"),
    },
    events: {
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        handlers.set(event, handler);
        return () => {
          handlers.delete(event);
        };
      }),
      once: vi.fn(),
      emit: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as Client;

  return {
    client,
    handlers,
  };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

describe("mountModule", () => {
  it("renders runtime state, updates snapshot and reacts to locale changes", async () => {
    const host = document.createElement("div");
    const { client, handlers } = createMockClient();

    const handle = mountModule({
      container: host,
      moduleId: "chips.module.demo",
      slot: "viewer.preview",
      client,
      initialSnapshot: {
        title: "Demo Module",
      },
    });

    await flush();

    expect(host.textContent).toContain("Demo Module");
    expect(host.textContent).toContain("Capability catalog");
    expect(host.querySelector("style")?.textContent).toContain("--chips-module-tone-primary");

    handle.update({
      summary: "Updated module summary",
    });

    await flush();
    expect(host.textContent).toContain("Updated module summary");

    const languageChanged = handlers.get("language.changed");
    if (!languageChanged) {
      throw new Error("language.changed handler is missing");
    }

    languageChanged({ locale: "zh-CN" });
    await flush();

    expect(host.textContent).toContain("模块概览");
    expect(host.textContent).toContain("能力清单");

    handle.unmount();
    expect(host.innerHTML).toBe("");
  });
});
