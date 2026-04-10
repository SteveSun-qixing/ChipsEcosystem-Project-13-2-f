import React, { useEffect, useRef, useState } from "react";
import type { CardEditorChangePayload, CardEditorErrorPayload, CardEditorResourceBridge, Client } from "chips-sdk";
import { normalizeBasecardConfig, type RichTextBaseCardConfig } from "../lib/richtext-card";

interface EditorFrameProps {
  client: Client;
  sessionKey: string;
  initialConfig: RichTextBaseCardConfig;
  resources: CardEditorResourceBridge;
  loadingLabel: string;
  errorLabel?: string;
  onReady?: () => void;
  onChange: (nextConfig: RichTextBaseCardConfig, payload: CardEditorChangePayload) => void;
  onError: (payload: CardEditorErrorPayload) => void;
}

export function EditorFrame(props: EditorFrameProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(props.onChange);
  const onErrorRef = useRef(props.onError);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);

  useEffect(() => {
    onErrorRef.current = props.onError;
  }, [props.onError]);

  useEffect(() => {
    let released = false;
    let disposeReady = () => undefined;
    let disposeChange = () => undefined;
    let disposeError = () => undefined;
    let disposeRender: (() => Promise<void>) | null = null;

    const host = hostRef.current;
    if (!host) {
      return;
    }

    host.innerHTML = "";
    setStatus("loading");

    void props.client.card.editorPanel.render({
      cardType: "base.richtext",
      baseCardId: props.sessionKey,
      initialConfig: props.initialConfig,
      resources: props.resources,
    }).then((result) => {
      if (released) {
        void result.dispose();
        return;
      }

      result.frame.className = "rte-editor__iframe";
      host.appendChild(result.frame);
      disposeRender = result.dispose;

      disposeReady = props.client.card.editorPanel.onReady(result.frame, () => {
        setStatus("ready");
        props.onReady?.();
      });

      disposeChange = props.client.card.editorPanel.onChange(result.frame, (payload) => {
        onChangeRef.current(normalizeBasecardConfig(payload.config), payload);
      });

      disposeError = props.client.card.editorPanel.onError(result.frame, (payload) => {
        setStatus("error");
        onErrorRef.current(payload);
      });
    }).catch((error) => {
      if (released) {
        return;
      }

      setStatus("error");
      onErrorRef.current({
        cardType: "base.richtext",
        pluginId: "chips.basecard.richtext",
        message: error instanceof Error ? error.message : String(error),
        code: "EDITOR_PANEL_RENDER_FAILED",
      });
    });

    return () => {
      released = true;
      disposeReady();
      disposeChange();
      disposeError();
      if (disposeRender) {
        void disposeRender();
      }
    };
  }, [props.client, props.initialConfig, props.resources, props.sessionKey]);

  return (
    <div className="rte-editor">
      <div ref={hostRef} className="rte-editor__host" />
      {status === "loading" ? <div className="rte-editor__overlay">{props.loadingLabel}</div> : null}
      {status === "error" ? (
        <div className="rte-editor__overlay rte-editor__overlay--error">{props.errorLabel ?? props.loadingLabel}</div>
      ) : null}
    </div>
  );
}
