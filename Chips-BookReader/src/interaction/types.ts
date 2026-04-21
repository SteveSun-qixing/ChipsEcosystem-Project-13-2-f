import type { DocumentController } from "../engine/document-controller";
import type { PageDirection, ReadingBoundary, ReadingMode } from "../engine/types";

export type InteractionIntent =
  | { type: "navigate"; direction: PageDirection }
  | { type: "navigate-boundary"; boundary: ReadingBoundary }
  | { type: "toggle-chrome" }
  | { type: "close-panel" }
  | { type: "open-link"; href: string; isExternal: boolean }
  | { type: "epub-link"; path: string; fragment?: string }
  | { type: "adjust-font"; delta: number }
  | { type: "adjust-width"; delta: number }
  | { type: "none" };

export interface InteractionCallbacks {
  onNavigate: (direction: PageDirection) => void;
  onNavigateBoundary: (boundary: ReadingBoundary) => void;
  onToggleChrome: () => void;
  onClosePanel: () => void;
  onOpenLink: (href: string, isExternal: boolean) => void;
  onEpubLink: (path: string, fragment?: string) => void;
  onAdjustFont: (delta: number) => void;
  onAdjustWidth: (delta: number) => void;
}

export interface InteractionRuntime {
  getReadingMode: () => ReadingMode;
  getController: () => DocumentController | null;
  hasActivePanel: () => boolean;
  canNavigate: () => boolean;
  lockNavigation: (durationMs?: number) => void;
}
