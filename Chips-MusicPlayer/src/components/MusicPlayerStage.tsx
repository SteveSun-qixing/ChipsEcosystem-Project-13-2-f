import React, { useEffect, useRef, useState } from "react";
import { ChipsIcon } from "@chips/component-library";
import type { IconDescriptor } from "chips-sdk";
import { useMusicPlayerController } from "../hooks/useMusicPlayerController";
import { findActiveLyricIndex, resolveActiveLyricProgress } from "../utils/lyrics";
import { resolveControlAccentPalette, type RGBColor } from "../utils/color";
import { extractArtworkPalette } from "../utils/artwork-palette";
import {
  formatDuration,
  formatRemainingDuration,
  resolveAudioFormatLabel,
  type TrackPresentation,
  type ViewerFeedback,
} from "../utils/music-player";
import {
  getLyricsLayoutPosition,
  getLyricsTransitionDelay,
  resolveLyricsViewportOffset,
} from "../utils/lyrics-layout";
import { resolveMobilePagerTargetPage, shouldUseMobilePagerLayout } from "../utils/layout";

interface MusicPlayerStageProps {
  track: TrackPresentation | null;
  isResolving: boolean;
  isSaving: boolean;
  feedback: ViewerFeedback | null;
  onOpenFiles: () => void | Promise<void>;
  onSaveAudio: () => void | Promise<void>;
  onDropFiles: (files: File[]) => void | Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const DEFAULT_ARTWORK_URI = new URL("../../assets/artwork/default-cover.svg", import.meta.url).href;
const FALLBACK_ATMOSPHERE_COLORS: readonly RGBColor[] = [
  [232, 232, 232],
  [197, 197, 199],
  [255, 255, 255],
  [150, 150, 150],
];

const ICONS = {
  play: { name: "play_arrow", fill: true, decorative: true } satisfies IconDescriptor,
  pause: { name: "pause", fill: true, decorative: true } satisfies IconDescriptor,
  rewind: { name: "replay_10", decorative: true } satisfies IconDescriptor,
  forward: { name: "forward_10", decorative: true } satisfies IconDescriptor,
  save: { name: "download", decorative: true } satisfies IconDescriptor,
  mute: { name: "volume_off", decorative: true } satisfies IconDescriptor,
  volume: { name: "volume_up", decorative: true } satisfies IconDescriptor,
  loop: { name: "repeat_one", decorative: true } satisfies IconDescriptor,
  loopOff: { name: "repeat", decorative: true } satisfies IconDescriptor,
} as const;

function toRgba(color: RGBColor, alpha: number): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

function applyAtmosphereColors(colors: readonly RGBColor[]): void {
  if (typeof document === "undefined") {
    return;
  }

  colors.forEach((color, index) => {
    document.body.style.setProperty(`--color${index + 1}`, toRgba(color, 0.8));
    document.body.style.setProperty(`--color${index + 1}-rgba`, toRgba(color, 0.3));
  });

  const accentPalette = resolveControlAccentPalette(colors);
  document.body.style.setProperty("--control-accent-base", toRgba(accentPalette.base, 0.84));
  document.body.style.setProperty("--control-accent-strong", toRgba(accentPalette.strong, 0.98));
  document.body.style.setProperty("--control-accent-rim", toRgba(accentPalette.rim, 0.94));
  document.body.style.setProperty("--control-accent-glow", toRgba(accentPalette.glow, 0.56));
  document.body.style.setProperty("--control-accent-foreground", toRgba(accentPalette.foreground, 0.98));
}

class Slice {
  private angle = Math.random() * Math.PI * 2;
  private readonly velocity = (Math.random() - 0.5) * 0.005;
  private readonly scale = 1.2;

