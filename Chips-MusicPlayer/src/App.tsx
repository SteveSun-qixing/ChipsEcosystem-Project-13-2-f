import React, { startTransition, useEffect, useRef, useState } from "react";
import { ChipsThemeProvider } from "@chips/component-library";
import type { ThemeState } from "chips-sdk";
import { MusicPlayerStage } from "./components/MusicPlayerStage";
import { parseEmbeddedAudioMetadata } from "./utils/audio-metadata";
import { normalizeBinaryContent } from "./utils/binary";
import { createEmptyLyricsDocument, decodeTextWithFallback, parseLyricsText, type LyricsDocument } from "./utils/lyrics";
import { formatMessage, resolveLocale } from "./i18n/messages";
import { useChipsBridge } from "./hooks/useChipsBridge";
import { useChipsClient } from "./hooks/useChipsClient";
import { resolveLaunchAudioTarget } from "./utils/launch-resource";
import {
  inferAudioMimeType,
  isDirectPlayableUri,
  isLikelyLocalPath,
  isSupportedAudioResource,
  resolveAudioFormatLabel,
  resolveDirectoryPath,
  resolveFileName,
  resolveFileSelection,
  resolveStem,
  resolveTrackTitle,
  SUPPORTED_AUDIO_EXTENSION_LABEL,
  type AudioSource,
  type FileSelectionBundle,
  type LaunchAudioTarget,
  type TrackPresentation,
  type ViewerFeedback,
} from "./utils/music-player";
import { createLogger } from "../config/logging";

interface ThemeSnapshot {
  themeId: string;
  version: string;
}

type HostKind = "desktop" | "web" | "mobile" | "headless";

const DEFAULT_THEME_STATE: ThemeSnapshot = {
  themeId: "chips-official.default-theme",
  version: "1.0.0",
};

const DEFAULT_ARTWORK_URI = new URL("../assets/artwork/default-cover.svg", import.meta.url).href;

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

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallbackMessage;
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

function unwrapFileReadContent(value: unknown): string | Uint8Array | ArrayBuffer {
  if (value && typeof value === "object" && "content" in value) {
    const content = (value as { content?: unknown }).content;
    if (content instanceof Uint8Array || content instanceof ArrayBuffer || typeof content === "string") {
      return content;
    }
  }

  if (value instanceof Uint8Array || value instanceof ArrayBuffer || typeof value === "string") {
    return value;
  }

  throw new Error("文件读取结果不是可解析的二进制内容。");
}

