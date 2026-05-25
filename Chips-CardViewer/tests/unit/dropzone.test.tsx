import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { DropZone } from "../../src/components/DropZone";

vi.mock("../../config/logging", () => ({
  createScopedLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe("DropZone", () => {
  it("provides region, labelled panel and error announcement semantics", () => {
    const html = renderToString(
      <DropZone
        onFilePath={vi.fn()}
        onOpenFile={vi.fn()}
        error="当前只支持打开 .card 或 .box 文件。"
        ariaLabel="导入卡片或箱子"
        title="拖入卡片或箱子文件"
        description="将 .card 或 .box 文件拖到当前窗口。"
        openLabel="打开文件"
      />,
    );

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="导入卡片或箱子"');
    expect(html).toContain('aria-labelledby="card-viewer-dropzone-title"');
    expect(html).toContain('aria-describedby="card-viewer-dropzone-description card-viewer-dropzone-error"');
    expect(html).toContain('role="alert"');
  });
});
