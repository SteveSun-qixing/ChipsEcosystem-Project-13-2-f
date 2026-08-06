import React from "react";
import {
  ChipsButton,
  ChipsForm,
  ChipsIcon,
  ChipsSegmentedControl,
  ChipsTextArea,
} from "@chips/component-library";
import {
  hasFrameRegionContent,
  isSafeBoxAssetPath,
  type FrameRegionConfig,
} from "../schema/layout-config";
import type { ResolvedRuntimeResource } from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";

type LayoutMessageKey = Parameters<typeof getLayoutMessage>[1];
type FrameMode = FrameRegionConfig["mode"];

export interface FrameRegionEditorProps {
  id: string;
  region: FrameRegionConfig;
  locale?: string;
  title: string;
  preferredAssetPrefix: string;
  readBoxAsset?: (assetPath: string) => Promise<ResolvedRuntimeResource>;
  importBoxAsset?: (input: { file: File; preferredPath?: string }) => Promise<{ assetPath: string }>;
  deleteBoxAsset?: (assetPath: string) => Promise<void>;
  onChange(next: FrameRegionConfig): void;
}

const MODE_MESSAGE_KEY: Record<FrameMode, LayoutMessageKey> = {
  none: "editor.frame_mode_none",
  image: "editor.frame_mode_image",
  html: "editor.frame_mode_html",
};

function createI18nAdapter(locale: string | undefined) {
  return {
    translate(
      input: string | { key: string; params?: Record<string, string | number> },
      params?: Record<string, string | number>,
    ) {
      const key = typeof input === "string" ? input : input.key;
      const message = getLayoutMessage(locale, key as LayoutMessageKey);
      const replacements = typeof input === "string" ? params : input.params;
      if (!replacements) {
        return message;
      }
      return Object.entries(replacements).reduce(
        (current, [name, value]) => current.replace(`{${name}}`, String(value)),
        message,
      );
    },
  };
}

function sanitizeAssetFileName(name: string): string {
  const sanitized = name
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/^\.+/, "")
    .replace(/-+$/, "");
  return sanitized.length > 0 ? sanitized : "asset";
}

function buildPreferredAssetPath(prefix: string, file: File): string {
  return `${prefix}/${Date.now()}-${sanitizeAssetFileName(file.name)}`;
}

function useMountedRef(): React.MutableRefObject<boolean> {
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
}

interface ImagePreviewState {
  status: "idle" | "loading" | "ready" | "error";
  resourceUrl?: string;
}

