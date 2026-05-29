import type {
  CommandDefinitionInput,
  CommandInvokedEvent,
  CommandInvocationContext,
  CommandSetStateOptions,
  CommandSource,
  CommandState,
} from "chips-sdk";
import type { ChipsCommandView } from "@chips/component-library";
import { appConfig } from "../../config/app-config";

export const PHOTO_VIEWER_COMMAND_IDS = {
  openFile: `${appConfig.appId}.file.open`,
  saveImage: `${appConfig.appId}.file.save-copy`,
  previousImage: `${appConfig.appId}.view.previous-image`,
  nextImage: `${appConfig.appId}.view.next-image`,
  zoomOut: `${appConfig.appId}.view.zoom-out`,
  zoomIn: `${appConfig.appId}.view.zoom-in`,
  fitToWindow: `${appConfig.appId}.view.fit-to-window`,
  actualSize: `${appConfig.appId}.view.actual-size`,
} as const;

export const PHOTO_VIEWER_COMMAND_HANDLER_IDS = {
  openFile: "photo-viewer:file.open",
  saveImage: "photo-viewer:file.save-copy",
  previousImage: "photo-viewer:view.previous-image",
  nextImage: "photo-viewer:view.next-image",
  zoomOut: "photo-viewer:view.zoom-out",
  zoomIn: "photo-viewer:view.zoom-in",
  fitToWindow: "photo-viewer:view.fit-to-window",
  actualSize: "photo-viewer:view.actual-size",
} as const;

export type PhotoViewerCommandId =
  (typeof PHOTO_VIEWER_COMMAND_IDS)[keyof typeof PHOTO_VIEWER_COMMAND_IDS];
export type PhotoViewerCommandHandlerId =
  (typeof PHOTO_VIEWER_COMMAND_HANDLER_IDS)[keyof typeof PHOTO_VIEWER_COMMAND_HANDLER_IDS];
export type PhotoViewerCommandPhase = "idle" | "registering" | "ready" | "error";

export interface PhotoViewerCommandRuntimeState {
  hasImage: boolean;
  isImageLoaded: boolean;
  isSaving: boolean;
  canPreviousImage: boolean;
  canNextImage: boolean;
}

export interface PhotoViewerCommandStatus {
  commandId: PhotoViewerCommandId;
  handlerId: PhotoViewerCommandHandlerId;
  source: CommandSource;
  invocationId?: string;
  payload?: Record<string, unknown>;
  context?: CommandInvocationContext;
}

const COMMAND_ID_SET = new Set<string>(Object.values(PHOTO_VIEWER_COMMAND_IDS));
const HANDLER_ID_SET = new Set<string>(Object.values(PHOTO_VIEWER_COMMAND_HANDLER_IDS));
const APP_SCOPE = { kind: "app", appId: appConfig.appId } as const;

function shortcut(accelerator: string) {
  return {
    accelerator,
    platform: "desktop" as const,
    preventDefault: true,
  };
}