  constructor(
    private readonly image: HTMLImageElement,
    private readonly index: number,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  update(): void {
    this.angle += this.velocity;
  }

  draw(): void {
    const context = this.canvas.getContext("2d");
    if (!context) {
      return;
    }

    const { width, height } = this.canvas;
    const centerX = this.index % 2 === 0 ? width * 0.25 : width * 0.75;
    const centerY = this.index < 2 ? height * 0.25 : height * 0.75;
    const sourceWidth = this.image.width / 2;
    const sourceHeight = this.image.height / 2;
    const sourceX = (this.index % 2) * sourceWidth;
    const sourceY = Math.floor(this.index / 2) * sourceHeight;
    const drawSize = Math.max(width, height) * 0.6;

    context.save();
    context.translate(centerX, centerY);
    context.rotate(this.angle);
    context.scale(this.scale, this.scale);
    context.globalAlpha = 0.7;
    context.drawImage(
      this.image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize,
    );
    context.restore();
  }
}

function SecondaryControlButton(props: {
  label: string;
  icon: IconDescriptor;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void | Promise<void>;
}) {
  const { label, icon, disabled, active, onClick } = props;

  return (
    <span className="music-player-tooltip-anchor" data-tooltip={label}>
      <button
        type="button"
        className={`auxcontrol${active ? " auxcontrol--active" : ""}`}
        aria-label={label}
        disabled={disabled}
        onClick={() => void onClick()}
      >
        <ChipsIcon descriptor={icon} />
      </button>
    </span>
  );
}

function TooltipAnchor(props: {
  label: string;
  children: React.ReactNode;
}) {
  const { label, children } = props;
  return (
    <span className="music-player-tooltip-anchor" data-tooltip={label}>
      {children}
    </span>
  );
}

function isMobilePagerDragIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest("button, input, textarea, select, label, a, [role='button'], [data-mobile-pager-drag='ignore']") !== null;
}

export function MusicPlayerStage(props: MusicPlayerStageProps): React.ReactElement {
  const { track, isResolving, isSaving, feedback, onOpenFiles, onSaveAudio, onDropFiles, t } = props;
  const [isDragActive, setIsDragActive] = useState(false);
  const [isMousePagerDragging, setIsMousePagerDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));
  const [viewportHeight, setViewportHeight] = useState(() => (typeof window === "undefined" ? 720 : window.innerHeight));
  const [lyricsLayoutVersion, setLyricsLayoutVersion] = useState(0);
  const [mobilePageIndex, setMobilePageIndex] = useState(0);
  const controller = useMusicPlayerController({
    sessionKey: track ? `${track.source.sourceId}:${track.source.revision}` : null,
  });
  const dragDepthRef = useRef(0);
  const mobilePagerRef = useRef<HTMLDivElement | null>(null);
  const mobilePageIndexRef = useRef(0);
  const mobilePagerViewportRef = useRef({
    isMobilePagerLayout: false,
    viewportWidth: 0,
  });
  const mobilePagerDragStateRef = useRef({
    isPointerDown: false,
    isDragging: false,
    startX: 0,
    currentX: 0,
    startScrollLeft: 0,
    startPageIndex: 0,
  });
  const mobilePagerDraggingStateRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const lyricLineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lyricTimeoutIdsRef = useRef<number[]>([]);
  const lyricProgressFrameRef = useRef(0);
  const lastAnimatedLyricIndexRef = useRef<number>(-2);

