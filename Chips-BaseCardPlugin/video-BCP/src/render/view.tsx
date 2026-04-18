import React, { useEffect, useRef, useState } from "react";
import type { BasecardConfig } from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import {
  deriveDisplayTitle,
  deriveMetaLine,
  inferVideoMimeType,
  normalizeRelativeCardResourcePath,
  resolveFileName,
} from "../shared/utils";

export const VIEW_STYLE_TEXT = `
.chips-video-card {
  width: 100%;
  color: var(--chips-sys-color-on-surface, #0f172a);
  font: 14px/1.55 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-video-card,
.chips-video-card * {
  box-sizing: border-box;
}

.chips-video-card__surface,
.chips-video-card__surface-button {
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
}

.chips-video-card__surface-button {
  cursor: pointer;
}

.chips-video-card__surface-button:focus-visible {
  outline: none;
}

.chips-video-card__poster-shell {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background:
    linear-gradient(160deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.96)),
    var(--chips-sys-color-surface-container, rgba(255, 255, 255, 0.92));
  aspect-ratio: 16 / 9;
}

.chips-video-card__poster,
.chips-video-card__fallback-video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #030712;
}

.chips-video-card__empty {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 20px;
  color: var(--chips-sys-color-on-surface, #0f172a);
  text-align: center;
}

.chips-video-card__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(2, 6, 23, 0.12);
  opacity: 0;
  transition:
    opacity 0.18s ease,
    background-color 0.18s ease;
}

.chips-video-card__surface-button:hover .chips-video-card__overlay,
.chips-video-card__surface-button:focus-visible .chips-video-card__overlay,
.chips-video-card__poster-shell:hover .chips-video-card__overlay {
  opacity: 1;
  background: rgba(2, 6, 23, 0.42);
}

.chips-video-card__play-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.56);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(8px);
}

.chips-video-card__play-badge::before {
  content: "";
  display: block;
  width: 0;
  height: 0;
  margin-left: 6px;
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
  border-left: 20px solid rgba(255, 255, 255, 0.95);
}

.chips-video-card__info {
  display: grid;
  gap: 4px;
  padding: 12px 6px 0;
}

.chips-video-card__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-video-card__meta {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
}

@media (max-width: 560px) {
  .chips-video-card__poster-shell {
    border-radius: 14px;
  }

  .chips-video-card__play-badge {
    width: 60px;
    height: 60px;
  }
}
`;

export interface BasecardViewProps {
  config: BasecardConfig;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  openResource?: (input: {
    resourceId: string;
    mimeType?: string;
    title?: string;
    fileName?: string;
  }) => void;
}

async function resolveResourceUrlWithRetry(
  resolveResourceUrl: ((resourcePath: string) => Promise<string>) | undefined,
  resourcePath: string,
): Promise<string> {
  if (!resolveResourceUrl) {
    return "";
  }

  try {
    return await resolveResourceUrl(resourcePath);
  } catch (firstError) {
    await new Promise((resolve) => setTimeout(resolve, 16));
    return resolveResourceUrl(resourcePath).catch(() => {
      throw firstError;
    });
  }
}

function getImmediateResourceUrl(
  resourcePath: string,
  resolveResourceUrl?: (resourcePath: string) => Promise<string>,
): string {
  const normalizedPath = normalizeRelativeCardResourcePath(resourcePath);
  if (!normalizedPath) {
    return "";
  }

  return resolveResourceUrl ? "" : normalizedPath;
}

