import React, { useEffect, useRef, useState } from "react";
import type { CardEditorErrorPayload, CardEditorResourceBridge } from "chips-sdk";
import { ChipsThemeProvider } from "@chips/component-library";
import { appConfig } from "../config/app-config";
import { createLogger } from "../config/logging";
import { AppMenu, type AppMenuAction, type AppMenuSection } from "./components/AppMenu";
import { EditorFrame } from "./components/EditorFrame";
import { InfoDialog, type InfoDialogSection } from "./components/InfoDialog";
import { useChipsBridge } from "./hooks/useChipsBridge";
import { useChipsClient } from "./hooks/useChipsClient";
import { formatMessage, resolveLocale } from "./i18n/messages";
import { createEmptyRichTextCardDocument, type RichTextCompositeCardDocument } from "./lib/card-document";
import {
  cleanupRuntimeSession,
  openRichTextCompositeCard,
  saveRichTextCompositeCard,
  type PendingResourceImport,
} from "./lib/card-persistence";
import { pathExists } from "./lib/file-client";
import { generateId62 } from "./lib/id";
import { resolveLaunchCardPath } from "./lib/launch-target";
import {
  basename,
  ensureCardExtension,
  joinPath,
  sanitizeFileStem,
  stripCardExtension,
  toFileUrl,
  type SessionRuntimePaths,
} from "./lib/path";
import { collectRichTextResourcePaths, type RichTextBaseCardConfig } from "./lib/richtext-card";

interface ThemeSnapshot {
  themeId: string;
  version: string;
}

interface NoticeState {
  tone: "info" | "success" | "error";
  message: string;
}

interface EditorDocumentSession {
  sessionId: string;
  editorKey: string;
  filePath: string | null;
  runtimePaths: SessionRuntimePaths | null;
  document: RichTextCompositeCardDocument;
  editorInitialConfig: RichTextBaseCardConfig;
  pendingImports: Record<string, PendingResourceImport>;
  pendingDeletions: string[];
  dirty: boolean;
  revision: number;
  lastSavedAt: string | null;
}

const DEFAULT_THEME_STATE: ThemeSnapshot = {
  themeId: "chips-official.default-theme",
  version: "1.0.0",
};

function readDocumentThemeState(): ThemeSnapshot {
  if (typeof document === "undefined") {
    return DEFAULT_THEME_STATE;
  }

  const root = document.documentElement;
  const themeId = root.getAttribute("data-chips-theme-id");
  const version = root.getAttribute("data-chips-theme-version");

  return {
    themeId: typeof themeId === "string" && themeId.trim().length > 0 ? themeId : DEFAULT_THEME_STATE.themeId,
    version: typeof version === "string" && version.trim().length > 0 ? version : DEFAULT_THEME_STATE.version,
  };
}

function resolveThemePayload(payload: unknown): ThemeSnapshot | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const themeId = "themeId" in payload && typeof (payload as { themeId?: unknown }).themeId === "string"
    ? (payload as { themeId: string }).themeId
    : null;
  const version = "version" in payload && typeof (payload as { version?: unknown }).version === "string"
    ? (payload as { version: string }).version
    : null;

  if (!themeId || !version) {
    return null;
  }

  return {
    themeId,
    version,
  };
}

function resolveLanguagePayload(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object" && "locale" in payload) {
    const locale = (payload as { locale?: unknown }).locale;
    if (typeof locale === "string" && locale.trim().length > 0) {
      return locale;
    }
  }

  return null;
}

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallbackMessage;
}

function isCardFilePath(filePath: string): boolean {
  return filePath.trim().toLowerCase().endsWith(".card");
}

function resolveDocumentTitle(title: string, fallbackTitle: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : fallbackTitle;
}

