import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhotoViewerStage } from "../../src/components/PhotoViewerStage";
import {
  applyPhotoViewerCommandState,
  createPhotoViewerCommandStates,
  createPhotoViewerDisplayCommandViews,
  photoViewerCommandViews,
} from "../../src/commands/photo-viewer-commands";
import { translateLocalKey } from "../../src/i18n/messages";

function t(key: string, params?: Record<string, string | number>): string {
  return translateLocalKey(key, "zh-CN", params);
}

describe("PhotoViewerStage command chrome", () => {
  it("renders grouped icon toolbar without shortcut text", () => {
    const commandViews = createPhotoViewerDisplayCommandViews(
      applyPhotoViewerCommandState(
        photoViewerCommandViews,
        createPhotoViewerCommandStates({
          hasImage: false,
          isImageLoaded: false,
          isSaving: false,
          canPreviousImage: false,
          canNextImage: false,
        }),
      ),
    );

    const html = renderToStaticMarkup(
      <PhotoViewerStage
        imageSource={null}
        isImageLoaded={false}
        isResolving={false}
        isSaving={false}
        feedback={null}
        onOpenFile={() => undefined}
        onSaveImage={() => undefined}
        onPreviousImage={() => undefined}
        onNextImage={() => undefined}
        onDropFile={() => undefined}
        onImageLoad={() => undefined}
        onImageError={() => undefined}
        imageDimensions={null}
        sequenceCount={0}
        currentImageIndex={0}
        commandViews={commandViews}
        commandI18n={t}
        commandMenuDescriptors={[
          { menuId: "file", label: t("photo-viewer.commands.menu.file") },
          { menuId: "view", label: t("photo-viewer.commands.menu.view") },
          { menuId: "navigate", label: t("photo-viewer.commands.menu.navigate") },
        ]}
        commandRegistrationPhase="ready"
        commandRegistrationErrorCode={null}
        lastInvokedCommand={null}
        t={t}
      />,
    );

    expect(html).toContain("photo-viewer-command-toolbar");
    expect(html).toContain("photo-viewer-command-group");
    expect(html).toContain("data-command-id=");
    expect(html).not.toContain('data-part="shortcut"');
    expect(html).not.toContain("Mod+");
    expect(html).not.toContain("ArrowLeft");
    expect(html).not.toContain("ArrowRight");
  });
});