  const artworkUri = track?.artworkUri ?? DEFAULT_ARTWORK_URI;
  const activeLyricIndex =
    track?.lyrics.mode === "timed" ? findActiveLyricIndex(track.lyrics.lines, controller.currentTime * 1_000) : -1;
  const overlayMessage = controller.errorKey
    ? t(`music-player.errors.${controller.errorKey}`)
    : isResolving
      ? t("music-player.viewer.loading")
      : controller.isBuffering
        ? t("music-player.viewer.buffering")
        : null;
  const progressRatio = controller.duration > 0 ? Math.min(100, (controller.currentTime / controller.duration) * 100) : 0;
  const formatLabel = track ? resolveAudioFormatLabel(track.source.fileName || track.source.sourceId, track.source.mimeType) : "";
  const sourceBadge = track ? (track.source.isRemote ? t("music-player.labels.remote") : t("music-player.labels.local")) : "";
  const fallbackLyricIndex = activeLyricIndex >= 0 ? activeLyricIndex : 0;
  const lyricsViewportHeight = lyricsContainerRef.current?.clientHeight ?? viewportHeight;
  const initialLyricsOffset = resolveLyricsViewportOffset(lyricsViewportHeight);
  const metaPrimary = track ? track.artist || t("music-player.viewer.metadataFallback") : t("music-player.viewer.emptyHint");
  const metaSecondary = track
    ? track.album || [sourceBadge, formatLabel || t("music-player.labels.unknown")].filter(Boolean).join(" · ")
    : t("music-player.viewer.selectBundleHint");
  const isMobilePagerLayout = shouldUseMobilePagerLayout(viewportWidth, viewportHeight);

  function setMousePagerDraggingState(nextValue: boolean): void {
    if (mobilePagerDraggingStateRef.current === nextValue) {
      return;
    }

    mobilePagerDraggingStateRef.current = nextValue;
    setIsMousePagerDragging(nextValue);
  }

  function scrollToMobilePage(pageIndex: number, behavior: ScrollBehavior = "smooth"): void {
    const pager = mobilePagerRef.current;
    const clampedPageIndex = Math.max(0, Math.min(1, pageIndex));

    setMobilePageIndex(clampedPageIndex);

    if (!pager) {
      return;
    }

    pager.scrollTo({
      left: pager.clientWidth * clampedPageIndex,
      behavior,
    });
  }

  function handleMobilePagerScroll(event: React.UIEvent<HTMLDivElement>): void {
    if (!isMobilePagerLayout) {
      return;
    }

    const pagerWidth = event.currentTarget.clientWidth;
    if (pagerWidth <= 0) {
      return;
    }

    const nextPageIndex = Math.max(0, Math.min(1, Math.round(event.currentTarget.scrollLeft / pagerWidth)));
    if (nextPageIndex !== mobilePageIndex) {
      setMobilePageIndex(nextPageIndex);
    }
  }

  function handleMobilePagerMouseDown(event: React.MouseEvent<HTMLDivElement>): void {
    if (!isMobilePagerLayout || event.button !== 0 || isMobilePagerDragIgnoredTarget(event.target)) {
      return;
    }

    const pager = mobilePagerRef.current;
    if (!pager) {
      return;
    }

    mobilePagerDragStateRef.current = {
      isPointerDown: true,
      isDragging: false,
      startX: event.clientX,
      currentX: event.clientX,
      startScrollLeft: pager.scrollLeft,
      startPageIndex: mobilePageIndexRef.current,
    };
    setMousePagerDraggingState(false);
    event.preventDefault();
  }

  function applyLyricProgressState(playbackTimeMs: number): void {
    if (track?.lyrics.mode !== "timed") {
      return;
    }

    const currentIndex = findActiveLyricIndex(track.lyrics.lines, playbackTimeMs);
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
    const currentProgress = resolveActiveLyricProgress(track.lyrics.lines, playbackTimeMs, currentIndex);

    if (currentIndex !== lastAnimatedLyricIndexRef.current) {
      track.lyrics.lines.forEach((_, index) => {
        const element = lyricLineRefs.current[index];
        if (!element) {
          return;
        }

        element.style.filter = `blur(${Math.abs(index - fallbackIndex)}px)`;
        element.style.setProperty("--lyric-line-opacity", index < currentIndex ? "0.74" : index === currentIndex ? "1" : "0.22");
        element.style.setProperty("--lyric-fill-progress", index < currentIndex ? "1" : index === currentIndex ? String(currentProgress) : "0");
      });
      lastAnimatedLyricIndexRef.current = currentIndex;
      return;
    }

    if (currentIndex >= 0) {
      const activeElement = lyricLineRefs.current[currentIndex];
      activeElement?.style.setProperty("--lyric-fill-progress", String(currentProgress));
    }
  }

