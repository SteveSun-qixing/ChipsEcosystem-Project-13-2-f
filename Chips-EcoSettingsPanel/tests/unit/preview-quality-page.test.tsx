import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_QUALITY_ENTRIES } from "../../src/features/preview-quality/view-model";

vi.mock("../../src/app/providers/I18nProvider", () => ({
  useI18n() {
    return {
      t(key: string) {
        return key;
      },
    };
  },
}));

describe("PreviewQualityPage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders formal chipsdev preview, contract, and quality report entries", async () => {
    const { PreviewQualityPage } = await import("../../src/features/preview-quality/PreviewQualityPage");
    const markup = renderToStaticMarkup(<PreviewQualityPage />);

    expect(PREVIEW_QUALITY_ENTRIES).toHaveLength(10);
    expect(markup).toContain("settingsPanel.previewQuality.title");
    expect(markup).not.toContain("settingsPanel.previewQuality.subtitle");
    expect(markup).toContain("settings-summary-panel");
    expect(markup).toContain("settings-card-grid");
    expect(markup).not.toContain("preview-quality-page");
    expect(markup).not.toContain("preview-quality-grid");
    expect(markup).toContain("chipsdev preview --target app");
    expect(markup).toContain("chipsdev component gallery");
    expect(markup).toContain("chipsdev theme inspect");
    expect(markup).toContain("chipsdev quality gate");
    expect(markup).toContain("chipsdev diagnostics");
    expect(markup).not.toContain("ThemePack/");
    expect(markup).not.toContain("Chips-ComponentLibrary/packages/theme-contracts");
  });
});
