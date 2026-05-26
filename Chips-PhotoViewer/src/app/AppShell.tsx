import React from "react";
import { ChipsCommandProvider } from "@chips/component-library";
import { PhotoViewerStage } from "../components/PhotoViewerStage";
import { usePhotoViewerCommands } from "../commands/usePhotoViewerCommands";
import { useAppRuntime } from "./AppRuntimeProvider";

export function AppShell(): React.ReactElement {
  const runtime = useAppRuntime();
  const commands = usePhotoViewerCommands();
  const commandMenuDescriptors = React.useMemo(
    () => [
      { menuId: "file", label: runtime.t("photo-viewer.commands.menu.file") },
      { menuId: "view", label: runtime.t("photo-viewer.commands.menu.view") },
      { menuId: "navigate", label: runtime.t("photo-viewer.commands.menu.navigate") },
    ],
    [runtime],
  );

  return (
    <ChipsCommandProvider
      adapter={commands.adapter}
      commands={commands.commands}
      i18n={runtime.t}
      query={{ includeDisabled: true }}
    >
      <div
        data-chips-app={runtime.environment.appId}
        data-chips-scene={runtime.activeSceneId}
        data-chips-surface-kind={runtime.environment.surfaceKind}
        className="photo-viewer-app"
      >
        <PhotoViewerStage
          imageSource={runtime.imageSource}
          imageDimensions={runtime.imageDimensions}
          isImageLoaded={runtime.isImageLoaded}
          isResolving={runtime.isResolving}
          isSaving={runtime.isSaving}
          feedback={runtime.feedback}
          onOpenFile={runtime.openFile}
          onSaveImage={runtime.saveImage}
          onPreviousImage={runtime.previousImage}
          onNextImage={runtime.nextImage}
          onDropFile={runtime.dropFile}
          onImageLoad={runtime.handleImageLoad}
          onImageError={runtime.handleImageError}
          sequenceCount={runtime.imageTarget?.images.length ?? 0}
          currentImageIndex={runtime.currentImageIndex}
          commandAdapter={commands.adapter}
          commandViews={commands.commands}
          commandI18n={runtime.t}
          commandInvocationContext={commands.invocationContext}
          commandMenuDescriptors={commandMenuDescriptors}
          commandRegistrationPhase={commands.phase}
          commandRegistrationErrorCode={commands.errorCode}
          lastInvokedCommand={commands.lastInvoked}
          t={runtime.t}
        />
      </div>
    </ChipsCommandProvider>
  );
}