export function FrameRegionEditor({
  id,
  region,
  locale,
  title,
  preferredAssetPrefix,
  readBoxAsset,
  importBoxAsset,
  deleteBoxAsset,
  onChange,
}: FrameRegionEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const mountedRef = useMountedRef();
  const i18n = React.useMemo(() => createI18nAdapter(locale), [locale]);
  const [errorKey, setErrorKey] = React.useState<LayoutMessageKey | undefined>();
  const [busyAction, setBusyAction] = React.useState<"import" | "delete" | undefined>();
  const [dragging, setDragging] = React.useState(false);
  const [preview, setPreview] = React.useState<ImagePreviewState>({ status: "idle" });

  const hasImage = region.mode === "image";
  const hasImageAsset = hasImage && typeof region.assetPath === "string" && region.assetPath.trim().length > 0;
  const hasBridge = Boolean(importBoxAsset && readBoxAsset && deleteBoxAsset);

  React.useEffect(() => {
    if (!hasImage || !hasImageAsset) {
      setPreview({ status: "idle" });
      return;
    }

    if (!readBoxAsset) {
      setPreview({ status: "error" });
      return;
    }

    let cancelled = false;
    setPreview({ status: "loading" });
    void readBoxAsset(region.assetPath!)
      .then((resource) => {
        if (cancelled) {
          return;
        }
        if (typeof resource.resourceUrl === "string" && resource.resourceUrl.trim().length > 0) {
          setPreview({
            status: "ready",
            resourceUrl: resource.resourceUrl,
          });
          return;
        }
        setPreview({ status: "error" });
      })
      .catch(() => {
        if (!cancelled) {
          setPreview({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasImage, hasImageAsset, readBoxAsset, region.assetPath]);

  const setErrorWhenMounted = React.useCallback((nextKey: LayoutMessageKey | undefined) => {
    if (mountedRef.current) {
      setErrorKey(nextKey);
    }
  }, [mountedRef]);

  const deleteExistingAsset = React.useCallback(async (assetPath: string | undefined): Promise<boolean> => {
    if (!assetPath) {
      return true;
    }
    if (!deleteBoxAsset) {
      setErrorWhenMounted("editor.asset_bridge_missing");
      return false;
    }

    setBusyAction("delete");
    try {
      await deleteBoxAsset(assetPath);
      setErrorWhenMounted(undefined);
      return true;
    } catch {
      setErrorWhenMounted("editor.delete_failed");
      return false;
    } finally {
      if (mountedRef.current) {
        setBusyAction(undefined);
      }
    }
  }, [deleteBoxAsset, mountedRef, setErrorWhenMounted]);

  const applyMode = React.useCallback(async (nextMode: FrameMode) => {
    if (nextMode === region.mode) {
      return;
    }

    if (region.mode === "image" && nextMode !== "image") {
      const deleted = await deleteExistingAsset(region.assetPath);
      if (!deleted) {
        return;
      }
    }

    setErrorWhenMounted(undefined);
    if (nextMode === "image") {
      onChange({
        mode: "image",
        assetPath: region.mode === "image" ? region.assetPath : undefined,
      });
      return;
    }

    if (nextMode === "html") {
      onChange({
        mode: "html",
        html: region.mode === "html" ? region.html : "",
      });
      return;
    }

    onChange({
      mode: "none",
    });
  }, [deleteExistingAsset, onChange, region, setErrorWhenMounted]);

  const handleUpload = React.useCallback(async (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!hasBridge) {
      setErrorWhenMounted("editor.asset_bridge_missing");
      return;
    }

    setBusyAction("import");
    try {
      const imported = await importBoxAsset!({
        file,
        preferredPath: buildPreferredAssetPath(preferredAssetPrefix, file),
      });
      if (!isSafeBoxAssetPath(imported.assetPath)) {
        setErrorWhenMounted("editor.imported_asset_path_invalid");
        return;
      }

      const previousAssetPath = region.mode === "image" ? region.assetPath : undefined;
      onChange({
        mode: "image",
        assetPath: imported.assetPath,
      });
      setErrorWhenMounted(undefined);

      if (previousAssetPath && previousAssetPath !== imported.assetPath) {
        try {
          await deleteBoxAsset!(previousAssetPath);
        } catch {
          setErrorWhenMounted("editor.delete_failed");
        }
      }
    } catch {
      setErrorWhenMounted("editor.import_failed");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (mountedRef.current) {
        setBusyAction(undefined);
      }
    }
  }, [
    deleteBoxAsset,
    hasBridge,
    importBoxAsset,
    mountedRef,
    onChange,
    preferredAssetPrefix,
    region.assetPath,
    region.mode,
    setErrorWhenMounted,
  ]);

  const handleRemove = React.useCallback(async () => {
    if (region.mode !== "image") {
      return;
    }
    const deleted = await deleteExistingAsset(region.assetPath);
    if (!deleted) {
      return;
    }

    setErrorWhenMounted(undefined);
    onChange({
      mode: "none",
    });
  }, [deleteExistingAsset, onChange, region.assetPath, region.mode, setErrorWhenMounted]);

  const handleClearCode = React.useCallback(() => {
    if (region.mode !== "html") {
      return;
    }
    setErrorWhenMounted(undefined);
    onChange({
      mode: "html",
      html: "",
    });
  }, [onChange, region.mode, setErrorWhenMounted]);

  const handleFilePick = React.useCallback(() => {
    if (hasBridge && busyAction === undefined) {
      fileInputRef.current?.click();
    }
  }, [busyAction, hasBridge]);

  const handleDrop = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  }, [handleUpload]);

  const modeOptions = React.useMemo(() => ([
    {
      value: "none",
      label: getLayoutMessage(locale, MODE_MESSAGE_KEY.none),
    },
    {
      value: "image",
      label: getLayoutMessage(locale, MODE_MESSAGE_KEY.image),
    },
    {
      value: "html",
      label: getLayoutMessage(locale, MODE_MESSAGE_KEY.html),
    },
  ]), [locale]);

  const dropZoneDisabled = !hasBridge || busyAction !== undefined;

  return (
    <ChipsForm.Field
      className="chips-grid-layout-editor__group"
      name={id}
      data-frame-region-editor={id}
    >
      <div className="chips-grid-layout-editor__row">
        <span className="chips-grid-layout-editor__row-label">{title}</span>
        <ChipsSegmentedControl
          value={region.mode}
          ariaLabel={title}
          options={modeOptions}
          i18n={i18n}
          onValueChange={(value) => {
            void applyMode(value as FrameMode);
          }}
        />
      </div>

      {hasImage ? (
        <div className="chips-grid-layout-editor__image-area">
          <div
            className={[
              "chips-grid-layout-editor__drop-zone",
              hasImageAsset ? "chips-grid-layout-editor__drop-zone--filled" : "",
              dragging ? "chips-grid-layout-editor__drop-zone--dragging" : "",
              dropZoneDisabled ? "chips-grid-layout-editor__drop-zone--disabled" : "",
            ].filter(Boolean).join(" ")}
            data-drop-zone
            data-state={hasImageAsset ? "filled" : "empty"}
            role="button"
            tabIndex={dropZoneDisabled ? -1 : 0}
            aria-label={hasImageAsset
              ? getLayoutMessage(locale, "editor.replace_hint")
              : getLayoutMessage(locale, "editor.drop_zone_hint")}
            onClick={handleFilePick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleFilePick();
              }
            }}
            onDragOver={(event) => {
              if (dropZoneDisabled) {
                return;
              }
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => {
              setDragging(false);
            }}
            onDrop={handleDrop}
          >
            {hasImageAsset ? (
              preview.status === "loading" ? (
                <span className="chips-grid-layout-editor__drop-zone-status">
                  {getLayoutMessage(locale, "editor.asset_loading")}
                </span>
              ) : preview.status === "ready" && preview.resourceUrl ? (
                <React.Fragment>
                  <img
                    className="chips-grid-layout-editor__drop-zone-image"
                    src={preview.resourceUrl}
                    alt={title}
                  />
                  <span className="chips-grid-layout-editor__drop-zone-overlay">
                    {getLayoutMessage(locale, "editor.replace_hint")}
                  </span>
                </React.Fragment>
              ) : (
                <span className="chips-grid-layout-editor__drop-zone-status">
                  {getLayoutMessage(locale, "editor.read_failed")}
                </span>
              )
            ) : (
              <span className="chips-grid-layout-editor__drop-zone-empty">
                <ChipsIcon
                  descriptor={{ name: "add_photo_alternate", decorative: true }}
                  size={22}
                />
                {getLayoutMessage(locale, "editor.drop_zone_hint")}
              </span>
            )}
          </div>

          {hasImageAsset ? (
            <div className="chips-grid-layout-editor__row-actions">
              <ChipsButton
                type="button"
                className="chips-grid-layout-editor__remove-button"
                disabled={busyAction !== undefined}
                onPress={() => {
                  void handleRemove();
                }}
              >
                {getLayoutMessage(locale, "editor.remove_image")}
              </ChipsButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {region.mode === "html" ? (
        <div className="chips-grid-layout-editor__code-area">
          <ChipsTextArea
            value={region.html ?? ""}
            label={title}
            ariaLabel={title}
            placeholder={getLayoutMessage(locale, "editor.html_placeholder")}
            rows={3}
            resize="block"
            onValueChange={(value) => {
              setErrorWhenMounted(undefined);
              onChange({
                mode: "html",
                html: value,
              });
            }}
          />
          <div className="chips-grid-layout-editor__row-actions">
            <ChipsButton
              type="button"
              className="chips-grid-layout-editor__remove-button"
              disabled={!hasFrameRegionContent(region) || busyAction !== undefined}
              onPress={handleClearCode}
            >
              {getLayoutMessage(locale, "editor.clear_code")}
            </ChipsButton>
          </div>
        </div>
      ) : null}

      {errorKey ? (
        <p className="chips-grid-layout-editor__error" role="alert">
          {getLayoutMessage(locale, errorKey)}
        </p>
      ) : null}

      {hasImage && !hasBridge ? (
        <p className="chips-grid-layout-editor__error" role="alert">
          {getLayoutMessage(locale, "editor.asset_bridge_missing")}
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void handleUpload(event.currentTarget.files?.[0]);
        }}
      />
    </ChipsForm.Field>
  );
}
