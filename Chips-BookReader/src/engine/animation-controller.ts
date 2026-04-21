interface CurrentAnimation {
  cancel: () => void;
}

export interface AnimationOptions {
  duration: number;
  easing: (time: number) => number;
  minDuration: number;
  maxDuration: number;
}

export const EASING = {
  easeOutCubic: (time: number) => 1 - Math.pow(1 - time, 3),
  easeInOutCubic: (time: number) =>
    time < 0.5 ? 4 * time * time * time : 1 - Math.pow(-2 * time + 2, 3) / 2,
  easeOutBack: (time: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(time - 1, 3) + c1 * Math.pow(time - 1, 2);
  },
  linear: (time: number) => time,
} as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function writeScroll(element: Element, value: number, axis: "x" | "y", isRtl = false): void {
  const target = Math.max(0, value);
  const signedValue = axis === "x" && isRtl ? -target : target;

  if ("scrollTo" in element && typeof element.scrollTo === "function") {
    if (axis === "x") {
      element.scrollTo({ left: signedValue, behavior: "auto" });
      return;
    }

    element.scrollTo({ top: signedValue, behavior: "auto" });
    return;
  }

  const htmlElement = element as HTMLElement;
  if (axis === "x") {
    htmlElement.scrollLeft = signedValue;
    return;
  }

  htmlElement.scrollTop = signedValue;
}

export class AnimationController {
  private readonly options: AnimationOptions;
  private currentAnimation: CurrentAnimation | null = null;

  public constructor(options?: Partial<AnimationOptions>) {
    this.options = {
      duration: options?.duration ?? 280,
      easing: options?.easing ?? EASING.easeOutCubic,
      minDuration: options?.minDuration ?? 120,
      maxDuration: options?.maxDuration ?? 450,
    };
  }

  public animateScroll(params: {
    element: Element;
    from: number;
    to: number;
    axis: "x" | "y";
    isRtl?: boolean;
    onComplete?: () => void;
    onCancel?: () => void;
  }): void {
    this.cancel();

    const distance = Math.abs(params.to - params.from);
    if (distance < 2) {
      writeScroll(params.element, params.to, params.axis, params.isRtl);
      params.onComplete?.();
      return;
    }

    const duration = clamp(
      this.options.duration * Math.max(0.4, Math.min(1.3, distance / 1440)),
      this.options.minDuration,
      this.options.maxDuration,
    );
    const startTime = performance.now();
    let rafId = 0;
    let finished = false;

    const finish = (cancelled: boolean): void => {
      if (finished) {
        return;
      }

      finished = true;
      writeScroll(params.element, params.to, params.axis, params.isRtl);
      this.currentAnimation = null;

      if (cancelled) {
        params.onCancel?.();
      } else {
        params.onComplete?.();
      }
    };

    const tick = (currentTime: number) => {
      const rawProgress = Math.min(1, (currentTime - startTime) / duration);
      const easedProgress = this.options.easing(rawProgress);
      const currentValue = params.from + (params.to - params.from) * easedProgress;

      writeScroll(params.element, currentValue, params.axis, params.isRtl);

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      finish(false);
    };

    rafId = requestAnimationFrame(tick);

    this.currentAnimation = {
      cancel: () => {
        cancelAnimationFrame(rafId);
        finish(true);
      },
    };
  }

  public cancel(): void {
    this.currentAnimation?.cancel();
  }

  public isAnimating(): boolean {
    return this.currentAnimation !== null;
  }

  public destroy(): void {
    this.cancel();
  }
}