function resolveLocalAudioPath(target: LaunchAudioTarget): string | undefined {
  const directFilePath = target.filePath?.trim();
  if (directFilePath) {
    return directFilePath;
  }

  const sourceId = target.sourceId.trim();
  if (!sourceId) {
    return undefined;
  }

  if (sourceId.startsWith("file://")) {
    try {
      return decodeURIComponent(new URL(sourceId).pathname);
    } catch {
      return undefined;
    }
  }

  return isLikelyLocalPath(sourceId) && !isDirectPlayableUri(sourceId) ? sourceId : undefined;
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
  const [track, setTrack] = useState<TrackPresentation | null>(null);
  const [feedback, setFeedback] = useState<ViewerFeedback | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hostKind, setHostKind] = useState<HostKind>("desktop");
  const revocableArtworkUrlRef = useRef<string | null>(null);

  function t(key: string, params?: Record<string, string | number>): string {
    return formatMessage(locale, key, params);
  }

  function swapRevocableArtwork(nextUrl?: string): void {
    if (revocableArtworkUrlRef.current && revocableArtworkUrlRef.current !== nextUrl) {
      URL.revokeObjectURL(revocableArtworkUrlRef.current);
    }

    revocableArtworkUrlRef.current = nextUrl ?? null;
  }

  async function resolvePlayableUri(target: LaunchAudioTarget): Promise<string> {
    const preferredSourceId = target.filePath ?? target.sourceId;
    if (isDirectPlayableUri(preferredSourceId)) {
      return preferredSourceId;
    }

    const resolved = await client.resource.resolve(preferredSourceId);
    return resolved.uri;
  }

  async function discoverCompanionFiles(audioPath: string, selection: FileSelectionBundle): Promise<FileSelectionBundle> {
    if (selection.coverPath && selection.lyricsPath) {
      return selection;
    }

    const directory = resolveDirectoryPath(audioPath);
    if (!directory) {
      return selection;
    }

    const entries = await client.file.list(directory);
    const fileMap = new Map(
      entries
        .filter((entry) => entry.isFile)
        .map((entry) => [resolveFileName(entry.path).toLowerCase(), entry.path]),
    );

    const stem = resolveStem(audioPath).toLowerCase();
    const coverCandidates = [
      `${stem}.jpg`,
      `${stem}.jpeg`,
      `${stem}.png`,
      `${stem}.webp`,
      `${stem}.avif`,
      "cover.jpg",
      "cover.jpeg",
      "cover.png",
      "cover.webp",
      "cover.avif",
      "folder.jpg",
      "folder.jpeg",
      "folder.png",
      "front.jpg",
      "front.jpeg",
      "front.png",
    ];
    const lyricsCandidates = [`${stem}.lrc`, "lyrics.lrc", `${stem}.txt`];

    return {
      ...selection,
      coverPath: selection.coverPath ?? coverCandidates.map((candidate) => fileMap.get(candidate)).find(Boolean),
      lyricsPath: selection.lyricsPath ?? lyricsCandidates.map((candidate) => fileMap.get(candidate)).find(Boolean),
    };
  }

  async function loadLyricsDocument(lyricsPath: string | undefined, embeddedMetadata: ReturnType<typeof parseEmbeddedAudioMetadata>): Promise<LyricsDocument> {
    if (lyricsPath) {
      const fileContent = await client.file.read(lyricsPath, {
        encoding: "binary",
      });
      return parseLyricsText(decodeTextWithFallback(normalizeBinaryContent(unwrapFileReadContent(fileContent))), "companion");
    }

    if (embeddedMetadata.timedLyricsText) {
      return parseLyricsText(embeddedMetadata.timedLyricsText, "embedded");
    }

    if (embeddedMetadata.lyricsText) {
      return parseLyricsText(embeddedMetadata.lyricsText, "embedded");
    }

    return createEmptyLyricsDocument();
  }

  async function resolveCompanionArtworkUri(coverPath: string | undefined): Promise<{ uri: string; kind: TrackPresentation["artworkKind"] }> {
    if (!coverPath) {
      return {
        uri: DEFAULT_ARTWORK_URI,
        kind: "default",
      };
    }

    const resolved = await client.resource.resolve(coverPath);
    return {
      uri: resolved.uri,
      kind: "companion",
    };
  }

  async function openAudioTarget(target: LaunchAudioTarget, explicitSelection: FileSelectionBundle = {}): Promise<void> {
    if (!target.sourceId.trim()) {
      setFeedback({
        tone: "error",
        message: t("music-player.errors.missingPath"),
      });
      return;
    }

    if (!isSupportedAudioResource(target)) {
      setFeedback({
        tone: "error",
        message: t("music-player.errors.unsupportedFile", {
          extensions: SUPPORTED_AUDIO_EXTENSION_LABEL,
        }),
      });
      logger.warn("用户尝试打开不受支持的音频格式", target);
      return;
    }

    setIsResolving(true);
    setFeedback(null);

    try {
      const resourceUri = await resolvePlayableUri(target);
      const localAudioPath = resolveLocalAudioPath(target);
      const normalizedFileName = target.fileName?.trim() || resolveFileName(localAudioPath ?? target.sourceId);
      let resolvedTitle = resolveTrackTitle(target);
      let artist = "";
      let album = "";
      let lyrics = createEmptyLyricsDocument();
      let artworkUri = DEFAULT_ARTWORK_URI;
      let artworkKind: TrackPresentation["artworkKind"] = "default";
      let nextRevocableArtworkUrl: string | undefined;

      if (localAudioPath) {
        const [binaryResult, companionResult] = await Promise.allSettled([
          client.resource.readBinary(localAudioPath),
          discoverCompanionFiles(localAudioPath, explicitSelection),
        ]);

        const embeddedMetadata =
          binaryResult.status === "fulfilled"
            ? parseEmbeddedAudioMetadata({
                bytes: binaryResult.value,
                fileName: normalizedFileName,
                mimeType: target.mimeType ?? inferAudioMimeType(normalizedFileName),
              })
            : {};

        const companionSelection = companionResult.status === "fulfilled" ? companionResult.value : explicitSelection;

        resolvedTitle = target.title?.trim() || embeddedMetadata.title?.trim() || resolvedTitle;
        artist = embeddedMetadata.artist?.trim() || "";
        album = embeddedMetadata.album?.trim() || "";

        try {
          lyrics = await loadLyricsDocument(companionSelection.lyricsPath, embeddedMetadata);
          resolvedTitle = target.title?.trim() || embeddedMetadata.title?.trim() || lyrics.metadata.title?.trim() || resolvedTitle;
          artist = embeddedMetadata.artist?.trim() || lyrics.metadata.artist?.trim() || artist;
          album = embeddedMetadata.album?.trim() || lyrics.metadata.album?.trim() || album;
        } catch (error) {
          logger.warn("读取歌词失败，继续使用空歌词视图", {
            localAudioPath,
            error,
          });
          lyrics = createEmptyLyricsDocument();
        }

        try {
          const companionArtwork = await resolveCompanionArtworkUri(companionSelection.coverPath);
          artworkUri = companionArtwork.uri;
          artworkKind = companionArtwork.kind;
        } catch (error) {
          logger.warn("读取伴生封面失败，继续回退默认封面", {
            localAudioPath,
            error,
          });
        }

        if (embeddedMetadata.artwork) {
          nextRevocableArtworkUrl = URL.createObjectURL(
            new Blob([embeddedMetadata.artwork.bytes], {
              type: embeddedMetadata.artwork.mimeType || "image/jpeg",
            }),
          );
          artworkUri = nextRevocableArtworkUrl;
          artworkKind = "embedded";
        }
      }

      const source: AudioSource = {
        sourceId: target.sourceId.trim(),
        filePath: localAudioPath,
        fileName: normalizedFileName,
        title: resolvedTitle,
        resourceUri,
        mimeType: target.mimeType?.trim() || inferAudioMimeType(normalizedFileName),
        extension: resolveAudioFormatLabel(normalizedFileName, target.mimeType).toLowerCase() || undefined,
        revision: Date.now(),
        isRemote: !localAudioPath,
      };

      const nextTrack: TrackPresentation = {
        source,
        artist,
        album,
        artworkUri,
        artworkKind,
        lyrics,
      };

      swapRevocableArtwork(nextRevocableArtworkUrl);

      startTransition(() => {
        setTrack(nextTrack);
      });

      logger.info("音频资源已准备完成", {
        sourceId: source.sourceId,
        filePath: source.filePath,
        mimeType: source.mimeType,
        format: source.extension,
        lyricsMode: lyrics.mode,
      });
    } catch (error) {
      logger.error("打开音频失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("music-player.errors.openFailed")),
      });
    } finally {
      setIsResolving(false);
    }
  }

  async function openSelection(paths: string[]): Promise<void> {
    const selection = resolveFileSelection(paths);
    if (!selection.audioPath) {
      setFeedback({
        tone: "error",
        message: t("music-player.errors.missingAudioInSelection"),
      });
      return;
    }

    await openAudioTarget(
      {
        sourceId: selection.audioPath,
        filePath: selection.audioPath,
        fileName: resolveFileName(selection.audioPath),
        mimeType: inferAudioMimeType(selection.audioPath),
      },
      selection,
    );
  }

  async function handleOpenFiles(): Promise<void> {
    try {
      const selected = await client.platform.openFile({
        title: t("music-player.dialogs.openFileTitle"),
        mode: "file",
        allowMultiple: true,
        mustExist: true,
      });
      const paths = Array.isArray(selected) ? selected.filter(Boolean) : [];
      if (paths.length > 0) {
        await openSelection(paths);
      }
    } catch (error) {
      logger.error("调用系统文件选择器失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("music-player.errors.openFailed")),
      });
    }
  }

  async function handleSaveAudio(): Promise<void> {
    if (!track) {
      setFeedback({
        tone: "error",
        message: t("music-player.errors.missingPath"),
      });
      return;
    }

    const shouldDownloadDirectly = hostKind === "web" || !track.source.filePath;

    if (shouldDownloadDirectly) {
      const link = document.createElement("a");
      link.href = track.source.resourceUri;
      link.download = track.source.fileName || "audio";
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedback({
        tone: "info",
        message: t("music-player.status.downloadFallback"),
      });
      return;
    }

    try {
      const destinationPath = await client.platform.saveFile({
        title: t("music-player.dialogs.saveFileTitle"),
        defaultPath: track.source.filePath,
      });

      if (!destinationPath) {
        return;
      }

      if (destinationPath === track.source.filePath) {
        setFeedback({
          tone: "info",
          message: t("music-player.status.samePath"),
        });
        return;
      }

      setIsSaving(true);
      await client.file.copy(track.source.filePath, destinationPath);
      logger.info("音频副本已保存", {
        sourcePath: track.source.filePath,
        destinationPath,
      });
      setFeedback({
        tone: "success",
        message: t("music-player.status.saveSuccess", {
          path: destinationPath,
        }),
      });
    } catch (error) {
      logger.error("保存音频失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("music-player.errors.saveFailed")),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function resolveDroppedFilePath(file: File): string {
    const bridgePath = client.platform.getPathForFile(file);
    if (bridgePath) {
      return bridgePath;
    }

    return (file as File & { path?: string }).path ?? "";
  }

  async function handleDropFiles(files: File[]): Promise<void> {
    const paths = files.map(resolveDroppedFilePath).filter((path) => path.trim().length > 0);
    if (paths.length === 0) {
      setFeedback({
        tone: "error",
        message: t("music-player.errors.openFailed"),
      });
      return;
    }

    await openSelection(paths);
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([client.theme.getCurrent(), client.i18n.getCurrent(), client.platform.getInfo()])
      .then(([currentTheme, currentLocale, platformInfo]) => {
        if (cancelled) {
          return;
        }

        const theme = currentTheme as ThemeState;
        setThemeState({
          themeId: theme.themeId,
          version: theme.version,
        });
        setLocale(resolveLocale(currentLocale));
        setHostKind(platformInfo.hostKind as HostKind);
      })
      .catch((error) => {
        logger.warn("初始化主题或语言失败，继续使用文档快照", error);
      });

    return () => {
      cancelled = true;
    };
  }, [client, logger]);

  useEffect(() => {
    const launchContext = client.platform.getLaunchContext();
    const launchTarget = resolveLaunchAudioTarget(launchContext);
    if (!launchTarget) {
      return;
    }

    logger.info("检测到启动参数里的音频目标", {
      sourceId: launchTarget.sourceId,
      trigger: launchContext.launchParams.trigger,
    });
    void openAudioTarget(launchTarget);
  }, [client, logger]);

  useEffect(() => {
    if (typeof bridge.on !== "function") {
      return;
    }

    const unsubscribe = bridge.on("language.changed", (payload: unknown) => {
      const nextLocale = resolveLanguagePayload(payload);
      if (nextLocale) {
        setLocale(resolveLocale(nextLocale));
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [bridge]);

  useEffect(() => {
    if (!feedback || feedback.tone === "error") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback((current) => (current === feedback ? null : current));
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  useEffect(() => {
    return () => {
      swapRevocableArtwork();
    };
  }, []);

  return (
    <ChipsThemeProvider
      themeId={themeState.themeId}
      version={themeState.version}
      eventSource={bridge}
      eventName="theme.changed"
    >
      <MusicPlayerStage
        track={track}
        isResolving={isResolving}
        isSaving={isSaving}
        feedback={feedback}
        onOpenFiles={handleOpenFiles}
        onSaveAudio={handleSaveAudio}
        onDropFiles={handleDropFiles}
        t={t}
      />
    </ChipsThemeProvider>
  );
}
