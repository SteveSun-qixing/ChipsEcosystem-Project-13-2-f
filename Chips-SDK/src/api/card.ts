import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface CardDocument {
  // 这里使用宽松类型，具体结构由 Host 侧 schema 控制
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string; code?: string }>;
}

export interface RenderViewport {
  width?: number;
  height?: number;
  scrollTop?: number;
  scrollLeft?: number;
}

export type RenderTarget = "app-root" | "card-iframe" | "module-slot" | "offscreen-render";

export interface CardRenderOptions {
  target?: RenderTarget;
  viewport?: RenderViewport;
  verifyConsistency?: boolean;
  /**
   * 仅在复合卡片窗口场景下使用的渲染模式。
   * - view：正常查看模式；
   * - preview：预览模式（例如编辑器右侧预览）。
   *
   * 普通 `card.render` 调用可以忽略该字段。
   */
  mode?: CompositeMode;
}

export interface RenderNodeDiagnostic {
  nodeId: string;
  stage:
    | "node-normalize"
    | "contract-validate"
    | "theme-resolve"
    | "layout-compute"
    | "render-commit"
    | "effect-dispatch";
  code: string;
  message: string;
  details?: unknown;
}

export interface RenderConsistencyResult {
  consistent: boolean;
  hashByTarget: Record<string, string>;
  mismatches: string[];
}

export interface CardRenderView {
  title: string;
  body: string;
  contentFiles: string[];
  target: string;
  semanticHash: string;
  diagnostics?: RenderNodeDiagnostic[];
  consistency?: RenderConsistencyResult;
}

export interface CardRenderResult {
  view: CardRenderView;
}

export interface CardEditorRenderOptions {
  cardType: string;
  initialConfig?: Record<string, unknown>;
  baseCardId?: string;
}

export interface CardEditorView {
  title: string;
  body: string;
  cardType: string;
  pluginId: string;
  baseCardId?: string;
}

export interface CardEditorRenderResult {
  view: CardEditorView;
}

export interface FrameRenderResult {
  frame: HTMLIFrameElement;
  origin: string;
}

export type CompositeMode = "view" | "preview";

export interface CompositeNodeError {
  nodeId: string;
  code: string;
  message: string;
  stage?: string;
  details?: unknown;
}

export interface CompositeNodeSelectPayload {
  nodeId: string;
  cardType: string;
  pluginId?: string;
  state?: "ready" | "degraded";
  source?: string;
}

export interface CardEditorChangePayload {
  baseCardId?: string;
  cardType: string;
  pluginId: string;
  config: Record<string, unknown>;
}

export interface CardEditorErrorPayload {
  baseCardId?: string;
  cardType: string;
  pluginId: string;
  code: string;
  message: string;
}

export interface CardApi {
  parse(cardFile: string): Promise<CardDocument>;
  validate(card: CardDocument): Promise<ValidationResult>;
  render(cardFile: string, options?: CardRenderOptions): Promise<CardRenderResult>;
  coverFrame: {
    render(options: { cardFile: string; cardName?: string }): Promise<FrameRenderResult>;
  };
  compositeWindow: {
    render(options: { cardFile: string; mode?: CompositeMode }): Promise<FrameRenderResult>;
    onReady(frame: HTMLIFrameElement, handler: () => void): () => void;
    onNodeSelect(
      frame: HTMLIFrameElement,
      handler: (payload: CompositeNodeSelectPayload) => void,
    ): () => void;
    onNodeError(
      frame: HTMLIFrameElement,
      handler: (payload: CompositeNodeError) => void,
    ): () => void;
    onFatalError(frame: HTMLIFrameElement, handler: (error: import("../types/errors").StandardError) => void): () => void;
  };
  editorPanel: {
    render(options: CardEditorRenderOptions): Promise<FrameRenderResult>;
    onReady(frame: HTMLIFrameElement, handler: () => void): () => void;
    onChange(frame: HTMLIFrameElement, handler: (payload: CardEditorChangePayload) => void): () => void;
    onError(frame: HTMLIFrameElement, handler: (payload: CardEditorErrorPayload) => void): () => void;
  };
}

