import React, { useRef, useState } from "react";
import {
  ChipsMenuBar,
  ChipsToolbar,
  type ChipsCommandAdapter,
  type ChipsCommandProviderProps,
  type ChipsCommandView,
} from "@chips/component-library";
import type { CommandInvocationContext } from "chips-sdk";
import {
  PHOTO_VIEWER_COMMAND_HANDLER_IDS,
  type PhotoViewerCommandStatus,
} from "../commands/photo-viewer-commands";
import { usePhotoViewerCamera } from "../hooks/usePhotoViewerCamera";
import type { ImageDimensions } from "../utils/image-viewer";

interface ImageSource {
  sourceId: string;
  filePath?: string;
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
  onPreviousImage: () => void;
  onNextImage: () => void;
  onDropFile: (file: File | null) => void | Promise<void>;
  onImageLoad: (dimensions: ImageDimensions) => void;
  onImageError: () => void;
  imageDimensions: ImageDimensions | null;
  sequenceCount: number;
  currentImageIndex: number;
  commandAdapter?: ChipsCommandAdapter;
  commandViews?: ChipsCommandView[];
  commandI18n?: ChipsCommandProviderProps["i18n"];
  commandInvocationContext?: CommandInvocationContext;
  commandMenuDescriptors?: Array<{ menuId: string; label: string }>;
  commandRegistrationPhase?: "idle" | "registering" | "ready" | "error";
  commandRegistrationErrorCode?: string | null;
  lastInvokedCommand?: PhotoViewerCommandStatus | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PhotoViewerCommandDock(props: {
  sequenceCount: number;
  currentImageIndex: number;
  commandAdapter?: ChipsCommandAdapter;
  commandViews: ChipsCommandView[];
  commandI18n?: ChipsCommandProviderProps["i18n"];
  commandInvocationContext?: CommandInvocationContext;
  commandMenuDescriptors: Array<{ menuId: string; label: string }>;
  commandRegistrationPhase: "idle" | "registering" | "ready" | "error";
  commandRegistrationErrorCode: string | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const {
    sequenceCount,
    currentImageIndex,
    commandAdapter,
    commandViews,
    commandI18n,
    commandInvocationContext,
    commandMenuDescriptors,
    commandRegistrationPhase,
    commandRegistrationErrorCode,
    t,
  } = props;
  const hasSequence = sequenceCount > 1;

  return (
    <div className="photo-viewer-command-dock" data-command-phase={commandRegistrationPhase}>
      <ChipsMenuBar
        adapter={commandAdapter}
        commands={commandViews}
        menus={commandMenuDescriptors}
        i18n={commandI18n}
        ariaLabel={t("photo-viewer.commands.menu.ariaLabel")}
        invocationContext={commandInvocationContext}
        disabled={commandRegistrationPhase === "error"}
      />
      <ChipsToolbar
        adapter={commandAdapter}
        commands={commandViews}
        toolbarId="viewer"
        i18n={commandI18n}
        ariaLabel={t("photo-viewer.commands.toolbar.ariaLabel")}
        invocationContext={commandInvocationContext}
        disabled={commandRegistrationPhase === "error"}
      />
      {hasSequence ? (
        <span className="photo-viewer-sequence" aria-live="polite">
          {t("photo-viewer.viewer.sequencePosition", {
            current: currentImageIndex + 1,
            total: sequenceCount,
          })}
        </span>
      ) : null}
      {commandRegistrationErrorCode ? (
        <span role="status" className="photo-viewer-command-status">
          {commandRegistrationErrorCode}
        </span>
      ) : null}
    </div>
  );
}

export function PhotoViewerStage(props: PhotoViewerStageProps): React.ReactElement {
  const {
    imageSource,
    isImageLoaded,
    isResolving,
    isSaving,
    feedback,
    onOpenFile,
    onSaveImage,
    onPreviousImage,
    onNextImage,
    onDropFile,
    onImageLoad,
    onImageError,
    imageDimensions,
    sequenceCount,
    currentImageIndex,
    commandAdapter,
    commandViews = [],
    commandI18n,
    commandInvocationContext,
    commandMenuDescriptors = [],
    commandRegistrationPhase = "idle",
    commandRegistrationErrorCode = null,
    lastInvokedCommand = null,
    t,
  } = props;
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const handledInvocationRef = useRef<string | null>(null);
  const camera = usePhotoViewerCamera({
    imageDimensions,
    isImageLoaded,
    sessionKey: imageSource ? `${imageSource.sourceId}:${imageSource.revision}` : null,
  });

  React.useEffect(() => {
    if (!lastInvokedCommand) {
      return;
    }

    const invocationKey =
      lastInvokedCommand.invocationId ??
      `${lastInvokedCommand.commandId}:${lastInvokedCommand.source}`;
    if (handledInvocationRef.current === invocationKey) {
      return;
    }
    handledInvocationRef.current = invocationKey;

    switch (lastInvokedCommand.handlerId) {
      case PHOTO_VIEWER_COMMAND_HANDLER_IDS.openFile:
        void onOpenFile();
        break;
      case PHOTO_VIEWER_COMMAND_HANDLER_IDS.saveImage:
        void onSaveImage();
        break;
      case PHOTO_VIEWER_COMMAND_HANDLER_IDS.previousImage:
        onPreviousImage();
        break;
      case PHOTO_VIEWER_COMMAND_HANDLER_IDS.nextImage:
        onNextImage();
        break;
      case PHOTO_VIEWER_COMMAND_HANDLER_IDS.zoomOut:
        camera.handleZoom("out");
        break;
      case PHOTO_VIEWER_COMMAND_HANDLER_IDS.zoomIn:
        camera.handleZoom("in");
        break;
      case PHOTO_VIEWER_COMMAND_HANDLER_IDS.fitToWindow:
        camera.setFitMode();
        break;
      case PHOTO_VIEWER_COMMAND_HANDLER_IDS.actualSize:
        camera.setActualSize();
        break;
      default:
        break;
    }
  }, [
    camera,
    lastInvokedCommand,
    onNextImage,
    onOpenFile,
    onPreviousImage,
    onSaveImage,
  ]);

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
              role="group"
              aria-label={t("photo-viewer.viewer.viewportLabel")}
              tabIndex={0}
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
          {feedback ? (
            <div
              className={`photo-viewer-feedback photo-viewer-feedback--${feedback.tone}`}
              role={feedback.tone === "error" ? "alert" : "status"}
              aria-live={feedback.tone === "error" ? "assertive" : "polite"}
            >
              {feedback.message}
            </div>
          ) : null}

          <PhotoViewerCommandDock
            sequenceCount={sequenceCount}
            currentImageIndex={currentImageIndex}
            commandAdapter={commandAdapter}
            commandViews={commandViews}
            commandI18n={commandI18n}
            commandInvocationContext={commandInvocationContext}
            commandMenuDescriptors={commandMenuDescriptors}
            commandRegistrationPhase={commandRegistrationPhase}
            commandRegistrationErrorCode={commandRegistrationErrorCode}
            t={t}
          />
        </div>
      </main>
    </div>
  );
}
