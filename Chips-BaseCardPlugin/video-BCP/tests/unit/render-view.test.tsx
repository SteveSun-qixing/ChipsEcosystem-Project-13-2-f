import { describe, expect, it, vi } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("mountBasecardView", () => {
  it("renders cover metadata and delegates open requests", async () => {
    const container = document.createElement("div");
    const openResource = vi.fn();
    const config: BasecardConfig = {
      card_type: "VideoCard",
      theme: "",
      video_file: "demo.mp4",
      cover_image: "demo-cover.jpg",
      video_title: "旅行日志",
      publish_time: "2026-04-18",
      creator: "薯片工作室",
    };

    const dispose = mountBasecardView({
      container,
      config,
      openResource,
    });
    await Promise.resolve();
    const titleEl = container.querySelector(".chips-video-card__title");
    const metaEl = container.querySelector(".chips-video-card__meta");
    const buttonEl = container.querySelector(".chips-video-card__surface-button") as HTMLButtonElement | null;
    const posterEl = container.querySelector(".chips-video-card__poster") as HTMLImageElement | null;

    expect(titleEl?.textContent).toBe("旅行日志");
    expect(metaEl?.textContent).toBe("薯片工作室 · 2026-04-18");
    expect(posterEl?.getAttribute("src")).toBe("demo-cover.jpg");

    buttonEl?.click();

    expect(openResource).toHaveBeenCalledWith({
      resourceId: "demo.mp4",
      mimeType: "video/mp4",
      title: "旅行日志",
      fileName: "demo.mp4",
    });
  });

  it("renders the empty state when no video is configured", () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: {
        card_type: "VideoCard",
        theme: "",
        video_file: "",
        cover_image: "",
        video_title: "",
        publish_time: "",
        creator: "",
      },
    });

    const emptyEl = container.querySelector(".chips-video-card__empty");
    expect(emptyEl?.textContent).toContain("No video has been added yet.");

    dispose();
  });
});