export const photoViewerCommandDefinitions: CommandDefinitionInput[] = [
  {
    commandId: PHOTO_VIEWER_COMMAND_IDS.openFile,
    titleKey: "photo-viewer.commands.openFile.title",
    descriptionKey: "photo-viewer.commands.openFile.description",
    ariaLabelKey: "photo-viewer.commands.openFile.ariaLabel",
    icon: { name: "folder_open", style: "rounded" },
    scope: APP_SCOPE,
    permission: "platform.read",
    handlerId: PHOTO_VIEWER_COMMAND_HANDLER_IDS.openFile,
    shortcut: shortcut("Mod+O"),
    menuPlacement: [{ menuId: "file", groupId: "primary", order: 10 }],
    toolbarPlacement: [{ toolbarId: "viewer", groupId: "file", order: 10 }],
    paletteKeywords: ["open", "image", "photo-viewer.commands.openFile.title"],
    state: { enabled: true, visible: true },
  },
  {
    commandId: PHOTO_VIEWER_COMMAND_IDS.saveImage,
    titleKey: "photo-viewer.commands.saveImage.title",
    descriptionKey: "photo-viewer.commands.saveImage.description",
    ariaLabelKey: "photo-viewer.commands.saveImage.ariaLabel",
    icon: { name: "save", style: "rounded" },
    scope: APP_SCOPE,
    permission: ["platform.read", "file.write"],
    handlerId: PHOTO_VIEWER_COMMAND_HANDLER_IDS.saveImage,
    shortcut: shortcut("Mod+S"),
    menuPlacement: [{ menuId: "file", groupId: "primary", order: 20 }],
    toolbarPlacement: [{ toolbarId: "viewer", groupId: "file", order: 20 }],
    paletteKeywords: ["save", "copy", "photo-viewer.commands.saveImage.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "photo-viewer.commands.disabled.noImage" },
  },
  {
    commandId: PHOTO_VIEWER_COMMAND_IDS.previousImage,
    titleKey: "photo-viewer.commands.previousImage.title",
    descriptionKey: "photo-viewer.commands.previousImage.description",
    ariaLabelKey: "photo-viewer.commands.previousImage.ariaLabel",
    icon: { name: "chevron_left", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: PHOTO_VIEWER_COMMAND_HANDLER_IDS.previousImage,
    shortcut: shortcut("ArrowLeft"),
    menuPlacement: [{ menuId: "navigate", groupId: "sequence", order: 10 }],
    toolbarPlacement: [{ toolbarId: "viewer", groupId: "sequence", order: 10 }],
    paletteKeywords: ["previous", "photo-viewer.commands.previousImage.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "photo-viewer.commands.disabled.noPreviousImage" },
  },
  {
    commandId: PHOTO_VIEWER_COMMAND_IDS.nextImage,
    titleKey: "photo-viewer.commands.nextImage.title",
    descriptionKey: "photo-viewer.commands.nextImage.description",
    ariaLabelKey: "photo-viewer.commands.nextImage.ariaLabel",
    icon: { name: "chevron_right", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: PHOTO_VIEWER_COMMAND_HANDLER_IDS.nextImage,
    shortcut: shortcut("ArrowRight"),
    menuPlacement: [{ menuId: "navigate", groupId: "sequence", order: 20 }],
    toolbarPlacement: [{ toolbarId: "viewer", groupId: "sequence", order: 20 }],
    paletteKeywords: ["next", "photo-viewer.commands.nextImage.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "photo-viewer.commands.disabled.noNextImage" },
  },
  {
    commandId: PHOTO_VIEWER_COMMAND_IDS.zoomOut,
    titleKey: "photo-viewer.commands.zoomOut.title",
    descriptionKey: "photo-viewer.commands.zoomOut.description",
    ariaLabelKey: "photo-viewer.commands.zoomOut.ariaLabel",
    icon: { name: "zoom_out", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: PHOTO_VIEWER_COMMAND_HANDLER_IDS.zoomOut,
    shortcut: shortcut("Mod+-"),
    menuPlacement: [{ menuId: "view", groupId: "zoom", order: 10 }],
    toolbarPlacement: [{ toolbarId: "viewer", groupId: "zoom", order: 10 }],
    paletteKeywords: ["zoom", "out", "photo-viewer.commands.zoomOut.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "photo-viewer.commands.disabled.noImage" },
  },
  {
    commandId: PHOTO_VIEWER_COMMAND_IDS.zoomIn,
    titleKey: "photo-viewer.commands.zoomIn.title",
    descriptionKey: "photo-viewer.commands.zoomIn.description",
    ariaLabelKey: "photo-viewer.commands.zoomIn.ariaLabel",
    icon: { name: "zoom_in", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: PHOTO_VIEWER_COMMAND_HANDLER_IDS.zoomIn,
    shortcut: shortcut("Mod+="),
    menuPlacement: [{ menuId: "view", groupId: "zoom", order: 20 }],
    toolbarPlacement: [{ toolbarId: "viewer", groupId: "zoom", order: 20 }],
    paletteKeywords: ["zoom", "in", "photo-viewer.commands.zoomIn.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "photo-viewer.commands.disabled.noImage" },
  },
  {
    commandId: PHOTO_VIEWER_COMMAND_IDS.fitToWindow,
    titleKey: "photo-viewer.commands.fitToWindow.title",
    descriptionKey: "photo-viewer.commands.fitToWindow.description",
    ariaLabelKey: "photo-viewer.commands.fitToWindow.ariaLabel",
    icon: { name: "fit_screen", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: PHOTO_VIEWER_COMMAND_HANDLER_IDS.fitToWindow,
    shortcut: shortcut("Mod+0"),
    menuPlacement: [{ menuId: "view", groupId: "zoom", order: 30 }],
    toolbarPlacement: [{ toolbarId: "viewer", groupId: "zoom", order: 30 }],
    paletteKeywords: ["fit", "window", "photo-viewer.commands.fitToWindow.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "photo-viewer.commands.disabled.noImage" },
  },
  {
    commandId: PHOTO_VIEWER_COMMAND_IDS.actualSize,
    titleKey: "photo-viewer.commands.actualSize.title",
    descriptionKey: "photo-viewer.commands.actualSize.description",
    ariaLabelKey: "photo-viewer.commands.actualSize.ariaLabel",
    icon: { name: "fullscreen_exit", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: PHOTO_VIEWER_COMMAND_HANDLER_IDS.actualSize,
    shortcut: shortcut("Mod+1"),
    menuPlacement: [{ menuId: "view", groupId: "zoom", order: 40 }],
    toolbarPlacement: [{ toolbarId: "viewer", groupId: "zoom", order: 40 }],
    paletteKeywords: ["actual", "size", "photo-viewer.commands.actualSize.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "photo-viewer.commands.disabled.noImage" },
  },
];

export const photoViewerCommandViews = photoViewerCommandDefinitions as unknown as ChipsCommandView[];

export function createPhotoViewerDisplayCommandViews(commands: ChipsCommandView[]): ChipsCommandView[] {
  return commands.map((command) => {
    const { shortcut: _hiddenShortcut, ...displayCommand } = command;
    return displayCommand;
  });
}

export function createPhotoViewerCommandStates(
  runtime: PhotoViewerCommandRuntimeState,
): Record<PhotoViewerCommandId, CommandState> {
  const imageReady = runtime.hasImage && runtime.isImageLoaded;
  const noImageReason = imageReady ? undefined : "photo-viewer.commands.disabled.noImage";

  return {
    [PHOTO_VIEWER_COMMAND_IDS.openFile]: { enabled: true, visible: true },
    [PHOTO_VIEWER_COMMAND_IDS.saveImage]: {
      enabled: imageReady && !runtime.isSaving,
      visible: true,
      busy: runtime.isSaving,
      disabledReasonKey: runtime.isSaving ? "photo-viewer.commands.disabled.saving" : noImageReason,
    },
    [PHOTO_VIEWER_COMMAND_IDS.previousImage]: {
      enabled: runtime.canPreviousImage,
      visible: true,
      disabledReasonKey: runtime.canPreviousImage ? undefined : "photo-viewer.commands.disabled.noPreviousImage",
    },
    [PHOTO_VIEWER_COMMAND_IDS.nextImage]: {
      enabled: runtime.canNextImage,
      visible: true,
      disabledReasonKey: runtime.canNextImage ? undefined : "photo-viewer.commands.disabled.noNextImage",
    },
    [PHOTO_VIEWER_COMMAND_IDS.zoomOut]: {
      enabled: imageReady,
      visible: true,
      disabledReasonKey: noImageReason,
    },
    [PHOTO_VIEWER_COMMAND_IDS.zoomIn]: {
      enabled: imageReady,
      visible: true,
      disabledReasonKey: noImageReason,
    },
    [PHOTO_VIEWER_COMMAND_IDS.fitToWindow]: {
      enabled: imageReady,
      visible: true,
      disabledReasonKey: noImageReason,
    },
    [PHOTO_VIEWER_COMMAND_IDS.actualSize]: {
      enabled: imageReady,
      visible: true,
      disabledReasonKey: noImageReason,
    },
  };
}

export function applyPhotoViewerCommandState(
  commands: ChipsCommandView[],
  stateMap: Record<PhotoViewerCommandId, CommandState>,
): ChipsCommandView[] {
  return commands.map((command) => {
    const state = stateMap[command.commandId as PhotoViewerCommandId];
    if (!state) {
      return command;
    }

    return {
      ...command,
      state: {
        ...command.state,
        ...state,
      },
      diagnostic: {
        ...command.diagnostic,
        visible: state.visible ?? command.diagnostic?.visible ?? true,
        enabled: state.enabled ?? command.diagnostic?.enabled ?? true,
        checked: state.checked ?? command.diagnostic?.checked ?? false,
      },
      disabledReasonKey: state.disabledReasonKey,
      hiddenReasonKey: state.hiddenReasonKey,
    };
  });
}

export function isPhotoViewerCommandInvokedEvent(event: CommandInvokedEvent): boolean {
  if (!COMMAND_ID_SET.has(event.commandId)) {
    return false;
  }

  return event.ownerPluginId === undefined || event.ownerPluginId === appConfig.appId;
}

export function getPhotoViewerCommandHandlerId(
  event: CommandInvokedEvent,
): PhotoViewerCommandHandlerId | null {
  const handlerId = event.handlerId;
  if (typeof handlerId === "string" && HANDLER_ID_SET.has(handlerId)) {
    return handlerId as PhotoViewerCommandHandlerId;
  }
  return null;
}

export function createPhotoViewerCommandStatus(
  event: CommandInvokedEvent,
  handlerId: PhotoViewerCommandHandlerId,
): PhotoViewerCommandStatus {
  return {
    commandId: event.commandId as PhotoViewerCommandId,
    handlerId,
    source: event.source ?? "api",
    invocationId: event.invocationId,
    payload: event.payload,
    context: event.context,
  };
}

export function updateRegisteredPhotoViewerCommandStates(
  client: {
    command: {
      setState(
        commandId: string,
        state: CommandState,
        options?: CommandSetStateOptions,
      ): Promise<unknown>;
    };
  },
  stateMap: Record<PhotoViewerCommandId, CommandState>,
  context: CommandInvocationContext,
): Promise<unknown[]> {
  return Promise.all(
    Object.entries(stateMap).map(([commandId, state]) =>
      client.command.setState(commandId, state, { context }),
    ),
  );
}
