import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Client } from "chips-sdk";
import type { CardViewerSource, ResolvedViewerSource } from "../types/viewer-source";

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

function readCardMetadataTitle(rawMetadata: unknown): string | undefined {
  if (!isRecord(rawMetadata)) {
    return undefined;
  }
  return normalizeString(rawMetadata.name) ?? normalizeString(rawMetadata.title);
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
          if (!cancelled) {
            setState({
              source: {
                renderKind: "local-file",
                source,
                title: normalizeString(metadata?.name) ?? readCardMetadataTitle(metadata?.raw) ?? getFileName(source.filePath),
                createdAt: normalizeString(metadata?.createdAt) ?? normalizeString(metadata?.raw?.created_at),
              },
              error: null,
            });
          }
          return;
        }

        const metadata = await client.box.readMetadata(source.filePath);
        if (!cancelled) {
          setState({
            source: {
              renderKind: "local-file",
              source,
              title: normalizeString(metadata.name) ?? getFileName(source.filePath),
              createdAt: normalizeString(metadata.createdAt),
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