export function createCardApi(client: CoreClient): CardApi {
  return {
    async parse(cardFile) {
      if (!cardFile) {
        throw createError("INVALID_ARGUMENT", "card.parse: cardFile is required.");
      }
      return client.invoke("card.parse", { cardFile });
    },
    async validate(card) {
      if (!card) {
        throw createError("INVALID_ARGUMENT", "card.validate: card document is required.");
      }
      return client.invoke("card.validate", { card });
    },
    async render(cardFile, options) {
      if (!cardFile) {
        throw createError("INVALID_ARGUMENT", "card.render: cardFile is required.");
      }
      return client.invoke("card.render", { cardFile, options });
    },
    coverFrame: {
      async render({ cardFile, cardName }) {
        if (!cardFile) {
          throw createError("INVALID_ARGUMENT", "card.coverFrame.render: cardFile is required.");
        }

        const { view } = await client.invoke<{ cardFile: string; options?: CardRenderOptions }, CardRenderResult>(
          "card.render",
          {
            cardFile,
            options: {
              target: "card-iframe",
            },
          },
        );

        if (typeof document === "undefined") {
          throw createError(
            "RUNTIME_ENV_UNSUPPORTED",
            "card.coverFrame.render requires a DOM environment.",
          );
        }

        return createFrameFromView(view.body, cardName ?? view.title ?? "Card Cover");
      },
    },
    compositeWindow: {
      async render({ cardFile, mode = "view" }) {
        if (!cardFile) {
          throw createError(
            "INVALID_ARGUMENT",
            "card.compositeWindow.render: cardFile is required.",
          );
        }
        if (mode !== "view" && mode !== "preview") {
          throw createError(
            "INVALID_ARGUMENT",
            "card.compositeWindow.render: mode must be 'view' or 'preview'.",
          );
        }

        const { view } = await client.invoke<{ cardFile: string; options: CardRenderOptions }, CardRenderResult>(
          "card.render",
          {
            cardFile,
            options: {
              target: "card-iframe",
              mode,
            },
          },
        );

        if (typeof document === "undefined") {
          throw createError(
            "RUNTIME_ENV_UNSUPPORTED",
            "card.compositeWindow.render requires a DOM environment.",
          );
        }

        return createFrameFromView(view.body, view.title ?? "Card");
      },
      onReady(frame, handler) {
        return subscribeToCompositeReady(frame, handler);
      },
      onNodeSelect(frame, handler) {
        return subscribeToCompositeEvent<CompositeNodeSelectPayload>(
          frame,
          "chips.composite:node-select",
          handler,
        );
      },
      onNodeError(frame, handler) {
        return subscribeToCompositeEvent<CompositeNodeError>(
          frame,
          "chips.composite:node-error",
          handler,
        );
      },
      onFatalError(frame, handler) {
        return subscribeToCompositeEvent(
          frame,
          "chips.composite:fatal-error",
          (payload: unknown) => {
            const err = normalizeCompositeError(payload);
            handler(err);
          },
        );
      },
    },
    editorPanel: {
      async render({ cardType, initialConfig, baseCardId }) {
        if (!cardType) {
          throw createError(
            "INVALID_ARGUMENT",
            "card.editorPanel.render: cardType is required.",
          );
        }

        const { view } = await client.invoke<CardEditorRenderOptions, CardEditorRenderResult>(
          "card.renderEditor",
          {
            cardType,
            initialConfig: initialConfig ?? {},
            baseCardId,
          },
        );

        if (typeof document === "undefined") {
          throw createError(
            "RUNTIME_ENV_UNSUPPORTED",
            "card.editorPanel.render requires a DOM environment.",
          );
        }

        return createFrameFromView(view.body, view.title ?? `${cardType} Editor`);
      },
      onReady(frame, handler) {
        return subscribeToFrameMessage(frame, "chips.card-editor:ready", () => handler());
      },
      onChange(frame, handler) {
        return subscribeToFrameMessage<CardEditorChangePayload>(frame, "chips.card-editor:change", handler);
      },
      onError(frame, handler) {
        return subscribeToFrameMessage<CardEditorErrorPayload>(frame, "chips.card-editor:error", handler);
      },
    },
  };
}

function createFrameFromView(body: string, title: string): FrameRenderResult {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts allow-forms");
  frame.setAttribute("loading", "lazy");
  frame.title = title;
  frame.srcdoc = body;

  return {
    frame,
    origin: window.location.origin,
  };
}

function subscribeToCompositeReady(
  frame: HTMLIFrameElement,
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

  const disposeMessage = subscribeToCompositeEvent(frame, "chips.composite:ready", () => {
    invokeOnce();
  });

  const handleLoad = () => {
    invokeOnce();
  };

  const canListenToLoad =
    typeof (frame as { addEventListener?: unknown }).addEventListener === "function" &&
    typeof (frame as { removeEventListener?: unknown }).removeEventListener === "function";

  if (canListenToLoad) {
    frame.addEventListener("load", handleLoad);
  }

  try {
    const readyState = frame.contentDocument?.readyState;
    if (readyState === "interactive" || readyState === "complete") {
      queueMicrotask(() => {
        invokeOnce();
      });
    }
  } catch {
    // ignore cross-context access errors and rely on load/message events
  }

  return () => {
    if (canListenToLoad) {
      frame.removeEventListener("load", handleLoad);
    }
    disposeMessage();
  };
}

function subscribeToCompositeEvent<T = void>(
  frame: HTMLIFrameElement,
  type: string,
  handler: (payload: T) => void,
): () => void {
  return subscribeToFrameMessage(frame, type, handler);
}

function subscribeToFrameMessage<T = void>(
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

  const contentWindow = frame.contentWindow;
  const expectedOrigin = window.location.origin;

  const listener = (event: MessageEvent) => {
    if (!event || event.source !== contentWindow) return;
    if (event.origin !== expectedOrigin && event.origin !== "null") return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const record = data as { type?: string; payload?: unknown };
    if (record.type !== type) return;
    handler(record.payload as T);
  };

  window.addEventListener("message", listener);

  return () => {
    window.removeEventListener("message", listener);
  };
}

function normalizeCompositeError(payload: unknown): import("../types/errors").StandardError {
  const base = typeof payload === "object" && payload !== null ? (payload as any) : {};
  const code = typeof base.code === "string" ? base.code : "INTERNAL_ERROR";
  const message =
    typeof base.message === "string" ? base.message : "Composite window fatal error.";
  return {
    code,
    message,
    details: payload,
    retryable: false,
  };
}