function resolveDocumentTitleForSave(
  snapshot: EditorDocumentSession,
  targetFilePath: string,
  defaultDraftTitle: string,
  fallbackTitle: string,
): string {
  const currentTitle = snapshot.document.title.trim();
  const fileDerivedTitle = stripCardExtension(basename(targetFilePath)).trim();

  if (
    currentTitle.length === 0
    || currentTitle === fallbackTitle
    || (!snapshot.filePath && currentTitle === defaultDraftTitle)
  ) {
    return resolveDocumentTitle(fileDerivedTitle, fallbackTitle);
  }

  return currentTitle;
}

function formatTimestamp(value: string | null | undefined, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(resolveLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return value;
  }
}

function guessMimeType(resourcePath: string, fallbackMimeType?: string): string {
  if (fallbackMimeType && fallbackMimeType.trim().length > 0) {
    return fallbackMimeType;
  }

  if (resourcePath.toLowerCase().endsWith(".md")) {
    return "text/markdown";
  }

  return "application/octet-stream";
}

function createObjectUrl(resource: PendingResourceImport): string {
  const bytes = new Uint8Array(resource.data);
  return URL.createObjectURL(
    new Blob([bytes], {
      type: guessMimeType(resource.path, resource.mimeType),
    }),
  );
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }

  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function samePendingImport(left: PendingResourceImport | undefined, right: PendingResourceImport | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  return left.path === right.path
    && left.mimeType === right.mimeType
    && sameBytes(left.data, right.data);
}

function sanitizeResourceFileName(input: string): string {
  const fileName = basename(input).trim();
  const dotIndex = fileName.lastIndexOf(".");
  const stem = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex > 0 ? fileName.slice(dotIndex) : ".md";
  const safeStem = sanitizeFileStem(stem).replace(/\s+/g, "-");
  return `${safeStem || `richtext-${generateId62(6)}`}${extension}`;
}

function createDraftSession(initialTitle: string, locale: string): EditorDocumentSession {
  const sessionId = generateId62(12);
  const document = createEmptyRichTextCardDocument(generateId62(12), generateId62(12), initialTitle);
  document.config.locale = locale;

  return {
    sessionId,
    editorKey: `${sessionId}:${document.baseCardId}`,
    filePath: null,
    runtimePaths: null,
    document,
    editorInitialConfig: document.config,
    pendingImports: {},
    pendingDeletions: [],
    dirty: false,
    revision: 0,
    lastSavedAt: null,
  };
}

function createOpenedSession(
  sessionId: string,
  targetFilePath: string,
  runtimePaths: SessionRuntimePaths,
  document: RichTextCompositeCardDocument,
): EditorDocumentSession {
  return {
    sessionId,
    editorKey: `${sessionId}:${document.baseCardId}`,
    filePath: targetFilePath,
    runtimePaths,
    document,
    editorInitialConfig: document.config,
    pendingImports: {},
    pendingDeletions: [],
    dirty: false,
    revision: 0,
    lastSavedAt: document.modifiedAt,
  };
}

