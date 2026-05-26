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
import type { ReaderPreferences } from "../utils/book-reader";

export type BookReaderOverlayPanel = "source" | "contents" | "preferences" | "search" | "bookmarks";

export const BOOK_READER_COMMAND_IDS = {
  openSourcePanel: `${appConfig.appId}.source.open-panel`,
  openFile: `${appConfig.appId}.source.open-file`,
  openUrl: `${appConfig.appId}.source.open-url`,
  toggleContents: `${appConfig.appId}.view.toggle-contents`,
  toggleSearch: `${appConfig.appId}.view.toggle-search`,
  toggleBookmarks: `${appConfig.appId}.view.toggle-bookmarks`,
  togglePreferences: `${appConfig.appId}.view.toggle-preferences`,
  closePanel: `${appConfig.appId}.view.close-panel`,
  previousPage: `${appConfig.appId}.reader.previous-page`,
  nextPage: `${appConfig.appId}.reader.next-page`,
  previousSection: `${appConfig.appId}.reader.previous-section`,
  nextSection: `${appConfig.appId}.reader.next-section`,
  goSectionStart: `${appConfig.appId}.reader.go-section-start`,
  goSectionEnd: `${appConfig.appId}.reader.go-section-end`,
  decreaseFont: `${appConfig.appId}.reader.decrease-font`,
  increaseFont: `${appConfig.appId}.reader.increase-font`,
  narrowContent: `${appConfig.appId}.reader.narrow-content`,
  widenContent: `${appConfig.appId}.reader.widen-content`,
  toggleBookmark: `${appConfig.appId}.bookmark.toggle`,
  readingModePaginated: `${appConfig.appId}.preferences.reading-mode.paginated`,
  readingModeScroll: `${appConfig.appId}.preferences.reading-mode.scroll`,
} as const;

export const BOOK_READER_COMMAND_HANDLER_IDS = {
  openSourcePanel: "book-reader:source.open-panel",
  openFile: "book-reader:source.open-file",
  openUrl: "book-reader:source.open-url",
  toggleContents: "book-reader:view.toggle-contents",
  toggleSearch: "book-reader:view.toggle-search",
  toggleBookmarks: "book-reader:view.toggle-bookmarks",
  togglePreferences: "book-reader:view.toggle-preferences",
  closePanel: "book-reader:view.close-panel",
  previousPage: "book-reader:reader.previous-page",
  nextPage: "book-reader:reader.next-page",
  previousSection: "book-reader:reader.previous-section",
  nextSection: "book-reader:reader.next-section",
  goSectionStart: "book-reader:reader.go-section-start",
  goSectionEnd: "book-reader:reader.go-section-end",
  decreaseFont: "book-reader:reader.decrease-font",
  increaseFont: "book-reader:reader.increase-font",
  narrowContent: "book-reader:reader.narrow-content",
  widenContent: "book-reader:reader.widen-content",
  toggleBookmark: "book-reader:bookmark.toggle",
  readingModePaginated: "book-reader:preferences.reading-mode.paginated",
  readingModeScroll: "book-reader:preferences.reading-mode.scroll",
} as const;

export type BookReaderCommandId =
  (typeof BOOK_READER_COMMAND_IDS)[keyof typeof BOOK_READER_COMMAND_IDS];
export type BookReaderCommandHandlerId =
  (typeof BOOK_READER_COMMAND_HANDLER_IDS)[keyof typeof BOOK_READER_COMMAND_HANDLER_IDS];
export type BookReaderCommandPhase = "idle" | "registering" | "ready" | "error";

export interface BookReaderCommandStatus {
  commandId: BookReaderCommandId;
  handlerId: BookReaderCommandHandlerId;
  source: CommandSource;
  invocationId?: string;
  payload?: Record<string, unknown>;
  context?: CommandInvocationContext;
}

export interface BookReaderCommandRuntimeState {
  hasBook: boolean;
  activePanel: BookReaderOverlayPanel | null;
  hasCurrentBookmark: boolean;
  readingMode: ReaderPreferences["readingMode"];
  isBusy: boolean;
  canPreviousSection: boolean;
  canNextSection: boolean;
}

const COMMAND_ID_SET = new Set<string>(Object.values(BOOK_READER_COMMAND_IDS));
const HANDLER_ID_SET = new Set<string>(Object.values(BOOK_READER_COMMAND_HANDLER_IDS));
const APP_SCOPE = { kind: "app", appId: appConfig.appId } as const;

