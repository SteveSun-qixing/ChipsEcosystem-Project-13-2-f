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
    onNodeError(
      frame: HTMLIFrameElement,
      handler: (payload: CompositeNodeError) => void,
    ): () => void;
    onFatalError(frame: HTMLIFrameElement, handler: (error: import("../types/errors").StandardError) => void): () => void;
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

        const frame = document.createElement("iframe");
        frame.setAttribute("sandbox", "allow-same-origin allow-scripts allow-forms");
        frame.setAttribute("loading", "lazy");
        frame.title = cardName ?? view.title ?? "Card Cover";
        frame.srcdoc = view.body;

        return {
          frame,
          origin: window.location.origin,
        };
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

        const frame = document.createElement("iframe");
        frame.setAttribute("sandbox", "allow-same-origin allow-scripts allow-forms");
        frame.setAttribute("loading", "lazy");
        frame.title = view.title ?? "Card";
        frame.srcdoc = view.body;

        return {
          frame,
          origin: window.location.origin,
        };
      },
      onReady(frame, handler) {
        return subscribeToCompositeEvent(frame, "chips.composite:ready", handler);
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
  };
}

function subscribeToCompositeEvent<T = void>(
  frame: HTMLIFrameElement,
  type: string,
  handler: (payload: T) => void,
): () => void {
  if (typeof window === "undefined") {
    throw createError(
      "RUNTIME_ENV_UNSUPPORTED",
      "Composite window events require a DOM environment.",
    );
  }

  const contentWindow = frame.contentWindow;
  const expectedOrigin = window.location.origin;

  const listener = (event: MessageEvent) => {
    if (!event || event.source !== contentWindow) return;
    if (event.origin !== expectedOrigin) return;
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
