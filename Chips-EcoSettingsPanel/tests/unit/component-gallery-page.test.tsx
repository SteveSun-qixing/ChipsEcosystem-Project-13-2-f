import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/app/providers/I18nProvider", () => ({
  useI18n() {
    return {
      t(key: string, params?: Record<string, string | number>) {
        if (!params) {
          return key;
        }
        return `${key}:${JSON.stringify(params)}`;
      },
    };
  },
}));

vi.mock("../../src/app/providers/RuntimeProvider", () => ({
  useRuntimeContext() {
    return {
      currentTheme: null,
    };
  },
}));

describe("ComponentGalleryPage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders shared page sections for every formal component group", async () => {
    const { ComponentGalleryPage } = await import("../../src/features/component-gallery/ComponentGalleryPage");
    const markup = renderToStaticMarkup(<ComponentGalleryPage />);

    expect(markup).toContain("settings-page-stack");
    expect(markup).toContain("settings-page-section");
    expect(markup).toContain("settings-card-grid");
    expect(markup).toContain("settings-card-grid--bento");
    expect(markup).toContain("settingsPanel.gallery.groups.foundation");
    expect(markup).toContain("settingsPanel.gallery.groups.systemUx");
    expect(markup).not.toContain("gallery-page");
    expect(markup).not.toContain("gallery-bento-grid");
    expect(markup).not.toContain("settingsPanel.gallery.subtitle");
    expect(markup).not.toContain("#FFFFFF");
    expect(markup).not.toContain("#0A6CFF");
  });
});