  useEffect(() => {
    mobilePageIndexRef.current = mobilePageIndex;
  }, [mobilePageIndex]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.classList.toggle("no-files", !track);
    return () => {
      document.body.classList.remove("no-files");
    };
  }, [track]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const pager = mobilePagerRef.current;
    const didLayoutModeChange = mobilePagerViewportRef.current.isMobilePagerLayout !== isMobilePagerLayout;
    const didViewportWidthChange = mobilePagerViewportRef.current.viewportWidth !== viewportWidth;

    mobilePagerViewportRef.current = {
      isMobilePagerLayout,
      viewportWidth,
    };

    if (!isMobilePagerLayout || !pager || (!didLayoutModeChange && !didViewportWidthChange)) {
      return;
    }

    pager.scrollTo({
      left: pager.clientWidth * mobilePageIndex,
      behavior: "auto",
    });
  }, [isMobilePagerLayout, mobilePageIndex, viewportWidth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const finishMousePagerDrag = (clientX: number | null) => {
      const pager = mobilePagerRef.current;
      const dragState = mobilePagerDragStateRef.current;

      if (!dragState.isPointerDown) {
        return;
      }

      if (typeof clientX === "number") {
        dragState.currentX = clientX;
      }

      if (pager && dragState.isDragging) {
        const nextPageIndex = resolveMobilePagerTargetPage(
          dragState.startPageIndex,
          dragState.currentX - dragState.startX,
          pager.clientWidth,
        );
        setMobilePageIndex(nextPageIndex);
        pager.scrollTo({
          left: pager.clientWidth * nextPageIndex,
          behavior: "smooth",
        });
      }

      mobilePagerDragStateRef.current = {
        isPointerDown: false,
        isDragging: false,
        startX: 0,
        currentX: 0,
        startScrollLeft: 0,
        startPageIndex: mobilePageIndexRef.current,
      };
      setMousePagerDraggingState(false);
    };

    const handleWindowMouseMove = (event: MouseEvent) => {
      if (!isMobilePagerLayout) {
        return;
      }

      const pager = mobilePagerRef.current;
      const dragState = mobilePagerDragStateRef.current;
      if (!pager || !dragState.isPointerDown) {
        return;
      }

      dragState.currentX = event.clientX;
      const deltaX = dragState.currentX - dragState.startX;
      if (!dragState.isDragging && Math.abs(deltaX) < 6) {
        return;
      }

      dragState.isDragging = true;
      pager.scrollLeft = dragState.startScrollLeft - deltaX;
      setMousePagerDraggingState(true);
      event.preventDefault();
    };

    const handleWindowMouseUp = (event: MouseEvent) => {
      finishMousePagerDrag(event.clientX);
    };

    const handleWindowBlur = () => {
      finishMousePagerDrag(null);
    };

    window.addEventListener("mousemove", handleWindowMouseMove, { passive: false });
    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("blur", handleWindowBlur);
      finishMousePagerDrag(null);
    };
  }, [isMobilePagerLayout]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
      return;
    }

    const container = lyricsContainerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(() => {
      setLyricsLayoutVersion((current) => current + 1);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [track?.source.revision, track?.lyrics.mode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    let animationFrameId = 0;
    let disposed = false;

    const artwork = new Image();
    artwork.decoding = "async";
    if (/^https?:/i.test(artworkUri)) {
      artwork.crossOrigin = "anonymous";
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const stopAnimation = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("resize", resizeCanvas);
    };

    const paintFallback = () => {
      applyAtmosphereColors(FALLBACK_ATMOSPHERE_COLORS);
      resizeCanvas();
      context.clearRect(0, 0, canvas.width, canvas.height);
    };

    artwork.onload = () => {
      if (disposed) {
        return;
      }

      try {
        const tempCanvas = document.createElement("canvas");
        const tempContext = tempCanvas.getContext("2d");
        if (!tempContext) {
          throw new Error("temporary canvas context unavailable");
        }

        tempCanvas.width = 100;
        tempCanvas.height = Math.max(1, Math.round(100 * (artwork.height / artwork.width)));
        tempContext.drawImage(artwork, 0, 0, tempCanvas.width, tempCanvas.height);
        const imageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const palette = extractArtworkPalette(imageData, 4);
        applyAtmosphereColors(palette.length > 0 ? palette : FALLBACK_ATMOSPHERE_COLORS);
      } catch {
        applyAtmosphereColors(FALLBACK_ATMOSPHERE_COLORS);
      }

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      const slices = [0, 1, 2, 3].map((index) => new Slice(artwork, index, canvas));

      const animate = () => {
        context.globalCompositeOperation = "source-over";
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = "screen";
        for (const slice of slices) {
          slice.update();
          slice.draw();
        }
        animationFrameId = window.requestAnimationFrame(animate);
      };

      animate();
    };

    artwork.onerror = paintFallback;
    artwork.src = artworkUri;

    return () => {
      disposed = true;
      stopAnimation();
    };
  }, [artworkUri]);

  useEffect(() => {
    if (typeof window === "undefined" || track?.lyrics.mode !== "timed") {
      lastAnimatedLyricIndexRef.current = -2;
      return;
    }

    const renderProgressFrame = () => {
      const playbackTimeMs = (controller.audioRef.current?.currentTime ?? controller.currentTime) * 1_000;
      applyLyricProgressState(playbackTimeMs);

      if (controller.isPlaying) {
        lyricProgressFrameRef.current = window.requestAnimationFrame(renderProgressFrame);
      }
    };

    window.cancelAnimationFrame(lyricProgressFrameRef.current);
    renderProgressFrame();

    return () => {
      window.cancelAnimationFrame(lyricProgressFrameRef.current);
    };
  }, [controller.isPlaying, track, lyricsLayoutVersion]);

  useEffect(() => {
    if (track?.lyrics.mode !== "timed" || controller.isPlaying) {
      return;
    }

    applyLyricProgressState(controller.currentTime * 1_000);
  }, [controller.currentTime, controller.isPlaying, track]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    lyricTimeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    lyricTimeoutIdsRef.current = [];

    if (track?.lyrics.mode !== "timed") {
      lyricLineRefs.current = [];
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const lineHeights = track.lyrics.lines.map((_, index) => lyricLineRefs.current[index]?.getBoundingClientRect().height ?? 0);
      const resolvedIndex = activeLyricIndex >= 0 ? activeLyricIndex : 0;
      const hasActiveLyric = activeLyricIndex >= 0;
      const viewportOffset = resolveLyricsViewportOffset(lyricsContainerRef.current?.clientHeight ?? viewportHeight);

      track.lyrics.lines.forEach((_, index) => {
        const element = lyricLineRefs.current[index];
        if (!element) {
          return;
        }

        const position = getLyricsLayoutPosition(resolvedIndex, index, lineHeights, viewportOffset);
        const delay = hasActiveLyric ? getLyricsTransitionDelay(resolvedIndex, index) : 0;
        const timeoutId = window.setTimeout(() => {
          element.style.transform = `translateY(${position}px)`;
        }, delay);
        lyricTimeoutIdsRef.current.push(timeoutId);
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      lyricTimeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      lyricTimeoutIdsRef.current = [];
    };
  }, [activeLyricIndex, lyricsLayoutVersion, track, viewportHeight]);

  return (
    <div
      className={`music-player-shell${isDragActive ? " music-player-shell--drag" : ""}`}
      ref={controller.surfaceRef}
      tabIndex={0}
      onKeyDown={controller.handleKeyDown}
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
        void onDropFiles(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <div className="background" aria-hidden="true" />
      {isMobilePagerLayout ? (
        <div className="music-player-mobile-pagination" aria-label={t("music-player.section.mobilePages")}>
          <button
            type="button"
            className={`music-player-mobile-dot${mobilePageIndex === 0 ? " music-player-mobile-dot--active" : ""}`}
            aria-label={t("music-player.actions.showPlayerPage")}
            aria-current={mobilePageIndex === 0 ? "page" : undefined}
            onClick={() => {
              scrollToMobilePage(0);
            }}
          />
          <button
            type="button"
            className={`music-player-mobile-dot${mobilePageIndex === 1 ? " music-player-mobile-dot--active" : ""}`}
            aria-label={t("music-player.actions.showLyricsPage")}
            aria-current={mobilePageIndex === 1 ? "page" : undefined}
            onClick={() => {
              scrollToMobilePage(1);
            }}
          />
        </div>
      ) : null}
      <div
        className={`main${isMobilePagerLayout ? " main--mobile-pager" : ""}${isMousePagerDragging ? " main--mobile-pager--dragging" : ""}`}
        ref={mobilePagerRef}
        onScroll={handleMobilePagerScroll}
        onMouseDown={handleMobilePagerMouseDown}
      >
        <section className="leftcontent" aria-label={t("music-player.app.title")}>
          <TooltipAnchor label={track ? t("music-player.actions.open") : t("music-player.viewer.emptyPrompt")}>
            <button
              className={`svgcontainer${controller.isPlaying ? " svgcontainer--playing" : ""}`}
              type="button"
              aria-label={track ? t("music-player.actions.open") : t("music-player.viewer.emptyPrompt")}
              onClick={() => void onOpenFiles()}
              style={{ backgroundImage: `url("${artworkUri}")` }}
            >
              <span className="svg" aria-hidden="true" />
            </button>
          </TooltipAnchor>

          <div className="time">
            <p className="start">{formatDuration(controller.currentTime)}</p>
            <p className="name">{track?.source.title ?? t("music-player.viewer.emptyPrompt")}</p>
            <p className="end">{formatRemainingDuration(controller.duration, controller.currentTime)}</p>
          </div>

          <div className="metarow" aria-live="polite">
            <p>{metaPrimary}</p>
            <p>{metaSecondary}</p>
          </div>

          <div className="processbar">
            <div className="process" style={{ width: `${progressRatio}%` }} />
            <input
              className="processinput"
              type="range"
              min={0}
              max={controller.duration || 0}
              step={0.01}
              value={Math.min(controller.currentTime, controller.duration || controller.currentTime)}
              aria-label={t("music-player.section.details")}
              disabled={!track || controller.duration <= 0}
              onChange={(event) => {
                controller.seekTo(Number(event.currentTarget.value));
              }}
            />
          </div>

          <div className="conbox">
            <div className="controls">
              <TooltipAnchor label={t("music-player.actions.play")}>
                <button
                  type="button"
                  className={`play${controller.isPlaying ? " is-hidden" : ""}`}
                  aria-label={t("music-player.actions.play")}
                  disabled={!track}
                  onClick={() => void controller.togglePlayback()}
                >
                  <ChipsIcon descriptor={ICONS.play} />
                </button>
              </TooltipAnchor>
              <TooltipAnchor label={t("music-player.actions.pause")}>
                <button
                  type="button"
                  className={`pause${controller.isPlaying ? "" : " is-hidden"}`}
                  aria-label={t("music-player.actions.pause")}
                  disabled={!track}
                  onClick={() => void controller.togglePlayback()}
                >
                  <ChipsIcon descriptor={ICONS.pause} />
                </button>
              </TooltipAnchor>
            </div>
          </div>

          <div className="tooldock" aria-label={t("music-player.section.controls")}>
            <div className="auxcontrols">
              <SecondaryControlButton
                label={t("music-player.actions.rewind10")}
                icon={ICONS.rewind}
                disabled={!track}
                onClick={() => controller.seekBy(-10)}
              />
              <SecondaryControlButton
                label={t("music-player.actions.forward10")}
                icon={ICONS.forward}
                disabled={!track}
                onClick={() => controller.seekBy(10)}
              />
              <SecondaryControlButton
                label={controller.loopMode === "one" ? t("music-player.actions.loopOne") : t("music-player.actions.loopOff")}
                icon={controller.loopMode === "one" ? ICONS.loop : ICONS.loopOff}
                disabled={!track}
                active={controller.loopMode === "one"}
                onClick={controller.toggleLoopMode}
              />
              <SecondaryControlButton
                label={controller.isMuted ? t("music-player.actions.unmute") : t("music-player.actions.mute")}
                icon={controller.isMuted ? ICONS.mute : ICONS.volume}
                disabled={!track}
                active={controller.isMuted}
                onClick={controller.toggleMute}
              />
              <SecondaryControlButton
                label={t("music-player.actions.save")}
                icon={ICONS.save}
                disabled={!track || isSaving}
                onClick={onSaveAudio}
              />
            </div>

            <div className="volumecontrol">
              <span className="volumecontrol__label">{t("music-player.labels.volume")}</span>
              <input
                className="volumeinput"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={controller.isMuted ? 0 : controller.volume}
                aria-label={t("music-player.labels.volume")}
                disabled={!track}
                onChange={(event) => {
                  controller.setVolumeLevel(Number(event.currentTarget.value));
                }}
              />
            </div>
          </div>
        </section>

        <aside className="rightcontent" aria-label={t("music-player.section.lyrics")}>
          <div className="lyricscontainer" ref={lyricsContainerRef}>
            {track?.lyrics.mode === "timed" ? (
              <div className="lyrics" aria-live="polite">
                {track.lyrics.lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="item"
                    style={{
                      transform: `translateY(${initialLyricsOffset + index * 72}px)`,
                      filter: `blur(${Math.abs(index - fallbackLyricIndex)}px)`,
                      ["--lyric-fill-progress" as "--lyric-fill-progress"]: index < activeLyricIndex ? "1" : "0",
                      ["--lyric-line-opacity" as "--lyric-line-opacity"]: index < activeLyricIndex ? "0.74" : "0.22",
                    }}
                    ref={(element) => {
                      lyricLineRefs.current[index] = element;
                    }}
                  >
                    <p data-text={line.text}>{line.text}</p>
                  </div>
                ))}
              </div>
            ) : track?.lyrics.mode === "plain" ? (
              <div className="lyrics lyrics--plain">
                {track.lyrics.lines.map((line) => (
                  <div key={line.id} className="item item--plain">
                    <p data-text={line.text}>{line.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="lyrics lyrics--empty">
                <div className="lyrics-empty-message">{track ? t("music-player.viewer.lyricsEmpty") : t("music-player.section.lyrics")}</div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <canvas ref={canvasRef} className="canvas" aria-hidden="true" />

      {feedback ? <div className={`music-player-feedback music-player-feedback--${feedback.tone}`}>{feedback.message}</div> : null}
      {overlayMessage ? <div className="music-player-overlay">{overlayMessage}</div> : null}

      <audio
        key={track?.source.revision ?? "empty"}
        ref={controller.audioRef}
        className="music-player-audio"
        src={track?.source.resourceUri}
        preload="metadata"
        autoPlay
        loop={controller.loopMode === "one"}
        onLoadedMetadata={controller.handleLoadedMetadata}
        onCanPlay={controller.handleCanPlay}
        onPlaying={controller.handlePlaying}
        onPause={controller.handlePause}
        onWaiting={controller.handleWaiting}
        onEnded={controller.handleEnded}
        onTimeUpdate={controller.handleTimeUpdate}
        onProgress={controller.handleProgress}
        onVolumeChange={controller.handleVolumeChange}
        onError={controller.handleError}
      />
    </div>
  );
}
