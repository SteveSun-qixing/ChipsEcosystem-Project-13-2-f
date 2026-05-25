export type CardViewerSceneId = "empty" | "document-file" | "hosted-document";

export interface CardViewerSceneDefinition {
  id: CardViewerSceneId;
  titleKey: string;
  descriptionKey: string;
}

export const sceneDefinitions: CardViewerSceneDefinition[] = [
  {
    id: "empty",
    titleKey: "card-viewer.dropzone.title",
    descriptionKey: "card-viewer.dropzone.description",
  },
  {
    id: "document-file",
    titleKey: "card-viewer.viewer.documentTitle",
    descriptionKey: "card-viewer.viewer.documentDescription",
  },
  {
    id: "hosted-document",
    titleKey: "card-viewer.viewer.hostedDocumentTitle",
    descriptionKey: "card-viewer.viewer.hostedDocumentDescription",
  },
];

export const defaultSceneDefinition = sceneDefinitions[0];

export function isCardViewerSceneId(sceneId: string): sceneId is CardViewerSceneId {
  return sceneDefinitions.some((scene) => scene.id === sceneId);
}

export function getSceneDefinition(sceneId: string | null | undefined): CardViewerSceneDefinition {
  if (sceneId && isCardViewerSceneId(sceneId)) {
    return sceneDefinitions.find((scene) => scene.id === sceneId) ?? defaultSceneDefinition;
  }

  return defaultSceneDefinition;
}

export function getSceneIdForTarget(target: { kind: "file" | "document" } | null): CardViewerSceneId {
  if (!target) {
    return "empty";
  }

  return target.kind === "document" ? "hosted-document" : "document-file";
}
