import { describe, expect, it } from "vitest";
import {
  PHOTO_VIEWER_COMMAND_IDS,
  applyPhotoViewerCommandState,
  createPhotoViewerCommandStates,
  photoViewerCommandDefinitions,
  photoViewerCommandViews,
} from "../../src/commands/photo-viewer-commands";
import { appConfig } from "../../config/app-config";

describe("photo viewer commands", () => {
  it("uses stable app scoped command metadata without raw text fields", () => {
    expect(photoViewerCommandDefinitions.length).toBeGreaterThanOrEqual(8);

    for (const command of photoViewerCommandDefinitions) {
      expect(command.commandId.startsWith(`${appConfig.appId}.`)).toBe(true);
      expect(command.scope).toEqual({ kind: "app", appId: appConfig.appId });
      expect(command.titleKey).toMatch(/^photo-viewer\.commands\./);
      expect(command.handlerId).toMatch(/^photo-viewer:/);
      expect(command.icon?.name).toBeTypeOf("string");
      expect(command).not.toHaveProperty("title");
      expect(command).not.toHaveProperty("description");
      expect(command).not.toHaveProperty("ariaLabel");
      expect(command).not.toHaveProperty("label");
    }
  });

  it("enables only open when no image is loaded", () => {
    const stateMap = createPhotoViewerCommandStates({
      hasImage: false,
      isImageLoaded: false,
      isSaving: false,
      canPreviousImage: false,
      canNextImage: false,
    });

    expect(stateMap[PHOTO_VIEWER_COMMAND_IDS.openFile].enabled).toBe(true);
    expect(stateMap[PHOTO_VIEWER_COMMAND_IDS.saveImage].enabled).toBe(false);
    expect(stateMap[PHOTO_VIEWER_COMMAND_IDS.zoomIn].disabledReasonKey).toBe("photo-viewer.commands.disabled.noImage");
  });

  it("projects runtime command state into component command views", () => {
    const stateMap = createPhotoViewerCommandStates({
      hasImage: true,
      isImageLoaded: true,
      isSaving: false,
      canPreviousImage: true,
      canNextImage: false,
    });
    const commands = applyPhotoViewerCommandState(photoViewerCommandViews, stateMap);
    const previous = commands.find((command) => command.commandId === PHOTO_VIEWER_COMMAND_IDS.previousImage);
    const next = commands.find((command) => command.commandId === PHOTO_VIEWER_COMMAND_IDS.nextImage);

    expect(previous?.state?.enabled).toBe(true);
    expect(previous?.diagnostic?.enabled).toBe(true);
    expect(next?.state?.enabled).toBe(false);
    expect(next?.disabledReasonKey).toBe("photo-viewer.commands.disabled.noNextImage");
  });
});
