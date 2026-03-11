import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/app/providers/I18nProvider", () => ({
  useI18n() {
    return {
      t(key: string) {
        return key;
      },
    };
  },
}));

describe("SectionStateBoundary", () => {
  it("does not render the error boundary wrapper when no error exists", async () => {
    const { SectionStateBoundary } = await import("../../src/shared/ui/SectionStateBoundary");
    const markup = renderToStaticMarkup(
      <SectionStateBoundary loading={false} error={null} loadingLabel="loading">
        <div>content</div>
      </SectionStateBoundary>,
    );

    expect(markup).not.toContain('data-scope="error-boundary"');
    expect(markup).toContain("content");
  });
});
