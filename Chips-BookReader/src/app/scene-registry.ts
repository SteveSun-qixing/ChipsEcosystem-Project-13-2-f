import type { EpubBook } from "../domain/epub/types";
import type { ReaderFeedback } from "../utils/book-reader";

export type BookReaderSceneId = "empty" | "reader-document" | "reader-error";

export interface BookReaderSceneDefinition {
  id: BookReaderSceneId;
  titleKey: string;
  descriptionKey: string;
}

export const sceneDefinitions: BookReaderSceneDefinition[] = [
  {
    id: "empty",
    titleKey: "book-reader.empty.title",
    descriptionKey: "book-reader.empty.description",
  },
  {
    id: "reader-document",
    titleKey: "book-reader.labels.appName",
    descriptionKey: "book-reader.empty.supportedFormat",
  },
  {
    id: "reader-error",
    titleKey: "book-reader.errors.openFailed",
    descriptionKey: "book-reader.empty.supportedFormat",
  },
];

export const defaultSceneDefinition = sceneDefinitions[0];

export function isBookReaderSceneId(sceneId: string): sceneId is BookReaderSceneId {
  return sceneDefinitions.some((scene) => scene.id === sceneId);
}

export function getSceneDefinition(sceneId: string | null | undefined): BookReaderSceneDefinition {
  if (sceneId && isBookReaderSceneId(sceneId)) {
    return sceneDefinitions.find((scene) => scene.id === sceneId) ?? defaultSceneDefinition;
  }

  return defaultSceneDefinition;
}

export function getSceneIdForReaderState(input: {
  book: EpubBook | null;
  feedback: ReaderFeedback | null;
}): BookReaderSceneId {
  if (input.book) {
    return "reader-document";
  }

  return input.feedback?.tone === "error" ? "reader-error" : "empty";
}
