import React, { useRef, useState } from "react";
import { usePhotoViewerCamera } from "../hooks/usePhotoViewerCamera";
import type { ImageDimensions } from "../utils/image-viewer";

interface ImageSource {
  filePath: string;
  fileName: string;
  resourceUri: string;
  revision: number;
}

interface ViewerFeedback {
  tone: "info" | "success" | "error";
  message: string;
}

interface PhotoViewerStageProps {
  imageSource: ImageSource | null;
  isImageLoaded: boolean;
  isResolving: boolean;
  isSaving: boolean;
  feedback: ViewerFeedback | null;
  onOpenFile: () => void | Promise<void>;
  onSaveImage: () => void | Promise<void>;
  onDropFile: (file: File | null) => void | Promise<void>;
  onImageLoad: (dimensions: ImageDimensions) => void;
  onImageError: () => void;
  imageDimensions: ImageDimensions | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PhotoViewerDock(props: {
  isImageReady: boolean;
  isSaving: boolean;
  zoomMode: "fit" | "manual";
  manualScale: number;
  onOpenFile: () => void | Promise<void>;
  onSaveImage: () => void | Promise<void>;
  onZoom: (direction: "in" | "out") => void;
  onFit: () => void;
  onActualSize: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { isImageReady, isSaving, zoomMode, manualScale, onOpenFile, onSaveImage, onZoom, onFit, onActualSize, t } = props;

  return (
    <div className="photo-viewer-toolbar" role="toolbar" aria-label={t("photo-viewer.app.title")}>
      <button className="photo-viewer-button" type="button" onClick={() => void onOpenFile()}>
        {t("photo-viewer.actions.open")}
      </button>
      <button className="photo-viewer-button" type="button" onClick={() => onZoom("out")} disabled={!isImageReady}>
        {t("photo-viewer.actions.zoomOut")}
      </button>
      <button className="photo-viewer-button" type="button" onClick={() => onZoom("in")} disabled={!isImageReady}>
        {t("photo-viewer.actions.zoomIn")}
      </button>
      <button
        className={`photo-viewer-button${zoomMode === "fit" ? " photo-viewer-button--active" : ""}`}
        type="button"
        onClick={onFit}
        disabled={!isImageReady}
      >
        {t("photo-viewer.actions.fit")}
      </button>
      <button
        className={`photo-viewer-button${zoomMode === "manual" && manualScale === 1 ? " photo-viewer-button--active" : ""}`}
        type="button"
        onClick={onActualSize}
        disabled={!isImageReady}
      >
        {t("photo-viewer.actions.actualSize")}
      </button>
      <button className="photo-viewer-button" type="button" onClick={() => void onSaveImage()} disabled={!isImageReady || isSaving}>
        {t("photo-viewer.actions.save")}
      </button>
    </div>
  );
}

export function PhotoViewerStage(props: PhotoViewerStageProps): React.ReactElement {
  const { imageSource, isImageLoaded, isResolving, isSaving, feedback, onOpenFile, onSaveImage, onDropFile, onImageLoad, onImageError, imageDimensions, t } =
    props;
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const camera = usePhotoViewerCamera({
    imageDimensions,
    isImageLoaded,
    sessionKey: imageSource ? `${imageSource.filePath}:${imageSource.revision}` : null,
  });

  return (
    <div className="photo-viewer-shell">
      <main
        className={`photo-viewer-stage${isDragActive ? " photo-viewer-stage--drag-active" : ""}`}
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
        <div className="photo-viewer-frame">
          {imageSource ? (
            <div
              className={`photo-viewer-viewport${camera.isInteractive ? " photo-viewer-viewport--interactive" : ""}${
                camera.isPanningImage ? " photo-viewer-viewport--panning" : ""
              }`}
              ref={camera.viewportRef}
              onWheel={camera.handleWheel}
              onPointerDown={camera.handlePointerDown}
              onPointerMove={camera.handlePointerMove}
              onPointerUp={camera.handlePointerUp}
              onPointerCancel={camera.handlePointerCancel}
            >
              <div className="photo-viewer-scene">
                <div
                  className="photo-viewer-image-frame"
                  style={
                    camera.imageWidth && camera.imageHeight
                      ? {
                          width: `${camera.imageWidth}px`,
                          height: `${camera.imageHeight}px`,
                          transform: `translate(calc(-50% + ${camera.panOffset.x}px), calc(-50% + ${camera.panOffset.y}px))`,
                        }
                      : undefined
                  }
                >
                  <img
                    key={`${imageSource.resourceUri}-${imageSource.revision}`}
                    className="photo-viewer-image"
                    src={imageSource.resourceUri}
                    alt={imageSource.fileName}
                    draggable={false}
                    onLoad={(event) => {
                      onImageLoad({
                        width: event.currentTarget.naturalWidth || event.currentTarget.width,
                        height: event.currentTarget.naturalHeight || event.currentTarget.height,
                      });
                    }}
                    onError={onImageError}
                  />
                </div>
              </div>
            </div>
          ) : (
            <button
              className="photo-viewer-empty"
              type="button"
              onClick={() => void onOpenFile()}
              aria-label={t("photo-viewer.viewer.emptyPrompt")}
            >
              {isDragActive ? t("photo-viewer.viewer.dragPrompt") : t("photo-viewer.viewer.emptyPrompt")}
            </button>
          )}
        </div>

        {isResolving || (imageSource && !isImageLoaded) ? (
          <div className="photo-viewer-overlay">
            <div className="photo-viewer-overlay__text">{t("photo-viewer.viewer.loading")}</div>
          </div>
        ) : null}

        <div className="photo-viewer-chrome">
          {feedback ? <div className={`photo-viewer-feedback photo-viewer-feedback--${feedback.tone}`}>{feedback.message}</div> : null}

          <PhotoViewerDock
            isImageReady={Boolean(imageSource && isImageLoaded)}
            isSaving={isSaving}
            zoomMode={camera.zoomMode}
            manualScale={camera.manualScale}
            onOpenFile={onOpenFile}
            onSaveImage={onSaveImage}
            onZoom={camera.handleZoom}
            onFit={camera.setFitMode}
            onActualSize={camera.setActualSize}
            t={t}
          />
        </div>
      </main>
    </div>
  );
}
