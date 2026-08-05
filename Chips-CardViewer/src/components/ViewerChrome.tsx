import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import type { Client } from "chips-sdk";
import "./ViewerChrome.css";

export interface ViewerChromeAction {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface ViewerChromeState {
  title?: string;
  metaLines: string[];
  back: {
    label: string;
    enabled: boolean;
    handledByPlugin?: boolean;
  };
  actions: ViewerChromeAction[];
  safeBlockStart: number;
}

interface ViewerChromeContextValue {
  state: ViewerChromeState;
  actions: {
    trigger: (actionId: string) => void;
  };
  meta: {
    externalChrome: boolean;
  };
}

const ViewerChromeContext = createContext<ViewerChromeContextValue | null>(null);

interface ViewerChromeProviderProps {
  client: Pick<Client, "events">;
  state: ViewerChromeState;
  externalChrome: boolean;
  onBack: () => void;
  onAction?: (actionId: string) => void;
  children: React.ReactNode;
}

function useViewerChrome() {
  const value = useContext(ViewerChromeContext);
  if (!value) {
    throw new Error("ViewerChrome components must be used inside ViewerChrome.Provider.");
  }
  return value;
}

function normalizeActionPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const actionId = (payload as { actionId?: unknown }).actionId;
  return typeof actionId === "string" && actionId.trim().length > 0 ? actionId.trim() : null;
}

function ViewerChromeProvider({
  client,
  state,
  externalChrome,
  onBack,
  onAction,
  children,
}: ViewerChromeProviderProps) {
  const trigger = useCallback(
    (actionId: string) => {
      if (actionId === "back" && state.back.enabled) {
        onBack();
        return;
      }
      onAction?.(actionId);
    },
    [onAction, onBack, state.back.enabled],
  );

  useEffect(() => {
    if (!externalChrome) {
      return;
    }

    void client.events.emit("plugin.chrome.update", {
      title: state.title,
      metaLines: state.metaLines,
      back: state.back,
      actions: state.actions,
      safeBlockStart: state.safeBlockStart,
    }).catch(() => undefined);
  }, [client, externalChrome, state]);

  useEffect(() => {
    if (!externalChrome) {
      return undefined;
    }

    const unsubscribe = client.events.on("plugin.chrome.action", (payload: unknown) => {
      const actionId = normalizeActionPayload(payload);
      if (actionId) {
        trigger(actionId);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [client, externalChrome, trigger]);

  const value = useMemo<ViewerChromeContextValue>(
    () => ({
      state,
      actions: { trigger },
      meta: { externalChrome },
    }),
    [externalChrome, state, trigger],
  );

  return (
    <ViewerChromeContext.Provider value={value}>
      {children}
    </ViewerChromeContext.Provider>
  );
}

function ViewerChromeLayer() {
  const {
    state,
    actions: { trigger },
    meta,
  } = useViewerChrome();

  if (meta.externalChrome || (!state.title && !state.back.enabled && state.actions.length === 0)) {
    return null;
  }

  return (
    <div className="viewer-chrome" data-chips-app="card-viewer.chrome">
      <div className="viewer-chrome__floating-layer">
        {state.back.enabled ? (
          <button
            type="button"
            className="viewer-chrome__button viewer-chrome__back"
            onClick={() => trigger("back")}
            aria-label={state.back.label}
            title={state.back.label}
          >
            <span aria-hidden="true">‹</span>
          </button>
        ) : null}

        {state.title ? (
          <aside className="viewer-chrome__pill" aria-label={state.title}>
            <h1>{state.title}</h1>
            {state.metaLines.length > 0 ? (
              <div className="viewer-chrome__meta">
                {state.metaLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            ) : null}
          </aside>
        ) : null}

        {state.actions.length > 0 ? (
          <div className="viewer-chrome__actions">
            {state.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="viewer-chrome__button"
                disabled={action.disabled}
                onClick={() => trigger(action.id)}
                aria-label={action.label}
                title={action.label}
              >
                <span
                  aria-hidden="true"
                  className={`viewer-chrome__action-icon${action.icon ? ` viewer-chrome__action-icon--${action.icon}` : ""}`}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const ViewerChrome = {
  Provider: ViewerChromeProvider,
  Layer: ViewerChromeLayer,
};