export function App(): React.ReactElement {
  const bridge = useChipsBridge();
  const { client, traceId } = useChipsClient();
  const [logger] = useState(() =>
    createLogger({
      scope: "app",
      traceId,
    }),
  );
  const [themeState, setThemeState] = useState<ThemeSnapshot>(() => readDocumentThemeState());
  const [locale, setLocale] = useState(() =>
    resolveLocale(typeof document !== "undefined" ? document.documentElement.lang : undefined),
  );
  const [session, setSession] = useState<EditorDocumentSession>(() =>
    createDraftSession(
      formatMessage(
        resolveLocale(typeof document !== "undefined" ? document.documentElement.lang : undefined),
        "app.initialDraftTitle",
      ),
      resolveLocale(typeof document !== "undefined" ? document.documentElement.lang : undefined),
    ),
  );
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [editorState, setEditorState] = useState<"loading" | "ready" | "error">("loading");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef(session);
  const localeRef = useRef(locale);
  const saveStateRef = useRef(saveState);
  const saveTaskRef = useRef<Promise<string | null> | null>(null);
  const lastFailedAutosaveRevisionRef = useRef<number | null>(null);
  const launchHandledRef = useRef(false);
  const resolvedBlobUrlsRef = useRef(new Map<string, string>());

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  function t(key: string, params?: Record<string, string | number>): string {
    return formatMessage(locale, key, params);
  }

  function currentMessage(key: string, params?: Record<string, string | number>): string {
    return formatMessage(localeRef.current, key, params);
  }

  function releaseResourceUrl(resourcePath: string): void {
    const url = resolvedBlobUrlsRef.current.get(resourcePath);
    if (!url) {
      return;
    }

    URL.revokeObjectURL(url);
    resolvedBlobUrlsRef.current.delete(resourcePath);
  }

  function releaseAllResourceUrls(): void {
    resolvedBlobUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    resolvedBlobUrlsRef.current.clear();
  }

  function createLocalizedDraftSession(): EditorDocumentSession {
    return createDraftSession(currentMessage("app.initialDraftTitle"), localeRef.current);
  }

  async function pickAvailableResourcePath(preferredPath?: string): Promise<string> {
    const current = sessionRef.current;
    const initialCandidate = sanitizeResourceFileName(preferredPath ?? `richtext-${generateId62(8)}.md`);
    const referencedPaths = new Set(collectRichTextResourcePaths(current.document.config));

    if (referencedPaths.has(initialCandidate)) {
      return initialCandidate;
    }

    const dotIndex = initialCandidate.lastIndexOf(".");
    const stem = dotIndex > 0 ? initialCandidate.slice(0, dotIndex) : initialCandidate;
    const extension = dotIndex > 0 ? initialCandidate.slice(dotIndex) : ".md";

    let candidate = initialCandidate;
    let counter = 1;

    while (true) {
      const hasPendingImport = candidate in current.pendingImports;
      const isPendingDeletion = current.pendingDeletions.includes(candidate);
      const existsOnDisk = current.runtimePaths && !isPendingDeletion
        ? await pathExists(client, joinPath(current.runtimePaths.workDir, candidate))
        : false;

      if (!hasPendingImport && !existsOnDisk) {
        return candidate;
      }

      counter += 1;
      candidate = `${stem}-${counter}${extension}`;
    }
  }

  const [resourceBridge] = useState<CardEditorResourceBridge>(() => ({
    async resolveResourceUrl(resourcePath) {
      const normalizedPath = resourcePath.replace(/\\/g, "/").trim();
      if (!normalizedPath) {
        throw new Error(currentMessage("app.resourceUnavailable"));
      }

      const current = sessionRef.current;
      if (normalizedPath in current.pendingImports) {
        const existingUrl = resolvedBlobUrlsRef.current.get(normalizedPath);
        if (existingUrl) {
          return existingUrl;
        }

        const url = createObjectUrl(current.pendingImports[normalizedPath]);
        resolvedBlobUrlsRef.current.set(normalizedPath, url);
        return url;
      }

      if (current.pendingDeletions.includes(normalizedPath)) {
        throw new Error(currentMessage("app.resourceUnavailable"));
      }

      if (current.runtimePaths) {
        const diskPath = joinPath(current.runtimePaths.workDir, normalizedPath);
        if (await pathExists(client, diskPath)) {
          return toFileUrl(diskPath);
        }
      }

      throw new Error(currentMessage("app.resourceUnavailable"));
    },
    releaseResourceUrl(resourcePath) {
      releaseResourceUrl(resourcePath.replace(/\\/g, "/").trim());
    },
    async importResource(input) {
      const nextPath = await pickAvailableResourcePath(input.preferredPath ?? input.file.name);
      const data = new Uint8Array(await input.file.arrayBuffer());

      releaseResourceUrl(nextPath);
      if (saveStateRef.current === "error") {
        setSaveState("idle");
      }
      setNotice(null);
      setSession((current) => ({
        ...current,
        document: {
          ...current.document,
          modifiedAt: new Date().toISOString(),
        },
        pendingImports: {
          ...current.pendingImports,
          [nextPath]: {
            path: nextPath,
            data,
            mimeType: input.file.type || undefined,
          },
        },
        pendingDeletions: current.pendingDeletions.filter((path) => path !== nextPath),
        dirty: true,
        revision: current.revision + 1,
      }));

      return {
        path: nextPath,
      };
    },
    async deleteResource(resourcePath) {
      const normalizedPath = resourcePath.replace(/\\/g, "/").trim();
      if (!normalizedPath) {
        return;
      }

      releaseResourceUrl(normalizedPath);
      const current = sessionRef.current;
      const existsOnDisk = current.runtimePaths
        ? await pathExists(client, joinPath(current.runtimePaths.workDir, normalizedPath))
        : false;

      if (saveStateRef.current === "error") {
        setSaveState("idle");
      }
      setNotice(null);
      setSession((live) => {
        const { [normalizedPath]: removedImport, ...remainingImports } = live.pendingImports;
        const shouldTrackDeletion = !removedImport && existsOnDisk && !live.pendingDeletions.includes(normalizedPath);

        if (!removedImport && !shouldTrackDeletion) {
          return live;
        }

        return {
          ...live,
          document: {
            ...live.document,
            modifiedAt: new Date().toISOString(),
          },
          pendingImports: remainingImports,
          pendingDeletions: shouldTrackDeletion
            ? [...live.pendingDeletions, normalizedPath]
            : live.pendingDeletions.filter((path) => path !== normalizedPath),
          dirty: true,
          revision: live.revision + 1,
        };
      });
    },
  }));

  function switchSession(nextSession: EditorDocumentSession, nextNotice: NoticeState | null): void {
    releaseAllResourceUrls();
    lastFailedAutosaveRevisionRef.current = null;
    setSaveState("idle");
    setEditorState("loading");
    setIsMenuOpen(false);
    setIsInfoOpen(false);
    setNotice(nextNotice);
    setSession(nextSession);
  }

  async function confirmDiscardIfNeeded(): Promise<boolean> {
    const current = sessionRef.current;
    if (!current.dirty) {
      return true;
    }

    try {
      return await client.platform.showConfirm({
        title: currentMessage("app.discardPromptTitle"),
        message: currentMessage("app.discardPromptMessage"),
      });
    } catch (error) {
      logger.error("请求放弃修改确认框失败", error);
      return false;
    }
  }

  async function openDocumentByPath(
    targetFilePath: string,
    options?: { recoveredFromLaunch?: boolean; skipDiscardCheck?: boolean },
  ): Promise<void> {
    const normalizedPath = targetFilePath.trim();
    if (!isCardFilePath(normalizedPath)) {
      setNotice({
        tone: "error",
        message: currentMessage("app.unsupportedPath"),
      });
      return;
    }

    if (!options?.skipDiscardCheck) {
      const confirmed = await confirmDiscardIfNeeded();
      if (!confirmed) {
        return;
      }
    }

    const previousRuntimePaths = sessionRef.current.runtimePaths;
    const nextSessionId = generateId62(12);

    setIsLoadingDocument(true);
    try {
      const opened = await openRichTextCompositeCard(client, normalizedPath, nextSessionId);
      const nextSession = createOpenedSession(nextSessionId, normalizedPath, opened.runtimePaths, opened.document);

      switchSession(
        nextSession,
        options?.recoveredFromLaunch
          ? {
              tone: "info",
              message: currentMessage("app.launchOpenRecovered"),
            }
          : null,
      );

      logger.info("已打开富文本复合卡片", {
        filePath: normalizedPath,
        cardId: opened.document.cardId,
        baseCardId: opened.document.baseCardId,
      });

      if (previousRuntimePaths && previousRuntimePaths.runtimeDir !== opened.runtimePaths.runtimeDir) {
        void cleanupRuntimeSession(client, previousRuntimePaths).catch(() => undefined);
      }
    } catch (error) {
      logger.error("打开富文本复合卡片失败", error);
      setNotice({
        tone: "error",
        message: resolveErrorMessage(error, currentMessage("app.openFailed")),
      });
    } finally {
      setIsLoadingDocument(false);
    }
  }

  async function handleOpenFile(): Promise<void> {
    const confirmed = await confirmDiscardIfNeeded();
    if (!confirmed) {
      return;
    }

    try {
      const selected = await client.platform.openFile({
        title: currentMessage("app.dialogOpenTitle"),
        mode: "file",
        allowMultiple: false,
        mustExist: true,
      });

      const filePath = Array.isArray(selected) ? selected[0] : null;
      if (!filePath) {
        return;
      }

      await openDocumentByPath(filePath, {
        skipDiscardCheck: true,
      });
    } catch (error) {
      logger.error("调用文件选择器失败", error);
      setNotice({
        tone: "error",
        message: resolveErrorMessage(error, currentMessage("app.openFailed")),
      });
    }
  }

  async function handleNewDocument(): Promise<void> {
    const confirmed = await confirmDiscardIfNeeded();
    if (!confirmed) {
      return;
    }

    const previousRuntimePaths = sessionRef.current.runtimePaths;
    switchSession(
      createLocalizedDraftSession(),
      {
        tone: "info",
        message: currentMessage("app.newDocumentReady"),
      },
    );

    if (previousRuntimePaths) {
      void cleanupRuntimeSession(client, previousRuntimePaths).catch(() => undefined);
    }
  }

  function resolveDefaultSavePath(current: EditorDocumentSession): string {
    if (current.filePath) {
      return current.filePath;
    }

    const title = resolveDocumentTitle(current.document.title, currentMessage("app.documentUntitled"));
    return ensureCardExtension(sanitizeFileStem(title));
  }

  async function saveCurrentSession(mode: "save" | "save-as" | "autosave"): Promise<string | null> {
    if (saveTaskRef.current) {
      return saveTaskRef.current;
    }

    const task = (async () => {
      const snapshot = sessionRef.current;

      try {
        let targetFilePath = snapshot.filePath;

        if (mode === "save-as" || !targetFilePath) {
          const selectedPath = await client.platform.saveFile({
            title: currentMessage("app.dialogSaveTitle"),
            defaultPath: resolveDefaultSavePath(snapshot),
          });

          if (!selectedPath) {
            if (mode !== "autosave") {
              setNotice({
                tone: "info",
                message: currentMessage("app.saveCancelled"),
              });
            }
            return null;
          }

          targetFilePath = selectedPath;
        }

        if (!targetFilePath) {
          return null;
        }

        targetFilePath = ensureCardExtension(targetFilePath);
        const resolvedTitle = resolveDocumentTitleForSave(
          snapshot,
          targetFilePath,
          currentMessage("app.initialDraftTitle"),
          currentMessage("app.documentUntitled"),
        );

        setSaveState("saving");
        if (mode !== "autosave") {
          setNotice(null);
        }

        const saved = await saveRichTextCompositeCard(client, {
          targetFilePath,
          sessionId: snapshot.sessionId,
          document: {
            ...snapshot.document,
            title: resolvedTitle,
          },
          pendingImports: snapshot.pendingImports,
          sourceRuntimePaths: snapshot.runtimePaths,
        });

        releaseAllResourceUrls();
        lastFailedAutosaveRevisionRef.current = null;
        setSaveState("idle");
        setSession((current) => {
          if (current.sessionId !== snapshot.sessionId) {
            return current;
          }

          const changedDuringSave = current.revision !== snapshot.revision;
          const nextPendingImports = changedDuringSave
            ? Object.fromEntries(
                Object.entries(current.pendingImports).filter(([resourcePath, resource]) => {
                  const savedResource = snapshot.pendingImports[resourcePath];
                  return !samePendingImport(resource, savedResource);
                }),
              )
            : {};
          const nextPendingDeletions = changedDuringSave
            ? current.pendingDeletions.filter((resourcePath) => !snapshot.pendingDeletions.includes(resourcePath))
            : [];

          return {
            ...current,
            filePath: targetFilePath,
            runtimePaths: saved.runtimePaths,
            document: changedDuringSave
              ? {
                  ...current.document,
                  title: resolvedTitle,
                }
              : {
                  ...saved.document,
                  title: resolvedTitle,
                },
            pendingImports: nextPendingImports,
            pendingDeletions: nextPendingDeletions,
            dirty: changedDuringSave,
            lastSavedAt: saved.document.modifiedAt,
          };
        });

        if (snapshot.runtimePaths && snapshot.runtimePaths.runtimeDir !== saved.runtimePaths.runtimeDir) {
          void cleanupRuntimeSession(client, snapshot.runtimePaths).catch(() => undefined);
        }

        if (mode !== "autosave") {
          setNotice({
            tone: "success",
            message: currentMessage("app.saveSuccess", {
              path: targetFilePath,
            }),
          });
        }

        logger.info("富文本复合卡片已保存", {
          targetFilePath,
          cardId: snapshot.document.cardId,
          revision: snapshot.revision,
        });
        return targetFilePath;
      } catch (error) {
        const message = resolveErrorMessage(error, currentMessage("app.saveFailed"));
        logger.error("保存富文本复合卡片失败", error);
        setSaveState("error");
        if (mode === "autosave") {
          lastFailedAutosaveRevisionRef.current = snapshot.revision;
        }
        setNotice({
          tone: "error",
          message,
        });
        return null;
      }
    })();

    saveTaskRef.current = task;
    try {
      return await task;
    } finally {
      if (saveTaskRef.current === task) {
        saveTaskRef.current = null;
      }
    }
  }

  function handleEditorChange(nextConfig: RichTextBaseCardConfig): void {
    if (saveState === "error") {
      setSaveState("idle");
    }
    setNotice(null);
    setSession((current) => {
      if (JSON.stringify(current.document.config) === JSON.stringify(nextConfig)) {
        return current;
      }

      return {
        ...current,
        document: {
          ...current.document,
          config: nextConfig,
          modifiedAt: new Date().toISOString(),
        },
        dirty: true,
        revision: current.revision + 1,
      };
    });
  }

  function handleEditorError(payload: CardEditorErrorPayload): void {
    setEditorState("error");
    setNotice({
      tone: "error",
      message: payload.message || t("app.editorError"),
    });
  }

  async function handleMenuAction(action: AppMenuAction): Promise<void> {
    setIsMenuOpen(false);

    switch (action) {
      case "new":
        await handleNewDocument();
        return;
      case "open":
        await handleOpenFile();
        return;
      case "save":
        await saveCurrentSession("save");
        return;
      case "save-as":
        await saveCurrentSession("save-as");
        return;
      case "info":
        setIsInfoOpen(true);
        return;
    }
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([client.theme.getCurrent(), client.i18n.getCurrent()])
      .then(([currentTheme, currentLocale]) => {
        if (cancelled) {
          return;
        }

        setThemeState({
          themeId: currentTheme.themeId,
          version: currentTheme.version,
        });
        setLocale(resolveLocale(currentLocale));
      })
      .catch((error) => {
        logger.warn("读取主题或语言初始状态失败，继续使用文档注入值", error);
      });

    return () => {
      cancelled = true;
    };
  }, [client, logger]);

  useEffect(() => {
    const unsubscribeTheme = bridge.on("theme.changed", (payload: unknown) => {
      const nextTheme = resolveThemePayload(payload);
      if (nextTheme) {
        setThemeState(nextTheme);
        return;
      }

      void client.theme.getCurrent()
        .then((currentTheme) => {
          setThemeState({
            themeId: currentTheme.themeId,
            version: currentTheme.version,
          });
        })
        .catch(() => undefined);
    });

    const unsubscribeLanguage = bridge.on("language.changed", (payload: unknown) => {
      const nextLocale = resolveLanguagePayload(payload);
      if (nextLocale) {
        setLocale(resolveLocale(nextLocale));
      }
    });

    return () => {
      unsubscribeTheme();
      unsubscribeLanguage();
    };
  }, [bridge, client]);

  useEffect(() => {
    if (launchHandledRef.current) {
      return;
    }
    launchHandledRef.current = true;

    const launchContext = client.platform.getLaunchContext();
    const launchTargetPath = resolveLaunchCardPath(launchContext);
    if (!launchTargetPath) {
      return;
    }

    void openDocumentByPath(launchTargetPath, {
      recoveredFromLaunch: true,
      skipDiscardCheck: true,
    });
  }, [client]);

  useEffect(() => {
    if (!appConfig.featureFlags.enableAutosave) {
      return;
    }

    if (!session.filePath || !session.dirty || saveState === "saving" || isLoadingDocument) {
      return;
    }

    if (lastFailedAutosaveRevisionRef.current === session.revision) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void saveCurrentSession("autosave");
    }, 1200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isLoadingDocument, saveState, session.dirty, session.filePath, session.revision]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!sessionRef.current.dirty && saveState !== "saving") {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveState]);

  useEffect(() => {
    if (!notice || notice.tone === "error") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setNotice((current) => (current === notice ? null : current));
    }, 2200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [notice]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    return () => {
      releaseAllResourceUrls();
      void cleanupRuntimeSession(client, sessionRef.current.runtimePaths).catch(() => undefined);
    };
  }, [client]);

  const displayedFilePath = session.filePath ?? t("app.filePathEmpty");
  const isSaving = saveState === "saving";
  const fileActionsDisabled = isSaving || isLoadingDocument;
  const saveStatusLabel = isLoadingDocument
    ? t("app.statusOpening")
    : saveState === "saving"
      ? t("app.statusSaving")
      : saveState === "error"
        ? t("app.statusError")
        : !session.filePath || session.dirty
          ? t("app.statusUnsaved")
          : t("app.statusSaved");
  const editorStatusLabel = editorState === "ready"
    ? t("app.editorReady")
    : editorState === "error"
      ? t("app.editorError")
      : t("app.editorLoading");
  const autosaveStatusLabel = appConfig.featureFlags.enableAutosave && session.filePath
    ? session.dirty
      ? t("app.autosavePending")
      : t("app.autosaveReady")
    : t("app.autosaveUnavailable");
  const storageLabel = session.document.config.content_source === "file" ? t("app.storageFile") : t("app.storageInline");
  const runtimeNotice = notice ?? (
    isLoadingDocument
      ? { tone: "info" as const, message: t("app.statusOpening") }
      : isSaving
        ? { tone: "info" as const, message: t("app.statusSaving") }
        : null
  );

  const menuSections: AppMenuSection[] = [
    {
      id: "file",
      title: t("app.menuGroupFile"),
      items: [
        { action: "new", label: t("app.menuActionNew"), iconName: "note_add", disabled: fileActionsDisabled },
        { action: "open", label: t("app.menuActionOpen"), iconName: "folder_open", disabled: fileActionsDisabled },
        { action: "save", label: t("app.menuActionSave"), iconName: "save", disabled: fileActionsDisabled },
        { action: "save-as", label: t("app.menuActionSaveAs"), iconName: "save_as", disabled: fileActionsDisabled },
      ],
    },
    {
      id: "info",
      title: t("app.menuGroupInfo"),
      items: [
        { action: "info", label: t("app.menuActionInfo"), iconName: "info" },
      ],
    },
  ];

  const infoSections: InfoDialogSection[] = [
    {
      id: "card",
      title: t("app.infoSectionCard"),
      fields: [
        { label: t("app.infoFieldTitle"), value: session.document.title || t("app.infoUnknown") },
        { label: t("app.infoFieldPath"), value: <span className="rte-info-dialog__mono">{displayedFilePath}</span> },
        { label: t("app.infoFieldCardId"), value: <span className="rte-info-dialog__mono">{session.document.cardId}</span> },
        { label: t("app.infoFieldBaseCardId"), value: <span className="rte-info-dialog__mono">{session.document.baseCardId}</span> },
        {
          label: t("app.infoFieldCreatedAt"),
          value: formatTimestamp(session.document.createdAt, locale, t("app.infoUnknown")),
        },
        {
          label: t("app.infoFieldModifiedAt"),
          value: formatTimestamp(session.document.modifiedAt, locale, t("app.infoUnknown")),
        },
      ],
    },
    {
      id: "richtext",
      title: t("app.infoSectionRichText"),
      fields: [
        { label: t("app.infoFieldContentFormat"), value: session.document.config.content_format },
        { label: t("app.infoFieldContentSource"), value: storageLabel },
        {
          label: t("app.infoFieldContentFile"),
          value: session.document.config.content_file
            ? <span className="rte-info-dialog__mono">{session.document.config.content_file}</span>
            : t("app.infoNone"),
        },
        { label: t("app.infoFieldLocale"), value: session.document.config.locale ?? t("app.infoUnknown") },
        {
          label: t("app.infoFieldTheme"),
          value: session.document.config.theme?.trim() ? session.document.config.theme : t("app.infoFollowHostTheme"),
        },
        {
          label: t("app.infoFieldResourceCount"),
          value: String(collectRichTextResourcePaths(session.document.config).length + Object.keys(session.pendingImports).length),
        },
      ],
    },
    {
      id: "runtime",
      title: t("app.infoSectionRuntime"),
      fields: [
        { label: t("app.infoFieldSaveStatus"), value: saveStatusLabel },
        { label: t("app.infoFieldEditorStatus"), value: editorStatusLabel },
        { label: t("app.infoFieldAutosave"), value: autosaveStatusLabel },
        { label: t("app.infoFieldThemePack"), value: themeState.themeId },
        {
          label: t("app.infoFieldLastSavedAt"),
          value: formatTimestamp(session.lastSavedAt, locale, t("app.infoNotSavedYet")),
        },
      ],
    },
  ];

  return (
    <ChipsThemeProvider
      themeId={themeState.themeId}
      version={themeState.version}
      eventSource={bridge}
      eventName="theme.changed"
    >
      <div className="rte-app">
        <AppMenu
          ref={menuRef}
          open={isMenuOpen}
          buttonLabel={t("app.menuButtonLabel")}
          sections={menuSections}
          onToggle={() => {
            setIsMenuOpen((current) => !current);
          }}
          onAction={(action) => {
            void handleMenuAction(action);
          }}
        />

        <main className="rte-app__workspace">
          <section className="rte-app__editor-stage" aria-label={t("app.title")}>
            <EditorFrame
              key={session.editorKey}
              client={client}
              sessionKey={session.document.baseCardId}
              initialConfig={session.editorInitialConfig}
              resources={resourceBridge}
              loadingLabel={t("app.editorLoading")}
              errorLabel={t("app.editorError")}
              onReady={() => {
                setEditorState("ready");
              }}
              onChange={(nextConfig) => {
                handleEditorChange(nextConfig);
              }}
              onError={handleEditorError}
            />
          </section>
        </main>

        <InfoDialog
          open={isInfoOpen}
          title={t("app.infoDialogTitle")}
          description={t("app.infoDialogDescription")}
          closeLabel={t("app.infoClose")}
          sections={infoSections}
          onClose={() => {
            setIsInfoOpen(false);
          }}
        />

        {runtimeNotice ? (
          <div className={`rte-toast rte-toast--${runtimeNotice.tone}`}>
            {runtimeNotice.message}
          </div>
        ) : null}
      </div>
    </ChipsThemeProvider>
  );
}
