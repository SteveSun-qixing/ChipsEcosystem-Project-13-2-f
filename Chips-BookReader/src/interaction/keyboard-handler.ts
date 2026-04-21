import type { InteractionCallbacks, InteractionIntent } from "./types";

function isEditableTarget(target: Element | null): boolean {
  const tagName = target?.tagName?.toLowerCase();
  const isContentEditable =
    typeof target?.hasAttribute === "function" && target.hasAttribute("contenteditable");
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    isContentEditable
  );
}

export class KeyboardHandler {
  public constructor(private readonly callbacks: InteractionCallbacks) {}

  public attach(target: Window | Document): () => void {
    const handleKeyDown: EventListener = (event) => {
      const keyboardEvent = event as KeyboardEvent;
      const intent = this.resolveIntent(keyboardEvent);
      if (intent.type === "none") {
        return;
      }

      keyboardEvent.preventDefault();

      switch (intent.type) {
        case "navigate":
          this.callbacks.onNavigate(intent.direction);
          return;
        case "navigate-boundary":
          this.callbacks.onNavigateBoundary(intent.boundary);
          return;
        case "toggle-chrome":
          this.callbacks.onToggleChrome();
          return;
        case "close-panel":
          this.callbacks.onClosePanel();
          return;
        case "adjust-font":
          this.callbacks.onAdjustFont(intent.delta);
          return;
        case "adjust-width":
          this.callbacks.onAdjustWidth(intent.delta);
          return;
        default:
          return;
      }
    };

    target.addEventListener("keydown", handleKeyDown);
    return () => {
      target.removeEventListener("keydown", handleKeyDown);
    };
  }

  public resolveIntent(event: KeyboardEvent): InteractionIntent {
    if (isEditableTarget(event.target as Element | null)) {
      return { type: "none" };
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return { type: "none" };
    }

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        return { type: "navigate", direction: "previous" };
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
        return { type: "navigate", direction: "next" };
      case " ":
        return { type: "navigate", direction: event.shiftKey ? "previous" : "next" };
      case "Home":
        return { type: "navigate-boundary", boundary: "start" };
      case "End":
        return { type: "navigate-boundary", boundary: "end" };
      case "[":
        return { type: "adjust-font", delta: -0.1 };
      case "]":
        return { type: "adjust-font", delta: 0.1 };
      case "-":
      case "_":
        return { type: "adjust-width", delta: -40 };
      case "=":
      case "+":
        return { type: "adjust-width", delta: 40 };
      case "Escape":
        return { type: "close-panel" };
      default:
        return { type: "none" };
    }
  }
}
