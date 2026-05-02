import { afterEach, describe, expect, it, vi } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import { openHyperlinkInSystemBrowser } from "../../src/render/view";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("mountBasecardView", () => {
  const originalChips = (window as Window & { chips?: unknown }).chips;

  afterEach(() => {
    (window as Window & { chips?: unknown }).chips = originalChips;
  });

  it("renders a full-width hyperlink button that opens in a new page", () => {
    const container = document.createElement("div");
    const openResource = vi.fn();
    const config: BasecardConfig = {
      card_type: "HyperlinkCard",
      anchor_text: "Chips",
      url: "https://example.com/docs",
      locale: "zh-CN",
      theme: "",
    };

    const dispose = mountBasecardView({
      container,
      config,
      openResource,
    });
    const buttonEl = container.querySelector(".chips-hyperlink-card__button") as HTMLButtonElement | null;

    expect(buttonEl?.tagName).toBe("BUTTON");
    expect(buttonEl?.textContent).toBe("Chips");
    expect(buttonEl?.type).toBe("button");
    buttonEl?.click();
    expect(openResource).toHaveBeenCalledWith({
      resourceId: "https://example.com/docs",
      mimeType: "text/html",
      title: "Chips",
    });

    dispose();
    expect(container.childElementCount).toBe(0);
  });

  it("renders a disabled strip when the link is not valid", () => {
    const container = document.createElement("div");
    const config: BasecardConfig = {
      card_type: "HyperlinkCard",
      anchor_text: "Bad link",
      url: "javascript:alert(1)",
      locale: "zh-CN",
      theme: "",
    };

    const dispose = mountBasecardView({
      container,
      config,
    });
    const activeButton = container.querySelector("button");
    const disabledEl = container.querySelector(".chips-hyperlink-card__button--disabled");

    expect(activeButton).toBeNull();
    expect(disabledEl?.textContent).toBe("Bad link");
    expect(disabledEl?.getAttribute("aria-disabled")).toBe("true");

    dispose();
  });

  it("opens valid links through the basecard resource-open bridge first", async () => {
    const openResource = vi.fn();

    await openHyperlinkInSystemBrowser("https://example.com/docs", {
      openResource,
      title: "Chips",
    });

    expect(openResource).toHaveBeenCalledWith({
      resourceId: "https://example.com/docs",
      mimeType: "text/html",
      title: "Chips",
    });
  });

  it("falls back to the Host transfer route when the basecard resource bridge is absent", async () => {
    const invoke = vi.fn().mockResolvedValue({ ack: true });
    (window as Window & { chips?: unknown }).chips = { invoke };

    await openHyperlinkInSystemBrowser("https://example.com/docs");

    expect(invoke).toHaveBeenCalledWith("transfer.openExternal", {
      url: "https://example.com/docs",
    });
  });
});
