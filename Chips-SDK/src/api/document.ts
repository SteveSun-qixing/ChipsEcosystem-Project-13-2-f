import type {
  CompositeInteractionPolicy,
  CompositeResourceOpenPayload,
  FrameRenderResult,
} from "./card";
import { createCardApi } from "./card";
import { createBoxApi, type BoxLayoutRenderErrorPayload } from "./box";
import type { CoreClient } from "../types/client";
import { createError, type StandardError } from "../types/errors";

export type DocumentType = "card" | "box";
export type DocumentWindowMode = "view" | "preview";

export interface DocumentWindowRenderOptions {
  filePath: string;
  documentType?: DocumentType;
  mode?: DocumentWindowMode;
  interactionPolicy?: CompositeInteractionPolicy;
  layoutType?: string;
  locale?: string;
  themeId?: string;
}

export interface DocumentWindowRenderResult extends FrameRenderResult {
  documentType: DocumentType;
}

export interface DocumentWindowErrorPayload extends StandardError {
  documentType: DocumentType;
}

export interface DocumentApi {
  detectType(filePath: string): DocumentType | null;
  window: {
    render(options: DocumentWindowRenderOptions): Promise<DocumentWindowRenderResult>;
    onReady(frame: HTMLIFrameElement, handler: () => void): () => void;
    onError(frame: HTMLIFrameElement, handler: (payload: DocumentWindowErrorPayload) => void): () => void;
    onResourceOpen(
      frame: HTMLIFrameElement,
      handler: (payload: CompositeResourceOpenPayload) => void,
    ): () => void;
  };
}

const DOCUMENT_READY_EVENTS = ["chips.composite:ready", "chips.box-layout:ready"];
const DOCUMENT_CARD_FATAL_ERROR_EVENT = "chips.composite:fatal-error";
const DOCUMENT_BOX_ERROR_EVENT = "chips.box-layout:error";

export function createDocumentApi(client: CoreClient): DocumentApi {
  const cardApi = createCardApi(client);
  const boxApi = createBoxApi(client);

  return {
    detectType(filePath) {
      return detectDocumentType(filePath);
    },
    window: {
      async render(options) {
        const resolvedType = options.documentType ?? detectDocumentType(options.filePath);
        if (!resolvedType) {
          throw createError(
            "DOCUMENT_TYPE_UNSUPPORTED",
            `document.window.render: unsupported file type: ${options.filePath}`,
          );
        }

        if (resolvedType === "card") {
          const result = await cardApi.compositeWindow.render({
            cardFile: options.filePath,
            mode: options.mode === "preview" ? "preview" : "view",
            interactionPolicy: options.interactionPolicy,
          });
          return {
            ...result,
            documentType: "card" as const,
          };
        }

        const result = await boxApi.documentWindow.render({
          boxFile: options.filePath,
          layoutType: options.layoutType,
          locale: options.locale,
          themeId: options.themeId,
        });
        return {
          ...result,
          documentType: "box" as const,
        };
      },
      onReady(frame, handler) {
        return subscribeToFrameReady(frame, DOCUMENT_READY_EVENTS, handler);
      },
      onError(frame, handler) {
        const cleanupCard = subscribeToFrameMessage<unknown>(frame, DOCUMENT_CARD_FATAL_ERROR_EVENT, (payload) => {
          handler({
            ...normalizeStandardError(payload, "Composite window fatal error."),
            documentType: "card",
          });
        });
        const cleanupBox = subscribeToFrameMessage<BoxLayoutRenderErrorPayload>(frame, DOCUMENT_BOX_ERROR_EVENT, (payload) => {
          handler({
            code: typeof payload?.code === "string" ? payload.code : "BOX_LAYOUT_RENDER_FAILED",
            message: typeof payload?.message === "string" ? payload.message : "Box layout render failed.",
            details: payload,
            retryable: false,
            documentType: "box",
          });
        });
        return () => {
          cleanupCard();
          cleanupBox();
        };
      },
      onResourceOpen(frame, handler) {
        return cardApi.compositeWindow.onResourceOpen(frame, handler);
      },
    },
  };
}

function detectDocumentType(filePath: string): DocumentType | null {
  const normalized = filePath.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.endsWith(".card")) {
    return "card";
  }
  if (normalized.endsWith(".box")) {
    return "box";
  }
  return null;
}

function subscribeToFrameReady(
  frame: HTMLIFrameElement,
  eventTypes: string[],
  handler: () => void,
): () => void {
  let settled = false;
  const invokeOnce = () => {
    if (settled) {
      return;
    }
    settled = true;
    handler();
  };

  const cleanupTasks = eventTypes.map((type) => subscribeToFrameMessage(frame, type, () => invokeOnce()));
  const handleLoad = () => {
    invokeOnce();
  };

  if (typeof frame.addEventListener === "function" && typeof frame.removeEventListener === "function") {
    frame.addEventListener("load", handleLoad);
    cleanupTasks.push(() => frame.removeEventListener("load", handleLoad));
  }

  return () => {
    cleanupTasks.forEach((task) => task());
  };
}

function subscribeToFrameMessage<T>(
  frame: HTMLIFrameElement,
  type: string,
  handler: (payload: T) => void,
): () => void {
  if (typeof window === "undefined") {
    throw createError(
      "RUNTIME_ENV_UNSUPPORTED",
      "Frame events require a DOM environment.",
    );
  }

  const listener = (event: MessageEvent) => {
    if (!event || event.source !== frame.contentWindow) {
      return;
    }
    if (!isAllowedFrameOrigin(frame, event.origin)) {
      return;
    }
    const data = event.data;
    if (!data || typeof data !== "object") {
      return;
    }
    const record = data as { type?: string; payload?: unknown };
    if (record.type !== type) {
      return;
    }
    handler(record.payload as T);
  };

  window.addEventListener("message", listener);
  return () => {
    window.removeEventListener("message", listener);
  };
}

function isAllowedFrameOrigin(frame: HTMLIFrameElement, origin: string): boolean {
  if (origin === "null") {
    return true;
  }

  const allowedOrigins = new Set<string>();
  if (typeof window !== "undefined") {
    allowedOrigins.add(window.location.origin);
  }

  const frameOrigin = frame.dataset?.chipsOrigin;
  if (frameOrigin) {
    allowedOrigins.add(frameOrigin);
  }

  return allowedOrigins.has(origin);
}

function normalizeStandardError(payload: unknown, fallbackMessage: string): StandardError {
  const base = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    code: typeof base.code === "string" ? base.code : "INTERNAL_ERROR",
    message: typeof base.message === "string" ? base.message : fallbackMessage,
    details: payload,
    retryable: false,
  };
}
