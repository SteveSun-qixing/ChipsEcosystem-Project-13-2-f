import React, { useEffect, useRef, useState } from "react";
import { ChipsIcon } from "@chips/component-library";
import type { CommandSource, IconDescriptor } from "chips-sdk";
import {
  VIDEO_PLAYER_COMMAND_IDS,
  type VideoPlayerCommandId,
} from "../commands/video-player-commands";
import type { VideoPlayerController } from "../hooks/useVideoPlayerController";
import {
  PLAYBACK_RATES,
  formatDuration,
  formatPlaybackRate,
  formatResolution,
  resolveVideoFormatLabel,
  shouldAutoHideChrome,
  type VideoSource,
  type VideoTrackOption,
  type ViewerFeedback,
} from "../utils/video-player";

interface VideoPlayerStageProps {
  videoSource: VideoSource | null;
  controller: VideoPlayerController;
  isResolving: boolean;
  isSaving: boolean;
  feedback: ViewerFeedback | null;
  isMorePanelOpen: boolean;
  onMorePanelOpenChange: (open: boolean) => void;
  onInvokeCommand: (commandId: VideoPlayerCommandId, source: CommandSource) => void | Promise<void>;
  onDropFile: (file: File | null) => void | Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

type MorePanelTab = "info" | "subtitles" | "audio";
const TOOLBAR_AUTO_HIDE_DELAY_MS = 2200;
const OPEN_ICON = { name: "folder_open", style: "rounded", decorative: true } satisfies IconDescriptor;
const PLAY_ICON = { name: "play_arrow", style: "rounded", fill: 1, decorative: true } satisfies IconDescriptor;
const PAUSE_ICON = { name: "pause", style: "rounded", fill: 1, decorative: true } satisfies IconDescriptor;
const BACKWARD_ICON = { name: "fast_rewind", style: "rounded", decorative: true } satisfies IconDescriptor;
const FORWARD_ICON = { name: "fast_forward", style: "rounded", decorative: true } satisfies IconDescriptor;
const MUTED_ICON = { name: "volume_off", style: "rounded", decorative: true } satisfies IconDescriptor;
const VOLUME_ICON = { name: "volume_up", style: "rounded", decorative: true } satisfies IconDescriptor;
const SAVE_ICON = { name: "save", style: "rounded", decorative: true } satisfies IconDescriptor;
const PICTURE_IN_PICTURE_ICON = {
  name: "picture_in_picture_alt",
  style: "rounded",
  decorative: true,
} satisfies IconDescriptor;
const FULLSCREEN_ICON = { name: "fullscreen", style: "rounded", decorative: true } satisfies IconDescriptor;
const MORE_ICON = { name: "more_horiz", style: "rounded", decorative: true } satisfies IconDescriptor;
const FILE_HINT_ICON = { name: "video_file", style: "rounded", decorative: true } satisfies IconDescriptor;

function IconButton(props: {
  label: string;
  icon: IconDescriptor;
  active?: boolean;
  disabled?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
  onClick: () => void | Promise<void>;
}) {
  const { label, icon, active, disabled, buttonRef, onClick } = props;

  return (
    <button
      ref={buttonRef}
      className={`video-player-icon-button${active ? " video-player-icon-button--active" : ""}`}
      type="button"
      aria-label={label}
      data-tooltip={label}
      onClick={() => void onClick()}
      disabled={disabled}
    >
      <span className="video-player-icon-button__icon" aria-hidden="true">
        <ChipsIcon descriptor={icon} />
      </span>
    </button>
  );
}

function resolveTrackLabel(
  track: VideoTrackOption,
  fallbackKey: string,
  fallbackWithLanguageKey: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (track.label) {
    return track.label;
  }

  if (track.language) {
    return t(fallbackWithLanguageKey, {
      index: track.index + 1,
      language: track.language,
    });
  }

  return t(fallbackKey, {
    index: track.index + 1,
  });
}

export function VideoPlayerStage(props: VideoPlayerStageProps): React.ReactElement {
  const {
    videoSource,
    controller,
    isResolving,
    isSaving,
    feedback,
    isMorePanelOpen,
    onMorePanelOpenChange,
    onInvokeCommand,
    onDropFile,
    t,
  } = props;
  const [isDragActive, setIsDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<MorePanelTab>("info");
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const dragDepthRef = useRef(0);
  const morePanelRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const hideChromeTimerRef = useRef<number | null>(null);
  const overlayMessage = controller.errorKey
    ? t(`video-player.errors.${controller.errorKey}`)
    : isResolving
      ? t("video-player.viewer.resolving")
      : videoSource && !controller.isReady
        ? t("video-player.viewer.loading")
        : controller.isBuffering
          ? t("video-player.viewer.loading")
          : null;

  const isSubtitleOff = controller.subtitleTracks.length > 0 && controller.subtitleTracks.every((track) => !track.selected);
  const sourceType = videoSource
    ? videoSource.isRemote
      ? t("video-player.app.remoteBadge")
      : t("video-player.app.localBadge")
    : t("video-player.labels.unknown");
  const sourceDisplay = videoSource?.filePath ?? videoSource?.sourceId ?? t("video-player.labels.unknown");
  const activePanelId = `video-player-panel-${activeTab}`;
  const formatDisplay = videoSource
    ? resolveVideoFormatLabel(videoSource.fileName || videoSource.filePath || videoSource.sourceId, videoSource.mimeType) ||
      t("video-player.labels.unknown")
    : t("video-player.labels.unknown");
  const shouldHideToolbar = shouldAutoHideChrome({
    hasVideo: Boolean(videoSource),
    isPlaying: controller.isPlaying,
    isMorePanelOpen,
    isDragActive,
    hasOverlay: Boolean(overlayMessage),
  });

  useEffect(() => {
    if (!isMorePanelOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (morePanelRef.current?.contains(target) || moreButtonRef.current?.contains(target))) {
        return;
      }

      onMorePanelOpenChange(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMorePanelOpen, onMorePanelOpenChange]);

  function invokeCommand(commandId: VideoPlayerCommandId, source: CommandSource = "toolbar"): void {
    void onInvokeCommand(commandId, source);
  }

  useEffect(() => {
    if (!videoSource) {
      setActiveTab("info");
    }
  }, [videoSource]);

  useEffect(() => {
    return () => {
      if (hideChromeTimerRef.current !== null) {
        window.clearTimeout(hideChromeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hideChromeTimerRef.current !== null) {
      window.clearTimeout(hideChromeTimerRef.current);
      hideChromeTimerRef.current = null;
    }

    if (!shouldHideToolbar) {
      setIsChromeVisible(true);
      return;
    }

    hideChromeTimerRef.current = window.setTimeout(() => {
      setIsChromeVisible(false);
      hideChromeTimerRef.current = null;
    }, TOOLBAR_AUTO_HIDE_DELAY_MS);
  }, [shouldHideToolbar]);

  function revealChrome(): void {
    setIsChromeVisible(true);

    if (hideChromeTimerRef.current !== null) {
      window.clearTimeout(hideChromeTimerRef.current);
      hideChromeTimerRef.current = null;
    }

    if (!shouldHideToolbar) {
      return;
    }

    hideChromeTimerRef.current = window.setTimeout(() => {
      setIsChromeVisible(false);
      hideChromeTimerRef.current = null;
    }, TOOLBAR_AUTO_HIDE_DELAY_MS);
  }

  function scheduleChromeHide(delayMs: number): void {
    if (!shouldHideToolbar) {
      return;
    }

    if (hideChromeTimerRef.current !== null) {
      window.clearTimeout(hideChromeTimerRef.current);
    }

    hideChromeTimerRef.current = window.setTimeout(() => {
      setIsChromeVisible(false);
      hideChromeTimerRef.current = null;
    }, delayMs);
  }

  function renderMorePanelBody(): React.ReactNode {
    if (activeTab === "info") {
      return (
        <div className="video-player-side-panel__body">
          <div className="video-player-info-grid">
            <div className="video-player-info-grid__item">
              <span>{t("video-player.more.info.title")}</span>
              <strong>{videoSource?.title ?? t("video-player.more.empty.noVideoInfo")}</strong>
            </div>
            <div className="video-player-info-grid__item">
              <span>{t("video-player.more.info.sourceType")}</span>
              <strong>{sourceType}</strong>
            </div>
            <div className="video-player-info-grid__item">
              <span>{t("video-player.more.info.format")}</span>
              <strong>{formatDisplay}</strong>
            </div>
            <div className="video-player-info-grid__item">
              <span>{t("video-player.more.info.duration")}</span>
              <strong>
                {controller.duration > 0 ? formatDuration(controller.duration) : t("video-player.viewer.durationUnknown")}
              </strong>
            </div>
            <div className="video-player-info-grid__item">
              <span>{t("video-player.more.info.position")}</span>
              <strong>{formatDuration(controller.currentTime)}</strong>
            </div>
            <div className="video-player-info-grid__item">
              <span>{t("video-player.more.info.resolution")}</span>
              <strong>{formatResolution(controller.videoSize) || t("video-player.viewer.resolutionUnknown")}</strong>
            </div>
            <div className="video-player-info-grid__item video-player-info-grid__item--full">
              <span>{t("video-player.more.info.source")}</span>
              <strong title={sourceDisplay}>{sourceDisplay}</strong>
            </div>
          </div>

          <div className="video-player-side-panel__section">
            <div className="video-player-side-panel__section-title">{t("video-player.more.info.playbackSpeed")}</div>
            <div className="video-player-chip-group">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  className={`video-player-chip-button${controller.playbackRate === rate ? " video-player-chip-button--active" : ""}`}
                  type="button"
                  onClick={() => {
                    controller.setPlaybackRate(rate);
                  }}
                >
                  {formatPlaybackRate(rate)}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "subtitles") {
      if (controller.subtitleTracks.length === 0) {
        return <div className="video-player-side-panel__empty">{t("video-player.more.empty.noSubtitles")}</div>;
      }

      return (
        <div className="video-player-side-panel__list">
          <button
            className={`video-player-side-option${isSubtitleOff ? " video-player-side-option--active" : ""}`}
            type="button"
            onClick={() => {
              controller.selectSubtitleTrack(null);
            }}
          >
            <span>{t("video-player.more.subtitlesOff")}</span>
          </button>

          {controller.subtitleTracks.map((track) => (
            <button
              key={`subtitle-${track.index}`}
              className={`video-player-side-option${track.selected ? " video-player-side-option--active" : ""}`}
              type="button"
              onClick={() => {
                controller.selectSubtitleTrack(track.index);
              }}
            >
              <span>
                {resolveTrackLabel(
                  track,
                  "video-player.more.subtitlesFallback",
                  "video-player.more.subtitlesFallbackWithLanguage",
                  t,
                )}
              </span>
              {track.language ? <small>{track.language}</small> : null}
            </button>
          ))}
        </div>
      );
    }

    if (controller.audioTracks.length === 0) {
      return <div className="video-player-side-panel__empty">{t("video-player.more.empty.noAudioTracks")}</div>;
    }

    return (
      <div className="video-player-side-panel__list">
        {controller.audioTracks.map((track) => (
          <button
            key={`audio-${track.index}`}
            className={`video-player-side-option${track.selected ? " video-player-side-option--active" : ""}`}
            type="button"
            onClick={() => {
              controller.selectAudioTrack(track.index);
            }}
          >
            <span>
              {resolveTrackLabel(
                track,
                "video-player.more.audioFallback",
                "video-player.more.audioFallbackWithLanguage",
                t,
              )}
            </span>
            {track.language ? <small>{track.language}</small> : null}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="video-player-shell">
      <main
        ref={controller.surfaceRef}
        className={`video-player-stage${isDragActive ? " video-player-stage--drag-active" : ""}`}
        tabIndex={0}
        role="region"
        aria-label={t("video-player.labels.stage")}
        aria-describedby={feedback ? "video-player-feedback" : undefined}
        onPointerMove={() => {
          revealChrome();
        }}
        onPointerDown={() => {
          revealChrome();
        }}
        onPointerLeave={() => {
          scheduleChromeHide(280);
        }}
        onFocus={() => {
          revealChrome();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && isMorePanelOpen) {
            event.preventDefault();
            onMorePanelOpenChange(false);
            return;
          }

          revealChrome();
          controller.handleKeyDown(event);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepthRef.current += 1;
          setIsDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) {
            setIsDragActive(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepthRef.current = 0;
          setIsDragActive(false);
          void onDropFile(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <div className="video-player-viewport">
          {videoSource ? (
            <video
              key={`${videoSource.resourceUri}-${videoSource.revision}`}
              ref={controller.videoRef}
              className="video-player-media"
              src={videoSource.resourceUri}
              title={videoSource.title}
              aria-label={videoSource.title}
              preload="metadata"
              playsInline
              onClick={() => {
                void controller.togglePlayback();
              }}
              onDoubleClick={() => {
                void controller.toggleFullscreen();
              }}
              onLoadedMetadata={controller.handleLoadedMetadata}
              onCanPlay={controller.handleCanPlay}
              onPlaying={controller.handlePlaying}
              onPause={controller.handlePause}
              onWaiting={controller.handleWaiting}
              onEnded={controller.handleEnded}
              onTimeUpdate={controller.handleTimeUpdate}
              onDurationChange={controller.handleDurationChange}
              onProgress={controller.handleProgress}
              onVolumeChange={controller.handleVolumeChange}
              onError={controller.handleError}
            />
          ) : (
            <button
              className="video-player-empty"
              type="button"
              onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.openFile)}
            >
              <span className="video-player-empty__icon" aria-hidden="true">
                <ChipsIcon descriptor={FILE_HINT_ICON} />
              </span>
              <span className="video-player-empty__text">
                {isDragActive ? t("video-player.viewer.dragPromptLine") : t("video-player.viewer.emptyLine")}
              </span>
            </button>
          )}

          {overlayMessage ? (
            <div className="video-player-overlay" role={controller.errorKey ? "alert" : "status"} aria-live="polite">
              <div className={`video-player-overlay__card${controller.errorKey ? " video-player-overlay__card--error" : ""}`}>
                {overlayMessage}
              </div>
            </div>
          ) : null}
        </div>

        {feedback ? (
          <div
            id="video-player-feedback"
            className={`video-player-feedback video-player-feedback--${feedback.tone}`}
            role={feedback.tone === "error" ? "alert" : "status"}
            aria-live="polite"
            aria-label={t("video-player.labels.feedback")}
          >
            {feedback.message}
          </div>
        ) : null}

        {isMorePanelOpen ? (
          <aside
            ref={morePanelRef}
            className="video-player-side-panel"
            id={activePanelId}
            aria-label={t("video-player.actions.more")}
            role="tabpanel"
            aria-labelledby={`video-player-tab-${activeTab}`}
            onPointerMove={() => {
              revealChrome();
            }}
            onPointerLeave={() => {
              scheduleChromeHide(420);
            }}
          >
            <div className="video-player-side-panel__tabs" role="tablist">
              <button
                className={`video-player-side-panel__tab${activeTab === "info" ? " video-player-side-panel__tab--active" : ""}`}
                id="video-player-tab-info"
                type="button"
                role="tab"
                aria-selected={activeTab === "info"}
                aria-controls="video-player-panel-info"
                onClick={() => {
                  setActiveTab("info");
                }}
              >
                {t("video-player.more.tabs.info")}
              </button>
              <button
                className={`video-player-side-panel__tab${activeTab === "subtitles" ? " video-player-side-panel__tab--active" : ""}`}
                id="video-player-tab-subtitles"
                type="button"
                role="tab"
                aria-selected={activeTab === "subtitles"}
                aria-controls="video-player-panel-subtitles"
                onClick={() => {
                  setActiveTab("subtitles");
                }}
              >
                {t("video-player.more.tabs.subtitles")}
              </button>
              <button
                className={`video-player-side-panel__tab${activeTab === "audio" ? " video-player-side-panel__tab--active" : ""}`}
                id="video-player-tab-audio"
                type="button"
                role="tab"
                aria-selected={activeTab === "audio"}
                aria-controls="video-player-panel-audio"
                onClick={() => {
                  setActiveTab("audio");
                }}
              >
                {t("video-player.more.tabs.audio")}
              </button>
            </div>

            {renderMorePanelBody()}
          </aside>
        ) : null}

        <section
          className={`video-player-dock${isChromeVisible ? "" : " video-player-dock--hidden"}`}
          aria-label={t("video-player.labels.toolbar")}
          onPointerMove={() => {
            revealChrome();
          }}
          onPointerLeave={() => {
            scheduleChromeHide(420);
          }}
        >
          <input
            className="video-player-timeline"
            type="range"
            min={0}
            max={controller.duration > 0 ? controller.duration : 0}
            step={0.1}
            value={controller.currentTime}
            onChange={(event) => {
              controller.seekTo(Number(event.target.value));
            }}
            disabled={!videoSource || controller.duration <= 0}
            aria-label={t("video-player.labels.timeline")}
          />

          <div className="video-player-toolbar">
            <IconButton
              label={t("video-player.actions.open")}
              icon={OPEN_ICON}
              onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.openFile)}
            />
            <IconButton
              label={controller.isPlaying ? t("video-player.actions.pause") : t("video-player.actions.play")}
              icon={controller.isPlaying ? PAUSE_ICON : PLAY_ICON}
              disabled={!videoSource}
              onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.togglePlayback)}
            />
            <IconButton
              label={t("video-player.actions.seekBackward")}
              icon={BACKWARD_ICON}
              disabled={!videoSource}
              onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.seekBackward)}
            />
            <IconButton
              label={t("video-player.actions.seekForward")}
              icon={FORWARD_ICON}
              disabled={!videoSource}
              onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.seekForward)}
            />

            <div className="video-player-toolbar__spacer" />

            <div className="video-player-volume">
              <IconButton
                label={controller.isMuted ? t("video-player.actions.unmute") : t("video-player.actions.mute")}
                icon={controller.isMuted ? MUTED_ICON : VOLUME_ICON}
                disabled={!videoSource}
                onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.toggleMute)}
              />

              <div className="video-player-volume__popover">
                <input
                  className="video-player-volume__slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={controller.isMuted ? 0 : controller.volume}
                  onChange={(event) => {
                    controller.setVolumeLevel(Number(event.target.value));
                  }}
                  disabled={!videoSource}
                  aria-label={t("video-player.labels.volume")}
                />
              </div>
            </div>

            <IconButton
              label={t("video-player.actions.save")}
              icon={SAVE_ICON}
              disabled={!videoSource || isSaving}
              onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.saveCopy)}
            />
            <IconButton
              label={
                controller.isPictureInPicture
                  ? t("video-player.actions.exitPictureInPicture")
                  : t("video-player.actions.pictureInPicture")
              }
              icon={PICTURE_IN_PICTURE_ICON}
              disabled={!videoSource || !controller.canUsePictureInPicture}
              onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.togglePictureInPicture)}
            />
            <IconButton
              label={controller.isFullscreen ? t("video-player.actions.exitFullscreen") : t("video-player.actions.fullscreen")}
              icon={FULLSCREEN_ICON}
              disabled={!videoSource}
              onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.toggleFullscreen)}
            />
            <IconButton
              label={isMorePanelOpen ? t("video-player.actions.closeMore") : t("video-player.actions.more")}
              icon={MORE_ICON}
              active={isMorePanelOpen}
              buttonRef={moreButtonRef}
              onClick={() => invokeCommand(VIDEO_PLAYER_COMMAND_IDS.toggleMorePanel)}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