function shortcut(accelerator: string) {
  return {
    accelerator,
    platform: "desktop" as const,
    preventDefault: true,
  };
}

function panelState(panel: BookReaderOverlayPanel, runtime: BookReaderCommandRuntimeState): CommandState {
  return {
    enabled: runtime.hasBook || panel === "source",
    visible: true,
    checked: runtime.activePanel === panel,
    disabledReasonKey: runtime.hasBook || panel === "source" ? undefined : "book-reader.commands.disabled.noBook",
  };
}

export const bookReaderCommandDefinitions: CommandDefinitionInput[] = [
  {
    commandId: BOOK_READER_COMMAND_IDS.openSourcePanel,
    titleKey: "book-reader.commands.openSourcePanel.title",
    descriptionKey: "book-reader.commands.openSourcePanel.description",
    ariaLabelKey: "book-reader.commands.openSourcePanel.ariaLabel",
    icon: { name: "folder_open", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.openSourcePanel,
    shortcut: shortcut("Mod+O"),
    menuPlacement: [{ menuId: "file", groupId: "open", order: 10 }],
    toolbarPlacement: [{ toolbarId: "reader", groupId: "source", order: 10 }],
    paletteKeywords: ["book", "open", "import", "book-reader.commands.openSourcePanel.title"],
    state: { enabled: true, visible: true },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.openFile,
    titleKey: "book-reader.commands.openFile.title",
    descriptionKey: "book-reader.commands.openFile.description",
    ariaLabelKey: "book-reader.commands.openFile.ariaLabel",
    icon: { name: "upload_file", style: "rounded" },
    scope: APP_SCOPE,
    permission: "file.read",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.openFile,
    menuPlacement: [{ menuId: "file", groupId: "open", order: 20 }],
    toolbarPlacement: [{ toolbarId: "source", groupId: "open", order: 10 }],
    paletteKeywords: ["file", "epub", "book-reader.commands.openFile.title"],
    state: { enabled: true, visible: true },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.openUrl,
    titleKey: "book-reader.commands.openUrl.title",
    descriptionKey: "book-reader.commands.openUrl.description",
    ariaLabelKey: "book-reader.commands.openUrl.ariaLabel",
    icon: { name: "link", style: "rounded" },
    scope: APP_SCOPE,
    permission: "network.request",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.openUrl,
    menuPlacement: [{ menuId: "file", groupId: "open", order: 30 }],
    toolbarPlacement: [{ toolbarId: "source", groupId: "open", order: 20 }],
    paletteKeywords: ["url", "remote", "book-reader.commands.openUrl.title"],
    state: { enabled: true, visible: true },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.toggleContents,
    titleKey: "book-reader.commands.toggleContents.title",
    descriptionKey: "book-reader.commands.toggleContents.description",
    ariaLabelKey: "book-reader.commands.toggleContents.ariaLabel",
    icon: { name: "menu_book", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.toggleContents,
    shortcut: shortcut("Mod+1"),
    menuPlacement: [{ menuId: "view", groupId: "panels", order: 10 }],
    toolbarPlacement: [{ toolbarId: "reader", groupId: "panels", order: 10 }],
    paletteKeywords: ["toc", "contents", "book-reader.commands.toggleContents.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.toggleSearch,
    titleKey: "book-reader.commands.toggleSearch.title",
    descriptionKey: "book-reader.commands.toggleSearch.description",
    ariaLabelKey: "book-reader.commands.toggleSearch.ariaLabel",
    icon: { name: "search", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.toggleSearch,
    shortcut: shortcut("Mod+F"),
    menuPlacement: [{ menuId: "edit", groupId: "search", order: 10 }],
    toolbarPlacement: [{ toolbarId: "reader", groupId: "panels", order: 20 }],
    paletteKeywords: ["search", "find", "book-reader.commands.toggleSearch.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.toggleBookmark,
    titleKey: "book-reader.commands.toggleBookmark.title",
    descriptionKey: "book-reader.commands.toggleBookmark.description",
    ariaLabelKey: "book-reader.commands.toggleBookmark.ariaLabel",
    icon: { name: "bookmark", style: "rounded" },
    scope: APP_SCOPE,
    permission: "config.write",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.toggleBookmark,
    shortcut: shortcut("Mod+D"),
    menuPlacement: [{ menuId: "bookmarks", groupId: "manage", order: 10 }],
    toolbarPlacement: [{ toolbarId: "reader", groupId: "bookmarks", order: 10 }],
    paletteKeywords: ["bookmark", "book-reader.commands.toggleBookmark.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.toggleBookmarks,
    titleKey: "book-reader.commands.toggleBookmarks.title",
    descriptionKey: "book-reader.commands.toggleBookmarks.description",
    ariaLabelKey: "book-reader.commands.toggleBookmarks.ariaLabel",
    icon: { name: "bookmarks", style: "rounded" },
    scope: APP_SCOPE,
    permission: "config.read",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.toggleBookmarks,
    shortcut: shortcut("Mod+B"),
    menuPlacement: [{ menuId: "bookmarks", groupId: "view", order: 20 }],
    toolbarPlacement: [{ toolbarId: "reader", groupId: "bookmarks", order: 20 }],
    paletteKeywords: ["bookmarks", "book-reader.commands.toggleBookmarks.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.togglePreferences,
    titleKey: "book-reader.commands.togglePreferences.title",
    descriptionKey: "book-reader.commands.togglePreferences.description",
    ariaLabelKey: "book-reader.commands.togglePreferences.ariaLabel",
    icon: { name: "tune", style: "rounded" },
    scope: APP_SCOPE,
    permission: "config.read",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.togglePreferences,
    shortcut: shortcut("Mod+,"),
    menuPlacement: [{ menuId: "view", groupId: "panels", order: 40 }],
    toolbarPlacement: [{ toolbarId: "reader", groupId: "panels", order: 40 }],
    paletteKeywords: ["preferences", "reading", "book-reader.commands.togglePreferences.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.closePanel,
    titleKey: "book-reader.commands.closePanel.title",
    descriptionKey: "book-reader.commands.closePanel.description",
    ariaLabelKey: "book-reader.commands.closePanel.ariaLabel",
    icon: { name: "close", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.closePanel,
    shortcut: shortcut("Escape"),
    menuPlacement: [{ menuId: "view", groupId: "panels", order: 90 }],
    paletteKeywords: ["close", "panel", "book-reader.commands.closePanel.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noPanel" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.previousPage,
    titleKey: "book-reader.commands.previousPage.title",
    descriptionKey: "book-reader.commands.previousPage.description",
    ariaLabelKey: "book-reader.commands.previousPage.ariaLabel",
    icon: { name: "chevron_left", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.previousPage,
    shortcut: [
      shortcut("ArrowLeft"),
      shortcut("ArrowUp"),
      shortcut("PageUp"),
      shortcut("Shift+Space"),
    ],
    menuPlacement: [{ menuId: "navigate", groupId: "page", order: 10 }],
    toolbarPlacement: [{ toolbarId: "reader-navigation", groupId: "page", order: 10 }],
    paletteKeywords: ["previous", "page", "book-reader.commands.previousPage.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.nextPage,
    titleKey: "book-reader.commands.nextPage.title",
    descriptionKey: "book-reader.commands.nextPage.description",
    ariaLabelKey: "book-reader.commands.nextPage.ariaLabel",
    icon: { name: "chevron_right", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.nextPage,
    shortcut: [
      shortcut("ArrowRight"),
      shortcut("ArrowDown"),
      shortcut("PageDown"),
      shortcut("Space"),
    ],
    menuPlacement: [{ menuId: "navigate", groupId: "page", order: 20 }],
    toolbarPlacement: [{ toolbarId: "reader-navigation", groupId: "page", order: 20 }],
    paletteKeywords: ["next", "page", "book-reader.commands.nextPage.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.previousSection,
    titleKey: "book-reader.commands.previousSection.title",
    descriptionKey: "book-reader.commands.previousSection.description",
    ariaLabelKey: "book-reader.commands.previousSection.ariaLabel",
    icon: { name: "skip_previous", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.previousSection,
    menuPlacement: [{ menuId: "navigate", groupId: "section", order: 10 }],
    toolbarPlacement: [{ toolbarId: "reader-navigation", groupId: "section", order: 10 }],
    paletteKeywords: ["previous", "section", "chapter", "book-reader.commands.previousSection.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noPreviousSection" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.nextSection,
    titleKey: "book-reader.commands.nextSection.title",
    descriptionKey: "book-reader.commands.nextSection.description",
    ariaLabelKey: "book-reader.commands.nextSection.ariaLabel",
    icon: { name: "skip_next", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.nextSection,
    menuPlacement: [{ menuId: "navigate", groupId: "section", order: 20 }],
    toolbarPlacement: [{ toolbarId: "reader-navigation", groupId: "section", order: 20 }],
    paletteKeywords: ["next", "section", "chapter", "book-reader.commands.nextSection.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noNextSection" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.goSectionStart,
    titleKey: "book-reader.commands.goSectionStart.title",
    descriptionKey: "book-reader.commands.goSectionStart.description",
    ariaLabelKey: "book-reader.commands.goSectionStart.ariaLabel",
    icon: { name: "first_page", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.goSectionStart,
    shortcut: shortcut("Home"),
    menuPlacement: [{ menuId: "navigate", groupId: "section", order: 30 }],
    paletteKeywords: ["start", "section", "book-reader.commands.goSectionStart.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.goSectionEnd,
    titleKey: "book-reader.commands.goSectionEnd.title",
    descriptionKey: "book-reader.commands.goSectionEnd.description",
    ariaLabelKey: "book-reader.commands.goSectionEnd.ariaLabel",
    icon: { name: "last_page", style: "rounded" },
    scope: APP_SCOPE,
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.goSectionEnd,
    shortcut: shortcut("End"),
    menuPlacement: [{ menuId: "navigate", groupId: "section", order: 40 }],
    paletteKeywords: ["end", "section", "book-reader.commands.goSectionEnd.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.decreaseFont,
    titleKey: "book-reader.commands.decreaseFont.title",
    descriptionKey: "book-reader.commands.decreaseFont.description",
    ariaLabelKey: "book-reader.commands.decreaseFont.ariaLabel",
    icon: { name: "text_decrease", style: "rounded" },
    scope: APP_SCOPE,
    permission: "config.write",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.decreaseFont,
    shortcut: shortcut("["),
    menuPlacement: [{ menuId: "view", groupId: "typography", order: 10 }],
    toolbarPlacement: [{ toolbarId: "preferences", groupId: "typography", order: 10 }],
    paletteKeywords: ["font", "smaller", "book-reader.commands.decreaseFont.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.increaseFont,
    titleKey: "book-reader.commands.increaseFont.title",
    descriptionKey: "book-reader.commands.increaseFont.description",
    ariaLabelKey: "book-reader.commands.increaseFont.ariaLabel",
    icon: { name: "text_increase", style: "rounded" },
    scope: APP_SCOPE,
    permission: "config.write",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.increaseFont,
    shortcut: shortcut("]"),
    menuPlacement: [{ menuId: "view", groupId: "typography", order: 20 }],
    toolbarPlacement: [{ toolbarId: "preferences", groupId: "typography", order: 20 }],
    paletteKeywords: ["font", "larger", "book-reader.commands.increaseFont.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.narrowContent,
    titleKey: "book-reader.commands.narrowContent.title",
    descriptionKey: "book-reader.commands.narrowContent.description",
    ariaLabelKey: "book-reader.commands.narrowContent.ariaLabel",
    icon: { name: "width_normal", style: "rounded" },
    scope: APP_SCOPE,
    permission: "config.write",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.narrowContent,
    shortcut: shortcut("-"),
    menuPlacement: [{ menuId: "view", groupId: "layout", order: 10 }],
    toolbarPlacement: [{ toolbarId: "preferences", groupId: "layout", order: 10 }],
    paletteKeywords: ["width", "narrow", "book-reader.commands.narrowContent.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.widenContent,
    titleKey: "book-reader.commands.widenContent.title",
    descriptionKey: "book-reader.commands.widenContent.description",
    ariaLabelKey: "book-reader.commands.widenContent.ariaLabel",
    icon: { name: "width_wide", style: "rounded" },
    scope: APP_SCOPE,
    permission: "config.write",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.widenContent,
    shortcut: shortcut("="),
    menuPlacement: [{ menuId: "view", groupId: "layout", order: 20 }],
    toolbarPlacement: [{ toolbarId: "preferences", groupId: "layout", order: 20 }],
    paletteKeywords: ["width", "wide", "book-reader.commands.widenContent.title"],
    state: { enabled: false, visible: true, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.readingModePaginated,
    titleKey: "book-reader.commands.readingModePaginated.title",
    descriptionKey: "book-reader.commands.readingModePaginated.description",
    ariaLabelKey: "book-reader.commands.readingModePaginated.ariaLabel",
    icon: { name: "view_column", style: "rounded" },
    scope: APP_SCOPE,
    permission: "config.write",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.readingModePaginated,
    menuPlacement: [{ menuId: "view", groupId: "reading-mode", order: 10 }],
    toolbarPlacement: [{ toolbarId: "preferences", groupId: "reading-mode", order: 10 }],
    paletteKeywords: ["page", "mode", "book-reader.commands.readingModePaginated.title"],
    state: { enabled: false, visible: true, checked: false, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
  {
    commandId: BOOK_READER_COMMAND_IDS.readingModeScroll,
    titleKey: "book-reader.commands.readingModeScroll.title",
    descriptionKey: "book-reader.commands.readingModeScroll.description",
    ariaLabelKey: "book-reader.commands.readingModeScroll.ariaLabel",
    icon: { name: "vertical_align_center", style: "rounded" },
    scope: APP_SCOPE,
    permission: "config.write",
    handlerId: BOOK_READER_COMMAND_HANDLER_IDS.readingModeScroll,
    menuPlacement: [{ menuId: "view", groupId: "reading-mode", order: 20 }],
    toolbarPlacement: [{ toolbarId: "preferences", groupId: "reading-mode", order: 20 }],
    paletteKeywords: ["scroll", "mode", "book-reader.commands.readingModeScroll.title"],
    state: { enabled: false, visible: true, checked: false, disabledReasonKey: "book-reader.commands.disabled.noBook" },
  },
];

export function isBookReaderCommandId(commandId: string): commandId is BookReaderCommandId {
  return COMMAND_ID_SET.has(commandId);
}

export function isBookReaderCommandHandlerId(handlerId: unknown): handlerId is BookReaderCommandHandlerId {
  return typeof handlerId === "string" && HANDLER_ID_SET.has(handlerId);
}

export function resolveBookReaderCommandHandlerId(commandId: string): BookReaderCommandHandlerId | null {
  const definition = bookReaderCommandDefinitions.find((item) => item.commandId === commandId);
  return isBookReaderCommandHandlerId(definition?.handlerId) ? definition.handlerId : null;
}

export function createBookReaderCommandStatus(event: CommandInvokedEvent): BookReaderCommandStatus | null {
  const handlerId = isBookReaderCommandHandlerId(event.handlerId)
    ? event.handlerId
    : resolveBookReaderCommandHandlerId(event.commandId);

  if (!handlerId || !isBookReaderCommandId(event.commandId)) {
    return null;
  }

  return {
    commandId: event.commandId,
    handlerId,
    source: event.source ?? "api",
    invocationId: event.invocationId,
    payload: event.payload,
    context: event.context,
  };
}

export function createBookReaderCommandStatusFromCommandId(
  commandId: BookReaderCommandId,
  source: CommandSource,
  payload?: Record<string, unknown>,
  context?: CommandInvocationContext,
): BookReaderCommandStatus {
  const handlerId = resolveBookReaderCommandHandlerId(commandId);
  if (!handlerId) {
    throw new Error(`Unknown book reader command: ${commandId}`);
  }

  return {
    commandId,
    handlerId,
    source,
    payload,
    context,
  };
}

export function resolveBookReaderCommandState(
  definition: CommandDefinitionInput,
  runtime: BookReaderCommandRuntimeState,
): CommandState {
  const baseState = {
    visible: definition.state?.visible ?? true,
    enabled: definition.state?.enabled ?? true,
    checked: definition.state?.checked,
    busy: definition.state?.busy,
    disabledReasonKey: definition.state?.disabledReasonKey,
  } satisfies CommandState;

  if (
    definition.commandId === BOOK_READER_COMMAND_IDS.openSourcePanel ||
    definition.commandId === BOOK_READER_COMMAND_IDS.openFile ||
    definition.commandId === BOOK_READER_COMMAND_IDS.openUrl
  ) {
    return {
      ...baseState,
      enabled: !runtime.isBusy,
      busy: runtime.isBusy,
      disabledReasonKey: runtime.isBusy ? "book-reader.commands.disabled.busy" : undefined,
    };
  }

  if (definition.commandId === BOOK_READER_COMMAND_IDS.closePanel) {
    return {
      ...baseState,
      enabled: runtime.activePanel !== null,
      disabledReasonKey: runtime.activePanel !== null ? undefined : "book-reader.commands.disabled.noPanel",
    };
  }

  if (definition.commandId === BOOK_READER_COMMAND_IDS.toggleContents) {
    return panelState("contents", runtime);
  }
  if (definition.commandId === BOOK_READER_COMMAND_IDS.toggleSearch) {
    return panelState("search", runtime);
  }
  if (definition.commandId === BOOK_READER_COMMAND_IDS.toggleBookmarks) {
    return panelState("bookmarks", runtime);
  }
  if (definition.commandId === BOOK_READER_COMMAND_IDS.togglePreferences) {
    return panelState("preferences", runtime);
  }

  if (
    definition.commandId === BOOK_READER_COMMAND_IDS.previousPage ||
    definition.commandId === BOOK_READER_COMMAND_IDS.nextPage ||
    definition.commandId === BOOK_READER_COMMAND_IDS.goSectionStart ||
    definition.commandId === BOOK_READER_COMMAND_IDS.goSectionEnd ||
    definition.commandId === BOOK_READER_COMMAND_IDS.decreaseFont ||
    definition.commandId === BOOK_READER_COMMAND_IDS.increaseFont ||
    definition.commandId === BOOK_READER_COMMAND_IDS.narrowContent ||
    definition.commandId === BOOK_READER_COMMAND_IDS.widenContent
  ) {
    return {
      ...baseState,
      enabled: runtime.hasBook,
      disabledReasonKey: runtime.hasBook ? undefined : "book-reader.commands.disabled.noBook",
    };
  }

  if (definition.commandId === BOOK_READER_COMMAND_IDS.previousSection) {
    return {
      ...baseState,
      enabled: runtime.hasBook && runtime.canPreviousSection,
      disabledReasonKey:
        runtime.hasBook && runtime.canPreviousSection
          ? undefined
          : "book-reader.commands.disabled.noPreviousSection",
    };
  }

  if (definition.commandId === BOOK_READER_COMMAND_IDS.nextSection) {
    return {
      ...baseState,
      enabled: runtime.hasBook && runtime.canNextSection,
      disabledReasonKey:
        runtime.hasBook && runtime.canNextSection
          ? undefined
          : "book-reader.commands.disabled.noNextSection",
    };
  }

  if (definition.commandId === BOOK_READER_COMMAND_IDS.toggleBookmark) {
    return {
      ...baseState,
      enabled: runtime.hasBook,
      checked: runtime.hasCurrentBookmark,
      disabledReasonKey: runtime.hasBook ? undefined : "book-reader.commands.disabled.noBook",
    };
  }

  if (definition.commandId === BOOK_READER_COMMAND_IDS.readingModePaginated) {
    return {
      ...baseState,
      enabled: runtime.hasBook,
      checked: runtime.readingMode === "paginated",
      disabledReasonKey: runtime.hasBook ? undefined : "book-reader.commands.disabled.noBook",
    };
  }

  if (definition.commandId === BOOK_READER_COMMAND_IDS.readingModeScroll) {
    return {
      ...baseState,
      enabled: runtime.hasBook,
      checked: runtime.readingMode === "scroll",
      disabledReasonKey: runtime.hasBook ? undefined : "book-reader.commands.disabled.noBook",
    };
  }

  return baseState;
}

export function createBookReaderCommandViews(runtime: BookReaderCommandRuntimeState): ChipsCommandView[] {
  return bookReaderCommandDefinitions.map((definition) => {
    const state = resolveBookReaderCommandState(definition, runtime);
    const icon =
      definition.commandId === BOOK_READER_COMMAND_IDS.toggleBookmark && runtime.hasCurrentBookmark
        ? { name: "bookmark", style: "rounded" as const }
        : definition.commandId === BOOK_READER_COMMAND_IDS.toggleBookmark
          ? { name: "bookmark_border", style: "rounded" as const }
          : definition.icon;

    return {
      ...definition,
      icon,
      state,
      diagnostic: {
        visible: state.visible !== false,
        enabled: state.enabled !== false,
        checked: state.checked === true,
        disabledReasonKey: state.disabledReasonKey,
        hiddenReasonKey: state.hiddenReasonKey,
      },
    } as ChipsCommandView;
  });
}

export function createBookReaderCommandInvocationContext(params: {
  pluginId?: string;
  sceneId?: string;
  surfaceId?: string | null;
  documentId?: string;
  componentId?: string;
}): CommandInvocationContext {
  const context: CommandInvocationContext = {};

  if (params.pluginId) {
    context.pluginId = params.pluginId;
  }
  if (params.sceneId) {
    context.sceneId = params.sceneId;
  }
  if (params.surfaceId) {
    context.surfaceId = params.surfaceId;
  }
  if (params.documentId) {
    context.documentId = params.documentId;
  }
  if (params.componentId) {
    context.componentId = params.componentId;
  }

  return context;
}

export function createBookReaderCommandSetStateOptions(
  context: CommandInvocationContext,
): CommandSetStateOptions {
  return { context };
}

export function toBookReaderCommandErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return code;
    }
  }

  return "BOOK_READER_COMMAND_RUNTIME_ERROR";
}
