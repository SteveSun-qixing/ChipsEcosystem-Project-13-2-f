import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Client } from "chips-sdk";
import type { CardViewerSource, ResolvedViewerSource, ViewerCoverSource } from "../types/viewer-source";

interface ViewerSourceState {
  source: ResolvedViewerSource | null;
  error: string | null;
}

interface ViewerSourceContextValue {
  state: ViewerSourceState;
}

interface ViewerSourceProviderProps {
  client: Client;
  source: CardViewerSource | null;
  metadataErrorFallback: string;
  children: React.ReactNode;
}

const ViewerSourceContext = createContext<ViewerSourceContextValue | null>(null);

function getFileName(filePath: string): string {
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? filePath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCoverRatio(value: unknown): string | undefined {
  const normalized = normalizeString(value);
  if (!normalized || !/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function readCardMetadataTitle(rawMetadata: unknown): string | undefined {
  if (!isRecord(rawMetadata)) {
    return undefined;
  }
  return normalizeString(rawMetadata.name) ?? normalizeString(rawMetadata.title);
}

function normalizeCoverRenderMode(value: unknown): "fragment-shadow" | "iframe" | undefined {
  return value === "fragment-shadow" || value === "iframe" ? value : undefined;
}

function resolveCommunityCover(source: Extract<CardViewerSource, { kind: "community-card" | "community-box" }>): ViewerCoverSource | undefined {
  if (!source.coverUrl) {
    return undefined;
  }

  const coverRatio = normalizeCoverRatio(source.coverRatio);

  return {
    title: source.title,
    coverUrl: source.coverUrl,
    ...(source.coverFragmentUrl ? { coverFragmentUrl: source.coverFragmentUrl } : undefined),
    ...(source.coverRenderMode ? { coverRenderMode: source.coverRenderMode } : undefined),
    ...(coverRatio ? { ratio: coverRatio } : undefined),
  };
}

function resolveImmediateSource(source: CardViewerSource | null): ResolvedViewerSource | null {
  if (!source) {
    return null;
  }

  if (source.kind === "community-card" || source.kind === "community-box") {
    return {
      renderKind: "hosted-document",
      source,
      title: source.title,
      createdAt: source.createdAt,
      documentUrl: source.documentUrl,
      cover: resolveCommunityCover(source),
    };
  }

  if (source.kind === "remote-card-file") {
    return {
      renderKind: "unsupported",
      source,
      title: source.title,
      createdAt: source.createdAt,
      reason: "remote-card-file",
    };
  }

  return {
    renderKind: "local-file",
    source,
    title: getFileName(source.filePath),
  };
}

async function readLocalCardCover(
  client: Client,
  filePath: string,
  title: string,
): Promise<ViewerCoverSource | undefined> {
  const coverInfo = await client.card.readInfo(filePath, ["cover"]).catch(() => null);
  const cover = coverInfo?.info.cover;
  const coverRenderMode = normalizeCoverRenderMode(cover?.renderMode);
  if (!cover?.resourceUrl) {
    return undefined;
  }

  const coverRatio = normalizeCoverRatio(cover.ratio);

  return {
    title: normalizeString(cover.title) ?? title,
    coverUrl: cover.resourceUrl,
    ...(cover.fragmentUrl ? { coverFragmentUrl: cover.fragmentUrl } : undefined),
    ...(coverRenderMode ? { coverRenderMode } : undefined),
    ...(coverRatio ? { ratio: coverRatio } : undefined),
  };
}

async function readLocalBoxCover(
  client: Client,
  filePath: string,
  title: string,
): Promise<ViewerCoverSource | undefined> {
  const cover = await client.box.renderCover(filePath).catch(() => null);
  const coverRenderMode = normalizeCoverRenderMode(cover?.coverRenderMode);
  if (!cover?.coverUrl) {
    return undefined;
  }

  const coverRatio = normalizeCoverRatio(cover.ratio);

  return {
    title: normalizeString(cover.title) ?? title,
    coverUrl: cover.coverUrl,
    ...(cover.coverFragmentUrl ? { coverFragmentUrl: cover.coverFragmentUrl } : undefined),
    ...(coverRenderMode ? { coverRenderMode } : undefined),
    ...(coverRatio ? { ratio: coverRatio } : undefined),
  };
}

function useViewerSource() {
  const value = useContext(ViewerSourceContext);
  if (!value) {
    throw new Error("useViewerSource must be used inside ViewerSource.Provider.");
  }
  return value;
}

function ViewerSourceProvider({
  client,
  source,
  metadataErrorFallback,
  children,
}: ViewerSourceProviderProps) {
  const [state, setState] = useState<ViewerSourceState>(() => ({
    source: resolveImmediateSource(source),
    error: null,
  }));

  useEffect(() => {
    let cancelled = false;
    const immediateSource = resolveImmediateSource(source);
    setState({
      source: immediateSource,
      error: null,
    });

    if (!source || source.kind !== "local-file") {
      return () => {
        cancelled = true;
      };
    }

    const loadMetadata = async () => {
      try {
        if (source.documentKind === "card") {
          const info = await client.card.readInfo(source.filePath, ["metadata"]);
          const metadata = info.info.metadata;
          const title = normalizeString(metadata?.name) ?? readCardMetadataTitle(metadata?.raw) ?? getFileName(source.filePath);
          const cover = await readLocalCardCover(client, source.filePath, title);
          if (!cancelled) {
            setState({
              source: {
                renderKind: "local-file",
                source,
                title,
                createdAt: normalizeString(metadata?.createdAt) ?? normalizeString(metadata?.raw?.created_at),
                ...(cover ? { cover } : undefined),
              },
              error: null,
            });
          }
          return;
        }

        const metadata = await client.box.readMetadata(source.filePath);
        const title = normalizeString(metadata.name) ?? getFileName(source.filePath);
        const cover = await readLocalBoxCover(client, source.filePath, title);
        if (!cancelled) {
          setState({
            source: {
              renderKind: "local-file",
              source,
              title,
              createdAt: normalizeString(metadata.createdAt),
              ...(cover ? { cover } : undefined),
            },
            error: null,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            source: immediateSource,
            error: metadataErrorFallback,
          });
        }
      }
    };

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [client, metadataErrorFallback, source]);

  const value = useMemo<ViewerSourceContextValue>(() => ({ state }), [state]);

  return (
    <ViewerSourceContext.Provider value={value}>
      {children}
    </ViewerSourceContext.Provider>
  );
}

function ViewerSourceOutlet({
  children,
}: {
  children: (state: ViewerSourceState) => React.ReactNode;
}) {
  const { state } = useViewerSource();
  return <>{children(state)}</>;
}

export const ViewerSource = {
  Provider: ViewerSourceProvider,
  Outlet: ViewerSourceOutlet,
};
