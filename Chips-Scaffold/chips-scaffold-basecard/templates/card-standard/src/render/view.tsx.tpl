import React, { useEffect, useState } from "react";
import {
  ChipsBox,
  ChipsButton,
  ChipsStack,
  ChipsText,
} from "@chips/component-library";
import type { BasecardOpenResourceInput } from "../index";
import type { BasecardConfig } from "../schema/card-config";
import { createBasecardText } from "../shared/i18n";

export const VIEW_STYLE_TEXT = `
.chips-basecard {
  width: 100%;
}

.chips-basecard,
.chips-basecard * {
  box-sizing: border-box;
}

.chips-basecard__title {
  margin: 0;
}

.chips-basecard__body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chips-basecard__resource,
.chips-basecard__resource-path {
  min-width: 0;
}

.chips-basecard__resource-path {
  overflow-wrap: anywhere;
}
`;

export interface BasecardViewProps {
  config: BasecardConfig;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  openResource?: (input: BasecardOpenResourceInput) => void;
}

type ResourcePreviewState = {
  status: "idle" | "resolving" | "ready" | "error";
  url?: string;
};

export function BasecardView({
  config,
  resolveResourceUrl,
  releaseResourceUrl,
  openResource,
}: BasecardViewProps) {
  const t = createBasecardText(config.locale);
  const resourcePath = config.resource_path;
  const [resourcePreview, setResourcePreview] = useState<ResourcePreviewState>({
    status: resourcePath ? "resolving" : "idle",
  });

  useEffect(() => {
    if (!resourcePath) {
      setResourcePreview({ status: "idle" });
      return undefined;
    }

    const activeResourcePath = resourcePath;
    let disposed = false;
    let resolvedByHost = false;
    setResourcePreview({ status: "resolving" });

    async function resolvePreviewUrl(): Promise<void> {
      try {
        const url = resolveResourceUrl
          ? await resolveResourceUrl(activeResourcePath)
          : activeResourcePath;
        resolvedByHost = Boolean(resolveResourceUrl);
        if (disposed) {
          if (resolvedByHost) {
            await releaseResourceUrl?.(activeResourcePath);
          }
          return;
        }
        setResourcePreview({ status: "ready", url });
      } catch {
        if (!disposed) {
          setResourcePreview({ status: "error" });
        }
      }
    }

    void resolvePreviewUrl();

    return () => {
      disposed = true;
      if (resolvedByHost) {
        void releaseResourceUrl?.(activeResourcePath);
      }
    };
  }, [releaseResourceUrl, resolveResourceUrl, resourcePath]);

  function handleOpenResource(): void {
    if (!resourcePath || !openResource) {
      return;
    }

    const input: BasecardOpenResourceInput = {
      resourceId: resourcePath,
      title: config.title,
      payload: {
        cardType: config.card_type,
        resourcePath,
      },
    };

    openResource(input);
  }

  return (
    <ChipsBox
      as="article"
      className="chips-basecard"
      data-card-type={config.card_type}
      aria-label={t("basecard.view.ariaLabel", { title: config.title })}
    >
      <ChipsStack
        className="chips-basecard__content"
        gap="var(--chips-comp-basecard-content-gap, var(--chips-sys-space-2))"
      >
        <ChipsText
          as="div"
          className="chips-basecard__title"
          role="heading"
          aria-level={2}
          text={config.title}
          emphasis="strong"
        />
        <ChipsText
          as="div"
          className="chips-basecard__body"
          text={config.body}
          tone="muted"
        />
        {resourcePath ? (
          <ChipsStack
            className="chips-basecard__resource"
            gap="var(--chips-comp-basecard-resource-gap, var(--chips-sys-space-2))"
            data-resource-state={resourcePreview.status}
          >
            <ChipsText
              as="span"
              textKey="basecard.resource.previewLabel"
              i18n={t}
              tone="muted"
            />
            <ChipsText
              as="code"
              className="chips-basecard__resource-path"
              text={resourcePath}
              emphasis="code"
            />
            {resourcePreview.status === "resolving" ? (
              <ChipsText
                as="span"
                textKey="basecard.resource.resolving"
                i18n={t}
                tone="muted"
              />
            ) : null}
            {resourcePreview.status === "error" ? (
              <ChipsText
                as="span"
                textKey="basecard.resource.resolveFailed"
                i18n={t}
                tone="error"
              />
            ) : null}
            {openResource ? (
              <ChipsButton
                type="button"
                onPress={handleOpenResource}
              >
                {t("basecard.resource.openAction")}
              </ChipsButton>
            ) : null}
          </ChipsStack>
        ) : null}
      </ChipsStack>
    </ChipsBox>
  );
}
