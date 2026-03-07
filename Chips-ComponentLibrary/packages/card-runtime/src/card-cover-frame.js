import React from "react";
import { resolveCardCoverFrameState } from "./states.js";
import { toStandardError } from "./standard-error.js";
import { resolveIframeSandboxPolicy } from "./security-policy.js";

export function CardCoverFrame(props) {
  const {
    cardId,
    cardName,
    coverUrl,
    ratio = "4:3",
    loading = false,
    disabled = false,
    sandbox = "allow-scripts allow-same-origin",
    onOpenCard,
    onFrameReady,
    onFrameError
  } = props;

  const [frameStatus, setFrameStatus] = React.useState("idle");
  const [loadError, setLoadError] = React.useState(null);

  React.useEffect(() => {
    setFrameStatus(loading ? "loading" : "idle");
    setLoadError(null);
  }, [coverUrl, loading]);

  const state = resolveCardCoverFrameState({
    coverUrl,
    frameStatus,
    loading,
    disabled,
    loadError
  });
  const sandboxPolicy = resolveIframeSandboxPolicy(sandbox);

  const handleOpen = () => {
    if (disabled || state === "loading" || state === "error") {
      return;
    }
    if (typeof onOpenCard === "function") {
      onOpenCard(cardId);
    }
  };

  const handleLoad = () => {
    setFrameStatus("ready");
    setLoadError(null);
    if (typeof onFrameReady === "function") {
      onFrameReady(cardId);
    }
  };

  const handleError = (error) => {
    const normalized = toStandardError(error, "CARD_COVER_FRAME_LOAD_FAILED");
    setFrameStatus("error");
    setLoadError(normalized);
    if (typeof onFrameError === "function") {
      onFrameError(normalized);
    }
  };

  return React.createElement(
    "article",
    {
      "data-scope": "card-cover-frame",
      "data-part": "root",
      "data-state": state,
      "aria-disabled": disabled || undefined,
      onClick: handleOpen,
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      },
      role: "button",
      tabIndex: disabled ? -1 : 0
    },
    React.createElement(
      "div",
      {
        "data-part": "frame-container",
        "data-ratio": ratio
      },
      coverUrl
        ? React.createElement("iframe", {
            "data-part": "iframe",
            title: cardName,
            src: coverUrl,
            loading: "lazy",
            sandbox: sandboxPolicy,
            onLoad: handleLoad,
            onError: handleError
          })
        : null
    ),
    React.createElement(
      "div",
      { "data-part": "name" },
      cardName
    ),
    React.createElement(
      "div",
      { "data-part": "status", "aria-live": "polite" },
      state
    )
  );
}
