import { describe, expect, it, vi } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";
import { extractVideoCoverFile } from "../../src/shared/video-cover";

vi.mock("../../src/shared/video-cover", () => ({
  extractVideoCoverFile: vi.fn(),
}));

describe("createBasecardEditorRoot", () => {
  it("emits metadata changes only after the user leaves the metadata form", async () => {
    const initialConfig: BasecardConfig = {
      card_type: "VideoCard",
      theme: "",
      video_file: "demo.mp4",
      cover_image: "demo-cover.jpg",
      video_title: "Title",
      publish_time: "",
      creator: "",
    };

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: (next) => {
        lastConfig = next;
      },
    });
    document.body.appendChild(root);

    const titleInput = root.querySelector('[data-role="video-title-input"]') as HTMLInputElement | null;

    if (!titleInput) {
      throw new Error("找不到视频标题输入框");
    }

    titleInput.value = "New Title";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(lastConfig).toBeUndefined();

    titleInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await Promise.resolve();

    expect(lastConfig?.video_title).toBe("New Title");
    expect(lastConfig?.card_type).toBe("VideoCard");

    root.remove();
  });

  it("imports the video and generated default cover when a video is uploaded", async () => {
    vi.mocked(extractVideoCoverFile).mockResolvedValueOnce(
      new File(["cover"], "demo-cover.jpg", { type: "image/jpeg" }),
    );

    const importResource = vi.fn(async (input: { preferredPath?: string }) => ({
      path: input.preferredPath ?? "resource.bin",
    }));

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig: {
        card_type: "VideoCard",
        theme: "",
        video_file: "",
        cover_image: "",
        video_title: "",
        publish_time: "",
        creator: "",
      },
      onChange(next) {
        lastConfig = next;
      },
      importResource,
    });

    const input = root.querySelector('[data-role="video-input"]') as HTMLInputElement | null;
    if (!input) {
      throw new Error("找不到视频上传输入框");
    }

    const videoFile = new File(["video"], "demo.mp4", { type: "video/mp4" });
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [videoFile],
    });

    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(importResource).toHaveBeenCalledTimes(2);
    expect(lastConfig).toMatchObject({
      card_type: "VideoCard",
      video_file: "demo.mp4",
      cover_image: "demo-cover.jpg",
    });
    expect(root.querySelector('[data-role="video-resource"] video')?.getAttribute("src")).toBe("demo.mp4");
    expect(root.querySelector('[data-role="cover-resource"] img')?.getAttribute("src")).toBe("demo-cover.jpg");
  });

  it("imports a video resource from a URL input", async () => {
    vi.mocked(extractVideoCoverFile).mockResolvedValueOnce(null);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      blob: async () => new Blob(["video"], { type: "video/mp4" }),
      headers: new Headers(),
    }));

    vi.stubGlobal("fetch", fetchMock);

    const importResource = vi.fn(async (input: { preferredPath?: string }) => ({
      path: input.preferredPath ?? "resource.bin",
    }));

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig: {
        card_type: "VideoCard",
        theme: "",
        video_file: "",
        cover_image: "",
        video_title: "",
        publish_time: "",
        creator: "",
      },
      onChange(next) {
        lastConfig = next;
      },
      importResource,
    });

    const urlInput = root.querySelector('[data-role="video-url-input"]') as HTMLInputElement | null;
    const submitButton = root.querySelector('[data-role="video-url-submit"]') as HTMLButtonElement | null;

    if (!urlInput || !submitButton) {
      throw new Error("找不到视频 URL 导入控件");
    }

    urlInput.value = "https://example.com/demo.mp4";
    urlInput.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();
    submitButton.click();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/demo.mp4");
    expect(importResource).toHaveBeenCalledTimes(1);
    expect(lastConfig).toMatchObject({
      card_type: "VideoCard",
      video_file: "demo.mp4",
      cover_image: "",
    });

    root.remove();
    vi.unstubAllGlobals();
  });
});
