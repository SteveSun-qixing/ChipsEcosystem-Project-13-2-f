import React from "react";
import {
  ChipsButton,
  ChipsErrorState,
  ChipsForm,
  ChipsSegmentedControl,
  ChipsTextArea,
  ChipsToolbar,
  EmbeddedDocumentFrame,
  type ChipsCommandAdapter,
  type ChipsCommandView,
  type StandardErrorLike,
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

interface PreviewState {
  status: "idle" | "loading" | "ready" | "error";
  resourceUrl?: string;
  errorKey?: LayoutMessageKey;
}

export interface FrameRegionEditorProps {
  id: string;
  region: FrameRegionConfig;
  locale?: string;
  title: string;
  description: string;
  previewRatio: string;
  preferredAssetPrefix: string;
  readBoxAsset?(assetPath: string): Promise<ResolvedRuntimeResource>;
  importBoxAsset?(input: { file: File; preferredPath?: string }): Promise<{ assetPath: string }>;
  deleteBoxAsset?(assetPath: string): Promise<void>;
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

function toStandardError(locale: string | undefined, key: LayoutMessageKey | undefined): StandardErrorLike | null {
  if (!key) {
    return null;
  }
  return {
    code: key,
    message: getLayoutMessage(locale, key),
    retryable: true,
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

function FrameRegionPreview({
  region,
  locale,
  title,
  ratio,
  readBoxAsset,
}: {
  region: FrameRegionConfig;
  locale?: string;
  title: string;
  ratio: string;
  readBoxAsset?: (assetPath: string) => Promise<ResolvedRuntimeResource>;
}) {
  const [state, setState] = React.useState<PreviewState>({ status: "idle" });

  React.useEffect(() => {
    if (region.mode !== "image" || !region.assetPath) {
      setState({ status: "idle" });
      return;
    }

    if (!readBoxAsset) {
      setState({
        status: "error",
        errorKey: "editor.asset_bridge_missing",
      });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void readBoxAsset(region.assetPath)
      .then((resource) => {
        if (cancelled) {
          return;
        }
        if (typeof resource.resourceUrl === "string" && resource.resourceUrl.trim().length > 0) {
          setState({
            status: "ready",
            resourceUrl: resource.resourceUrl,
          });
          return;
        }
        setState({
          status: "error",
          errorKey: "editor.read_failed",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            errorKey: "editor.read_failed",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [readBoxAsset, region.assetPath, region.mode]);

  if (region.mode === "html" && region.html) {
    return (
      <EmbeddedDocumentFrame
        title={title}
        srcDoc={region.html}
        ratio={ratio}
      />
    );
  }

  if (region.mode === "image" && state.status === "ready" && state.resourceUrl) {
    return (
      <img
        data-frame-region-preview-image
        src={state.resourceUrl}
        alt={title}
      />
    );
  }

  if (region.mode === "image" && state.status === "loading") {
    return (
      <div data-frame-region-preview-status role="status">
        {getLayoutMessage(locale, "editor.asset_loading")}
      </div>
    );
  }

  if (region.mode === "image" && state.status === "error") {
    return (
      <div data-frame-region-preview-status role="status">
        {getLayoutMessage(locale, state.errorKey ?? "editor.read_failed")}
      </div>
    );
  }

  return (
    <div data-frame-region-preview-status>
      {getLayoutMessage(locale, "editor.frame_empty")}
    </div>
  );
}

export function FrameRegionEditor({
  id,
  region,
  locale,
  title,
  description,
  previewRatio,
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
  const fieldError = toStandardError(locale, errorKey);
  const hasContent = hasFrameRegionContent(region);
  const hasImageAssetBridge = Boolean(importBoxAsset && readBoxAsset && deleteBoxAsset);
  const imageBridgeMissing = region.mode === "image" && !hasImageAssetBridge;

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
    if (!importBoxAsset || !readBoxAsset || !deleteBoxAsset) {
      setErrorWhenMounted("editor.asset_bridge_missing");
      return;
    }

    setBusyAction("import");
    try {
      const imported = await importBoxAsset({
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
          await deleteBoxAsset(previousAssetPath);
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
    importBoxAsset,
    mountedRef,
    onChange,
    preferredAssetPrefix,
    readBoxAsset,
    region.assetPath,
    region.mode,
    setErrorWhenMounted,
  ]);

  const handleClear = React.useCallback(async () => {
    if (region.mode === "image") {
      const deleted = await deleteExistingAsset(region.assetPath);
      if (!deleted) {
        return;
      }
    }

    setErrorWhenMounted(undefined);
    onChange({
      mode: "none",
    });
  }, [deleteExistingAsset, onChange, region.assetPath, region.mode, setErrorWhenMounted]);

  const toolbarCommands = React.useMemo<ChipsCommandView[]>(() => [
    {
      commandId: `${id}.upload`,
      titleKey: region.assetPath ? "editor.replace_image" : "editor.upload_image",
      ariaLabelKey: region.assetPath ? "editor.replace_image" : "editor.upload_image",
      icon: { name: "upload_file" },
      toolbarPlacement: [{ toolbarId: `${id}.asset-toolbar`, groupId: "asset", order: 1 }],
      state: {
        enabled: hasImageAssetBridge && busyAction !== "delete",
        busy: busyAction === "import",
      },
    },
    {
      commandId: `${id}.clear`,
      titleKey: "editor.clear_asset",
      ariaLabelKey: "editor.clear_asset",
      icon: { name: "delete" },
      toolbarPlacement: [{ toolbarId: `${id}.asset-toolbar`, groupId: "asset", order: 2 }],
      state: {
        enabled: hasContent && busyAction !== "import",
        busy: busyAction === "delete",
      },
    },
  ], [busyAction, hasContent, hasImageAssetBridge, id, region.assetPath]);

  const toolbarAdapter = React.useMemo<ChipsCommandAdapter>(() => ({
    listCommands: async () => toolbarCommands,
    invokeCommand: async (commandId) => {
      if (commandId === `${id}.upload`) {
        fileInputRef.current?.click();
        return undefined;
      }
      if (commandId === `${id}.clear`) {
        await handleClear();
      }
      return undefined;
    },
  }), [handleClear, id, toolbarCommands]);

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

  return (
    <ChipsForm.Section
      className="chips-box-layout-editor__region"
      title={title}
      description={description}
      data-frame-region-editor={id}
    >
      <ChipsForm.Field name={`${id}.mode`}>
        <ChipsForm.Label>{getLayoutMessage(locale, "editor.frame_mode")}</ChipsForm.Label>
        <ChipsSegmentedControl
          value={region.mode}
          ariaLabel={getLayoutMessage(locale, "editor.frame_mode")}
          options={modeOptions}
          i18n={i18n}
          onValueChange={(value) => {
            void applyMode(value as FrameMode);
          }}
        />
        <ChipsForm.Hint>{getLayoutMessage(locale, "editor.frame_mode_hint")}</ChipsForm.Hint>
      </ChipsForm.Field>

      {region.mode === "image" ? (
        <ChipsForm.Field
          name={`${id}.assetPath`}
          error={fieldError}
        >
          <ChipsForm.Label>{getLayoutMessage(locale, "editor.asset_path")}</ChipsForm.Label>
          <ChipsForm.Control as="div">
            <ChipsToolbar
              toolbarId={`${id}.asset-toolbar`}
              commands={toolbarCommands}
              adapter={toolbarAdapter}
              i18n={i18n}
              ariaLabel={getLayoutMessage(locale, "editor.asset_toolbar")}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                void handleUpload(event.currentTarget.files?.[0]);
              }}
            />
            <span data-frame-region-asset-path>
              {region.assetPath ?? getLayoutMessage(locale, "editor.frame_empty")}
            </span>
          </ChipsForm.Control>
          <ChipsForm.Hint>{getLayoutMessage(locale, "editor.asset_hint")}</ChipsForm.Hint>
          <ChipsForm.Error>{fieldError?.message}</ChipsForm.Error>
          {imageBridgeMissing ? (
            <ChipsErrorState
              error={toStandardError(locale, "editor.asset_bridge_missing")}
              title={getLayoutMessage(locale, "editor.asset_bridge_missing")}
              description={getLayoutMessage(locale, "editor.asset_bridge_missing_desc")}
            />
          ) : null}
        </ChipsForm.Field>
      ) : null}

      {region.mode === "html" ? (
        <ChipsForm.Field name={`${id}.html`}>
          <ChipsTextArea
            value={region.html ?? ""}
            label={getLayoutMessage(locale, "editor.html")}
            ariaLabel={getLayoutMessage(locale, "editor.html")}
            placeholder={getLayoutMessage(locale, "editor.html_placeholder")}
            rows={10}
            resize="block"
            onValueChange={(value) => {
              setErrorWhenMounted(undefined);
              onChange({
                mode: "html",
                html: value,
              });
            }}
          />
          <ChipsForm.Hint>{getLayoutMessage(locale, "editor.html_hint")}</ChipsForm.Hint>
          <ChipsButton
            type="button"
            disabled={!hasContent || busyAction !== undefined}
            onPress={() => {
              void handleClear();
            }}
          >
            {getLayoutMessage(locale, "editor.clear_asset")}
          </ChipsButton>
        </ChipsForm.Field>
      ) : null}

      <div data-frame-region-preview-shell>
        <span data-frame-region-preview-label>{getLayoutMessage(locale, "editor.preview")}</span>
        <div data-frame-region-preview style={{ aspectRatio: previewRatio.replace(":", " / ") }}>
          <FrameRegionPreview
            region={region}
            locale={locale}
            title={title}
            ratio={previewRatio}
            readBoxAsset={readBoxAsset}
          />
        </div>
      </div>
    </ChipsForm.Section>
  );
}
