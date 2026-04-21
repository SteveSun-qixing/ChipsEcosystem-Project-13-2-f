import { resolveEventTargetElement } from "../utils/dom";
import type { InteractionCallbacks, InteractionRuntime } from "./types";

function isInteractiveElement(element: Element | null): boolean {
  return Boolean(element?.closest("a[href], button, input, textarea, select, label, summary, audio, video"));
}

export class ClickHandler {
  public constructor(
    private readonly callbacks: InteractionCallbacks,
    private readonly runtime: InteractionRuntime,
  ) {}

  public attach(target: Document): () => void {
    const handleClick = (event: MouseEvent) => {
      const element = resolveEventTargetElement(event.target);
      const link = element?.closest("a[href]");

      if (link) {
        const explicitTarget = link.getAttribute("data-epub-target");
        const href = link.getAttribute("href")?.trim() ?? "";

        if (explicitTarget) {
          event.preventDefault();
          const [path, fragment] = explicitTarget.split("#");
          this.callbacks.onEpubLink(path, fragment || undefined);
          return;
        }

        if (
          href.startsWith("http:") ||
          href.startsWith("https:") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:")
        ) {
          event.preventDefault();
          this.callbacks.onOpenLink(href, true);
        }
        return;
      }

      if (isInteractiveElement(element)) {
        return;
      }

      const hasSelection = Boolean(target.getSelection?.()?.toString().trim());
      if (hasSelection) {
        return;
      }

      const width = target.documentElement.clientWidth || target.defaultView?.innerWidth || 1;
      const height = target.documentElement.clientHeight || target.defaultView?.innerHeight || 1;
      const xRatio = event.clientX / width;
      const yRatio = event.clientY / height;

      if (yRatio < 0.08 || yRatio > 0.92) {
        return;
      }

      if (xRatio <= 0.26) {
        this.callbacks.onNavigate("previous");
        return;
      }

      if (xRatio >= 0.74) {
        this.callbacks.onNavigate("next");
        return;
      }

      if (this.runtime.hasActivePanel()) {
        this.callbacks.onClosePanel();
        return;
      }

      this.callbacks.onToggleChrome();
    };

    target.addEventListener("click", handleClick);
    return () => {
      target.removeEventListener("click", handleClick);
    };
  }
}
