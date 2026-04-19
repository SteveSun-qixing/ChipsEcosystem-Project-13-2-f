import React, { useEffect, useState } from "react";
import type { BasecardConfig } from "../schema/card-config";
import { DEFAULT_MUSIC_COVER_URL } from "../shared/default-cover";
import { createTranslator } from "../shared/i18n";
import {
  deriveDisplayTitle,
  derivePrimaryArtist,
  inferAudioMimeType,
  normalizeRelativeCardResourcePath,
  resolveResourceUrlWithRetry,
  resolveFileName,
} from "../shared/utils";

export const VIEW_STYLE_TEXT = `
.chips-music-card {
  width: 100%;
  color: var(--chips-sys-color-on-surface, #0f172a);
  font: 14px/1.5 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-music-card,
.chips-music-card * {
  box-sizing: border-box;
}

.chips-music-card__surface,
.chips-music-card__surface-button {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 108px;
  padding: 12px 14px;
  border: none;
  border-radius: 20px;
  background: var(--chips-sys-color-surface-container-low, rgba(248, 250, 252, 0.94));
}

.chips-music-card__surface-button {
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
  appearance: none;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 0.16s ease;
}

.chips-music-card__surface-button:hover,
.chips-music-card__surface-button:focus-visible {
  background: var(--chips-sys-color-surface-container, rgba(241, 245, 249, 0.98));
  outline: none;
}

.chips-music-card__cover {
  position: relative;
  flex: 0 0 88px;
  width: 88px;
  height: 88px;
  min-width: 88px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--chips-sys-color-surface-container-high, rgba(255, 255, 255, 0.88));
}

.chips-music-card__cover-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-music-card__content {
  flex: 1;
  min-width: 0;
}

.chips-music-card__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.chips-music-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chips-music-card__artist {
  margin: 0;
  color: var(--chips-sys-color-on-surface-variant, #475569);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chips-music-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 2px;
}

.chips-music-card__meta-item {
  color: var(--chips-sys-color-on-surface-variant, #475569);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.chips-music-card__empty {
  display: grid;
  place-items: center;
  min-height: 108px;
  padding: 20px;
  border-radius: 20px;
  border: 1px dashed var(--chips-comp-card-shell-border-color, rgba(15, 23, 42, 0.14));
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  background: var(--chips-sys-color-surface, #ffffff);
  text-align: center;
}

@media (max-width: 560px) {
  .chips-music-card__surface,
  .chips-music-card__surface-button {
    gap: 12px;
    min-height: 92px;
    padding: 10px 12px;
    border-radius: 16px;
  }

  .chips-music-card__cover {
    flex-basis: 72px;
    width: 72px;
    height: 72px;
    min-width: 72px;
    border-radius: 14px;
  }

  .chips-music-card__title {
    font-size: 16px;
  }
}
`;

interface MusicBasecardViewProps {
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

function MetaItem(props: { children: React.ReactNode }) {
  const { children } = props;

  return (
    <span className="chips-music-card__meta-item">{children}</span>
  );
}

function useResolvedResourceUrl(
  resourcePath: string,
  resolveResourceUrl?: (resourcePath: string) => Promise<string>,
): string {
  const [resolvedUrl, setResolvedUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    const normalizedPath = normalizeRelativeCardResourcePath(resourcePath);

    if (!normalizedPath || !resolveResourceUrl) {
      setResolvedUrl(normalizedPath ?? "");
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
    };
  }, [resolveResourceUrl, resourcePath]);

  return resolvedUrl;
}

export function MusicBasecardView({
  config,
  resolveResourceUrl,
  openResource,
}: MusicBasecardViewProps) {
  const locale = typeof navigator !== "undefined" ? navigator.language : "zh-CN";
  const t = createTranslator(locale);
  const audioUrl = useResolvedResourceUrl(config.audio_file, resolveResourceUrl);
  const coverUrl = useResolvedResourceUrl(config.album_cover, resolveResourceUrl);
  const displayCoverUrl = coverUrl || DEFAULT_MUSIC_COVER_URL;
  const displayTitle = deriveDisplayTitle(config) || t("music.view.untitled");
  const artistLabel = derivePrimaryArtist(config) || t("music.view.artistFallback");
  const canOpen = Boolean(openResource && audioUrl);

  const metaItems = [
    config.album_name ? t("music.view.meta.album", { value: config.album_name }) : "",
    config.language ? t("music.view.meta.language", { value: config.language }) : "",
    config.genre ? t("music.view.meta.genre", { value: config.genre }) : "",
    config.release_date ? t("music.view.meta.release_date", { value: config.release_date }) : "",
  ].filter((item) => item.length > 0);

  const content = (
    <>
      <div className="chips-music-card__cover" aria-hidden="true">
        <img
          src={displayCoverUrl}
          alt=""
          className="chips-music-card__cover-image"
          draggable={false}
        />
      </div>

      <div className="chips-music-card__content">
        <div className="chips-music-card__main">
          <h2 className="chips-music-card__title">{displayTitle}</h2>
          <p className="chips-music-card__artist">{artistLabel}</p>
          {metaItems.length > 0 ? (
            <div className="chips-music-card__meta">
              {metaItems.map((item) => (
                <MetaItem key={item}>{item}</MetaItem>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  if (!normalizeRelativeCardResourcePath(config.audio_file)) {
    return (
      <div className="chips-music-card">
        <div className="chips-music-card__empty">{t("music.view.empty")}</div>
      </div>
    );
  }

  return (
    <div className="chips-music-card" data-card-type={config.card_type}>
      {canOpen ? (
        <button
          type="button"
          className="chips-music-card__surface-button"
          onClick={() => {
            openResource?.({
              resourceId: audioUrl,
              mimeType: inferAudioMimeType(config.audio_file),
              title: displayTitle,
              fileName: resolveFileName(config.audio_file),
            });
          }}
          aria-label={t("music.view.open", { title: displayTitle })}
        >
          {content}
        </button>
      ) : (
        <div className="chips-music-card__surface">
          {content}
        </div>
      )}
    </div>
  );
}
