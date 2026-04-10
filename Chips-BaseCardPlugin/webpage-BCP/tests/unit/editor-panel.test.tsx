// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";

type DisposableRoot = HTMLElement & {
  __chipsDispose?: () => void;
};

function createConfig(overrides?: Partial<BasecardConfig>): BasecardConfig {
  return {
    card_type: "WebPageCard",
    theme: "",
    source_type: "url",
    source_url: "",
    bundle_root: "",
    entry_file: "index.html",
    resource_paths: [],
    display_mode: "fixed",
    fixed_ratio: "7:16",
    max_height_ratio: 20,
    ...overrides,
  };
}

async function flushAsyncWork(waitMs = 0): Promise<void> {
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("createBasecardEditorRoot", () => {
  const mountedRoots: DisposableRoot[] = [];

  beforeEach(() => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "zh-CN",
    });
  });

  afterEach(() => {
    for (const root of mountedRoots) {
      root.__chipsDispose?.();
      root.remove();
    }
    mountedRoots.length = 0;
    document.body.innerHTML = "";
  });

  it("auto refreshes a remote webpage URL and clears previous bundle resources", async () => {
    let lastConfig = createConfig({
      source_type: "bundle",
      bundle_root: "old-bundle",
      entry_file: "index.html",
      resource_paths: [
        "old-bundle/index.html",
        "old-bundle/assets/app.js",
      ],
    });
    const deleteResource = vi.fn(async () => undefined);

    const root = createBasecardEditorRoot({
      initialConfig: lastConfig,
      onChange: (next) => {
        lastConfig = next;
      },
      deleteResource,
    }) as DisposableRoot;
    mountedRoots.push(root);
    document.body.appendChild(root);

    const urlModeButton = root.querySelector('[data-source-mode="url"]') as HTMLButtonElement | null;
    urlModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushAsyncWork();

    const urlInput = root.querySelector(".chips-webpage-editor__url-field") as HTMLInputElement | null;
    if (!urlInput) {
      throw new Error("未找到网页地址输入区域");
    }

    setInputValue(urlInput, "https://example.com/demo");
    await flushAsyncWork(430);

    expect(deleteResource).toHaveBeenCalledTimes(2);
    expect(lastConfig.source_type).toBe("url");
    expect(lastConfig.source_url).toBe("https://example.com/demo");
    expect(lastConfig.resource_paths).toEqual([]);
  });

  it("shows only the matching input area for the selected source mode", async () => {
    const root = createBasecardEditorRoot({
      initialConfig: createConfig(),
      onChange: () => undefined,
    }) as DisposableRoot;
    mountedRoots.push(root);
    document.body.appendChild(root);

    expect(root.querySelector(".chips-webpage-editor__url-field")).not.toBeNull();
    expect(root.querySelector(".chips-webpage-editor__dropzone")).toBeNull();

    const bundleModeButton = root.querySelector('[data-source-mode="bundle"]') as HTMLButtonElement | null;
    bundleModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushAsyncWork();

    expect(root.querySelector(".chips-webpage-editor__url-field")).toBeNull();
    expect(root.querySelector(".chips-webpage-editor__dropzone")).not.toBeNull();

    const urlModeButton = root.querySelector('[data-source-mode="url"]') as HTMLButtonElement | null;
    urlModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushAsyncWork();

    expect(root.querySelector(".chips-webpage-editor__url-field")).not.toBeNull();
    expect(root.querySelector(".chips-webpage-editor__dropzone")).toBeNull();
  });

  it("switches between fixed ratio and free expand display modes", async () => {
    let lastConfig = createConfig();
    const root = createBasecardEditorRoot({
      initialConfig: lastConfig,
      onChange: (next) => {
        lastConfig = next;
      },
    }) as DisposableRoot;
    mountedRoots.push(root);
    document.body.appendChild(root);

    const freeButton = root.querySelector('[data-display-mode="free"]') as HTMLButtonElement | null;
    freeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushAsyncWork();

    expect(lastConfig.display_mode).toBe("free");
    expect(lastConfig.fixed_ratio).toBe("7:16");

    const fixedButton = root.querySelector('[data-display-mode="fixed"]') as HTMLButtonElement | null;
    fixedButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushAsyncWork();

    expect(lastConfig.display_mode).toBe("fixed");
  });

  it("imports a webpage bundle in file mode and replaces previous bundle resources", async () => {
    let lastConfig = createConfig({
      source_type: "bundle",
      bundle_root: "old-bundle",
      entry_file: "index.html",
      resource_paths: [
        "old-bundle/index.html",
        "old-bundle/assets/app.js",
      ],
    });
    const importArchiveBundle = vi.fn(async () => ({
      rootDir: "webpage-bundle-abc123",
      entryFile: "index.html",
      resourcePaths: [
        "webpage-bundle-abc123/index.html",
        "webpage-bundle-abc123/assets/app.js",
      ],
    }));
    const deleteResource = vi.fn(async () => undefined);

    const root = createBasecardEditorRoot({
      initialConfig: lastConfig,
      onChange: (next) => {
        lastConfig = next;
      },
      importArchiveBundle,
      deleteResource,
    }) as DisposableRoot;
    mountedRoots.push(root);
    document.body.appendChild(root);

    const fileInput = root.querySelector("input[type='file']") as HTMLInputElement | null;
    if (!fileInput) {
      throw new Error("未找到网页 ZIP 上传输入框");
    }

    const file = new File(["zip"], "website.zip", { type: "application/zip" });
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [file],
    });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    await flushAsyncWork();

    expect(importArchiveBundle).toHaveBeenCalledWith({
      file,
      preferredRootDir: "webpage-bundle",
      entryFile: "index.html",
    });
    expect(deleteResource).toHaveBeenCalledTimes(2);
    expect(lastConfig.source_type).toBe("bundle");
    expect(lastConfig.bundle_root).toBe("webpage-bundle-abc123");
    expect(lastConfig.resource_paths).toEqual([
      "webpage-bundle-abc123/index.html",
      "webpage-bundle-abc123/assets/app.js",
    ]);
  });
});
