import React, { useEffect, useRef, useState } from "react";
import { useVideoPlayerController } from "../hooks/useVideoPlayerController";
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
  isResolving: boolean;
  isSaving: boolean;
  feedback: ViewerFeedback | null;
  onOpenFile: () => void | Promise<void>;
  onSaveVideo: () => void | Promise<void>;
  onDropFile: (file: File | null) => void | Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

type MorePanelTab = "info" | "subtitles" | "audio";
const TOOLBAR_AUTO_HIDE_DELAY_MS = 2200;

function IconButton(props: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
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
        {icon}
      </span>
    </button>
  );
}

function OpenIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 7.5h5l1.8 2.2H19.5v7.8a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2z" />
      <path d="M12 12v6" />
      <path d="M9.5 15.5 12 18l2.5-2.5" />
    </svg>
  );
}

function PlayIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 6.8c0-1 1.1-1.6 1.9-1.1l8.3 5.2a1.3 1.3 0 0 1 0 2.2l-8.3 5.2A1.3 1.3 0 0 1 8 17.2z" />
    </svg>
  );
}

function PauseIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="7" y="5.5" width="3.8" height="13" rx="1.4" />
      <rect x="13.2" y="5.5" width="3.8" height="13" rx="1.4" />
    </svg>
  );
}

function BackwardIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 7 5 12l6 5" />
      <path d="m19 7-6 5 6 5" />
    </svg>
  );
}

function ForwardIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m13 7 6 5-6 5" />
      <path d="m5 7 6 5-6 5" />
    </svg>
  );
}

function VolumeIcon(props: { muted: boolean }): React.ReactElement {
  const { muted } = props;

  return muted ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 8 6.7 10.6H4.5v2.8h2.2L10 16z" />
      <path d="m14.5 9.5 5 5" />
      <path d="m19.5 9.5-5 5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 8 6.7 10.6H4.5v2.8h2.2L10 16z" />
      <path d="M15.3 9.2a4.2 4.2 0 0 1 0 5.6" />
      <path d="M17.9 6.8a7.6 7.6 0 0 1 0 10.4" />
    </svg>
  );
}

function SaveIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 4.5h9l2 2v13H6.5z" />
      <path d="M9 4.5v5h6v-5" />
      <path d="M9 17.5h6" />
    </svg>
  );
}

function PictureInPictureIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="6" width="15" height="11.5" rx="1.8" />
      <rect x="11.5" y="11" width="5.5" height="4.5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FullscreenIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4.5H4.5V8" />
      <path d="M16 4.5h3.5V8" />
      <path d="M4.5 16V19.5H8" />
      <path d="M19.5 16V19.5H16" />
    </svg>
  );
}

function MoreIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="6.5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="17.5" cy="12" r="1.7" />
    </svg>
  );
}

function FileHintIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4.5h6l4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
      <path d="M14 4.5v4h4" />
      <path d="M12 11v6" />
      <path d="m9.5 14.5 2.5 2.5 2.5-2.5" />
    </svg>
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
  const { videoSource, isResolving, isSaving, feedback, onOpenFile, onSaveVideo, onDropFile, t } = props;
  const [isDragActive, setIsDragActive] = useState(false);
  const [isMorePanelOpen, setIsMorePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MorePanelTab>("info");
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const dragDepthRef = useRef(0);
  const morePanelRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const hideChromeTimerRef = useRef<number | null>(null);
  const controller = useVideoPlayerController({
    sessionKey: videoSource ? `${videoSource.sourceId}:${videoSource.revision}` : null,
  });

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

      setIsMorePanelOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMorePanelOpen]);

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
            setIsMorePanelOpen(false);
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
            <button className="video-player-empty" type="button" onClick={() => void onOpenFile()}>
              <span className="video-player-empty__icon" aria-hidden="true">
                <FileHintIcon />
              </span>
              <span className="video-player-empty__text">
                {isDragActive ? t("video-player.viewer.dragPromptLine") : t("video-player.viewer.emptyLine")}
              </span>
            </button>
          )}

          {overlayMessage ? (
            <div className="video-player-overlay">
              <div className={`video-player-overlay__card${controller.errorKey ? " video-player-overlay__card--error" : ""}`}>
                {overlayMessage}
              </div>
            </div>
          ) : null}
        </div>

        {feedback ? <div className={`video-player-feedback video-player-feedback--${feedback.tone}`}>{feedback.message}</div> : null}

        {isMorePanelOpen ? (
          <aside
            ref={morePanelRef}
            className="video-player-side-panel"
            aria-label={t("video-player.actions.more")}
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
                type="button"
                role="tab"
                aria-selected={activeTab === "info"}
                onClick={() => {
                  setActiveTab("info");
                }}
              >
                {t("video-player.more.tabs.info")}
              </button>
              <button
                className={`video-player-side-panel__tab${activeTab === "subtitles" ? " video-player-side-panel__tab--active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === "subtitles"}
                onClick={() => {
                  setActiveTab("subtitles");
                }}
              >
                {t("video-player.more.tabs.subtitles")}
              </button>
              <button
                className={`video-player-side-panel__tab${activeTab === "audio" ? " video-player-side-panel__tab--active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === "audio"}
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
          aria-label={t("video-player.app.title")}
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
            <IconButton label={t("video-player.actions.open")} icon={<OpenIcon />} onClick={onOpenFile} />
            <IconButton
              label={controller.isPlaying ? t("video-player.actions.pause") : t("video-player.actions.play")}
              icon={controller.isPlaying ? <PauseIcon /> : <PlayIcon />}
              disabled={!videoSource}
              onClick={controller.togglePlayback}
            />
            <IconButton
              label={t("video-player.actions.seekBackward")}
              icon={<BackwardIcon />}
              disabled={!videoSource}
              onClick={() => controller.seekBy(-5)}
            />
            <IconButton
              label={t("video-player.actions.seekForward")}
              icon={<ForwardIcon />}
              disabled={!videoSource}
              onClick={() => controller.seekBy(5)}
            />

            <div className="video-player-toolbar__spacer" />

            <div className="video-player-volume">
              <IconButton
                label={controller.isMuted ? t("video-player.actions.unmute") : t("video-player.actions.mute")}
                icon={<VolumeIcon muted={controller.isMuted} />}
                disabled={!videoSource}
                onClick={controller.toggleMute}
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
              icon={<SaveIcon />}
              disabled={!videoSource || isSaving}
              onClick={onSaveVideo}
            />
            <IconButton
              label={
                controller.isPictureInPicture
                  ? t("video-player.actions.exitPictureInPicture")
                  : t("video-player.actions.pictureInPicture")
              }
              icon={<PictureInPictureIcon />}
              disabled={!videoSource || !controller.canUsePictureInPicture}
              onClick={controller.togglePictureInPicture}
            />
            <IconButton
              label={controller.isFullscreen ? t("video-player.actions.exitFullscreen") : t("video-player.actions.fullscreen")}
              icon={<FullscreenIcon />}
              disabled={!videoSource}
              onClick={controller.toggleFullscreen}
            />
            <IconButton
              label={isMorePanelOpen ? t("video-player.actions.closeMore") : t("video-player.actions.more")}
              icon={<MoreIcon />}
              active={isMorePanelOpen}
              buttonRef={moreButtonRef}
              onClick={() => {
                setIsMorePanelOpen((current) => !current);
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