function useResolvedResourceUrl(
  resourcePath: string,
  resolveResourceUrl?: (resourcePath: string) => Promise<string>,
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void,
): string {
  const [resolvedUrl, setResolvedUrl] = useState(() => getImmediateResourceUrl(resourcePath, resolveResourceUrl));

  useEffect(() => {
    let cancelled = false;
    const normalizedPath = normalizeRelativeCardResourcePath(resourcePath);

    if (!normalizedPath) {
      setResolvedUrl("");
      return undefined;
    }

    if (!resolveResourceUrl) {
      setResolvedUrl(normalizedPath);
      return undefined;
    }

    setResolvedUrl("");

    void resolveResourceUrlWithRetry(resolveResourceUrl, normalizedPath)
      .then((nextUrl) => {
        if (!cancelled) {
          setResolvedUrl(nextUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUrl("");
        }
      });

    return () => {
      cancelled = true;
      void Promise.resolve(releaseResourceUrl?.(normalizedPath)).catch(() => undefined);
    };
  }, [releaseResourceUrl, resolveResourceUrl, resourcePath]);

  return resolvedUrl;
}

function VideoFallbackPoster(props: { src: string }) {
  const { src } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    const handleLoadedMetadata = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : 0;
      const targetTime = duration > 0.08 ? Math.min(0.08, duration / 2) : 0;

      if (targetTime <= 0) {
        element.pause();
        return;
      }

      try {
        element.currentTime = targetTime;
      } catch {
        element.pause();
      }
    };

    const handleSeeked = () => {
      element.pause();
    };

    element.addEventListener("loadedmetadata", handleLoadedMetadata);
    element.addEventListener("seeked", handleSeeked);

    return () => {
      element.removeEventListener("loadedmetadata", handleLoadedMetadata);
      element.removeEventListener("seeked", handleSeeked);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="chips-video-card__fallback-video"
      src={src}
      preload="metadata"
      playsInline
      muted
      aria-hidden="true"
    />
  );
}

export function BasecardView({
  config,
  resolveResourceUrl,
  releaseResourceUrl,
  openResource,
}: BasecardViewProps) {
  const locale = typeof navigator !== "undefined" ? navigator.language : "zh-CN";
  const t = createTranslator(locale);
  const videoUrl = useResolvedResourceUrl(config.video_file, resolveResourceUrl, releaseResourceUrl);
  const coverUrl = useResolvedResourceUrl(config.cover_image, resolveResourceUrl, releaseResourceUrl);
  const displayTitle = deriveDisplayTitle(config);
  const metaLine = deriveMetaLine(config);
  const canOpen = Boolean(openResource && videoUrl);

  const content = (
    <>
      <div className="chips-video-card__poster-shell">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="chips-video-card__poster"
            draggable={false}
          />
        ) : videoUrl ? (
          <VideoFallbackPoster src={videoUrl} />
        ) : (
          <div className="chips-video-card__empty">{t("video.view.cover_unavailable")}</div>
        )}

        <div className="chips-video-card__overlay" aria-hidden="true">
          <span className="chips-video-card__play-badge" />
        </div>
      </div>

      {displayTitle || metaLine ? (
        <div className="chips-video-card__info">
          {config.video_title.trim() ? <p className="chips-video-card__title">{config.video_title.trim()}</p> : null}
          {metaLine ? <p className="chips-video-card__meta">{metaLine}</p> : null}
        </div>
      ) : null}
    </>
  );

  if (!normalizeRelativeCardResourcePath(config.video_file)) {
    return (
      <div className="chips-video-card" data-card-type={config.card_type}>
        <div className="chips-video-card__poster-shell">
          <div className="chips-video-card__empty">{t("video.view.empty")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chips-video-card" data-card-type={config.card_type}>
      {canOpen ? (
        <button
          type="button"
          className="chips-video-card__surface-button"
          onClick={() => {
            openResource?.({
              resourceId: videoUrl,
              mimeType: inferVideoMimeType(config.video_file),
              title: displayTitle || undefined,
              fileName: resolveFileName(config.video_file) || undefined,
            });
          }}
          aria-label={
            displayTitle
              ? t("video.view.open_named", { title: displayTitle })
              : t("video.view.open")
          }
        >
          {content}
        </button>
      ) : (
        <div className="chips-video-card__surface">{content}</div>
      )}
    </div>
  );
}
