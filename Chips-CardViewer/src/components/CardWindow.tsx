import React, { useEffect, useRef, useState } from "react";
import type { FrameRenderResult } from "chips-sdk";

interface CardWindowProps {
  cardFile: string;
}

export function CardWindow({ cardFile }: CardWindowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const bridge = (window as any).chips;

    if (!bridge || !bridge.client || !bridge.client.card || !bridge.client.card.compositeWindow) {
      setError("SDK 统一卡片显示接口不可用，请确认在 Host 环境中运行并已加载 chips-sdk。");
      return;
    }

    const api = bridge.client.card.compositeWindow as {
      render: (options: { cardFile: string; mode?: "view" | "preview" }) => Promise<FrameRenderResult>;
      onReady?: (frame: HTMLIFrameElement, handler: () => void) => () => void;
      onFatalError?: (
        frame: HTMLIFrameElement,
        handler: (err: { code: string; message: string }) => void,
      ) => () => void;
    };

    const container = containerRef.current;
    if (!container) {
      setError("找不到卡片窗口容器");
      return;
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    setIsLoading(true);
    setError(null);

    api
      .render({ cardFile, mode: "view" })
      .then((result) => {
        if (cancelled) {
          return;
        }
        const frame = result.frame;
        frameRef.current = frame;
        frame.style.width = "100%";
        frame.style.height = "100%";
        frame.style.border = "none";
        container.appendChild(frame);

        if (api.onReady) {
          api.onReady(frame, () => {
            if (!cancelled) {
              setIsLoading(false);
            }
          });
        } else {
          setIsLoading(false);
        }

        if (api.onFatalError) {
          api.onFatalError(frame, (fatal) => {
            if (!cancelled) {
              setError(fatal.message || "卡片窗口发生严重错误");
            }
          });
        }
      })
      .catch((err: { code?: string; message?: string }) => {
        if (!cancelled) {
          setIsLoading(false);
          setError(err?.message || "卡片窗口渲染失败");
        }
      });

    return () => {
      cancelled = true;
      const frame = frameRef.current;
      if (frame && frame.parentElement) {
        frame.parentElement.removeChild(frame);
      }
      frameRef.current = null;
    };
  }, [cardFile]);

  return (
    <div
      data-chips-app="card-viewer.window"
      style={{
        flex: 1,
        borderRadius: 8,
        border: "1px solid var(--chips-border-subtle, rgba(255,255,255,0.24))",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            background: "rgba(0,0,0,0.4)",
          }}
        >
          正在加载卡片…
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            background: "rgba(96,0,0,0.8)",
          }}
        >
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

