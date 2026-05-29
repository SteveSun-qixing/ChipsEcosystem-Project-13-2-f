import type { CardViewerSource as SdkCardViewerSource } from "chips-sdk";

export type ViewerDocumentKind = "card" | "box";

export interface ViewerCoverSource {
  title?: string;
  coverUrl: string;
  coverFragmentUrl?: string;
  coverRenderMode?: "fragment-shadow" | "iframe";
  ratio?: string;
}

interface CommunitySourceCoverFields {
  coverUrl?: string;
  coverFragmentUrl?: string;
  coverRenderMode?: "fragment-shadow" | "iframe";
  coverRatio?: string;
}

export type CardViewerSource = SdkCardViewerSource;

export type ResolvedViewerSource =
  | {
      renderKind: "local-file";
      source: Extract<CardViewerSource, { kind: "local-file" }>;
      title?: string;
      createdAt?: string;
      cover?: ViewerCoverSource;
    }
  | {
      renderKind: "hosted-document";
      source: Extract<CardViewerSource, { kind: "community-card" | "community-box" }>;
      title: string;
      createdAt?: string;
      documentUrl: string;
      cover?: ViewerCoverSource;
    }
  | {
      renderKind: "unsupported";
      source: Extract<CardViewerSource, { kind: "remote-card-file" }>;
      title?: string;
      createdAt?: string;
      reason: "remote-card-file";
    };

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

function normalizeDocumentKind(value: unknown): ViewerDocumentKind | null {
  if (value === "card" || value === "box") {
    return value;
  }
  return null;
}

function normalizeCoverRatio(value: unknown): string | undefined {
  const normalized = normalizeString(value);
  if (!normalized || !/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function normalizeCoverRenderMode(value: unknown): "fragment-shadow" | "iframe" | undefined {
  if (value === "fragment-shadow" || value === "iframe") {
    return value;
  }
  return undefined;
}

function normalizeViewerCoverSource(
  value: Record<string, unknown>,
  title?: string,
): ViewerCoverSource | undefined {
  const coverUrl = normalizeString(value.coverUrl);
  if (!coverUrl) {
    return undefined;
  }

  const coverFragmentUrl = normalizeString(value.coverFragmentUrl);
  const coverRenderMode = normalizeCoverRenderMode(value.coverRenderMode);
  const coverRatio = normalizeCoverRatio(value.coverRatio);

  return {
    ...(title ? { title } : {}),
    coverUrl,
    ...(coverFragmentUrl ? { coverFragmentUrl } : undefined),
    ...(coverRenderMode ? { coverRenderMode } : undefined),
    ...(coverRatio ? { ratio: coverRatio } : undefined),
  };
}

function spreadCommunityCoverFields(
  cover: ViewerCoverSource | undefined,
): CommunitySourceCoverFields | undefined {
  if (!cover) {
    return undefined;
  }

  return {
    coverUrl: cover.coverUrl,
    ...(cover.coverFragmentUrl ? { coverFragmentUrl: cover.coverFragmentUrl } : undefined),
    ...(cover.coverRenderMode ? { coverRenderMode: cover.coverRenderMode } : undefined),
    ...(cover.ratio ? { coverRatio: cover.ratio } : undefined),
  };
}

export function inferDocumentKindFromPath(filePath: string): ViewerDocumentKind | null {
  const normalized = filePath.trim().toLowerCase();
  if (normalized.endsWith(".card")) {
    return "card";
  }
  if (normalized.endsWith(".box")) {
    return "box";
  }
  return null;
}

export function parseCardViewerSource(value: unknown): CardViewerSource | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.kind === "local-file") {
    const filePath = normalizeString(value.filePath);
    const documentKind = normalizeDocumentKind(value.documentKind) ?? (filePath ? inferDocumentKindFromPath(filePath) : null);
    if (!filePath || !documentKind) {
      return null;
    }
    return {
      kind: "local-file",
      documentKind,
      filePath,
    };
  }

  if (value.kind === "community-card") {
    const cardId = normalizeString(value.cardId);
    const title = normalizeString(value.title);
    const documentUrl = normalizeString(value.documentUrl);
    if (!cardId || !title || !documentUrl) {
      return null;
    }
    const cover = normalizeViewerCoverSource(value, title);
    return {
      kind: "community-card",
      cardId,
      title,
      documentUrl,
      ...(normalizeString(value.createdAt) ? { createdAt: normalizeString(value.createdAt) } : undefined),
      ...(normalizeString(value.canonicalUrl) ? { canonicalUrl: normalizeString(value.canonicalUrl) } : undefined),
      ...spreadCommunityCoverFields(cover),
    };
  }

  if (value.kind === "community-box") {
    const boxId = normalizeString(value.boxId);
    const title = normalizeString(value.title);
    const documentUrl = normalizeString(value.documentUrl);
    if (!boxId || !title || !documentUrl) {
      return null;
    }
    const cover = normalizeViewerCoverSource(value, title);
    return {
      kind: "community-box",
      boxId,
      title,
      documentUrl,
      ...(normalizeString(value.createdAt) ? { createdAt: normalizeString(value.createdAt) } : undefined),
      ...(normalizeString(value.canonicalUrl) ? { canonicalUrl: normalizeString(value.canonicalUrl) } : undefined),
      ...spreadCommunityCoverFields(cover),
    };
  }

  if (value.kind === "remote-card-file") {
    const url = normalizeString(value.url);
    if (!url) {
      return null;
    }
    return {
      kind: "remote-card-file",
      url,
      ...(normalizeString(value.title) ? { title: normalizeString(value.title) } : undefined),
      ...(normalizeString(value.createdAt) ? { createdAt: normalizeString(value.createdAt) } : undefined),
    };
  }

  return null;
}

export function resolveCardViewerSource(launchParams: Record<string, unknown>): CardViewerSource | null {
  return parseCardViewerSource(launchParams.cardSource);
}

export function getSourceDocumentKind(source: CardViewerSource): ViewerDocumentKind {
  if (source.kind === "community-card" || source.kind === "remote-card-file") {
    return "card";
  }
  if (source.kind === "community-box") {
    return "box";
  }
  return source.documentKind;
}

export function resolveViewerSource(source: CardViewerSource): ResolvedViewerSource {
  if (source.kind === "local-file") {
    return {
      renderKind: "local-file",
      source,
    };
  }

  if (source.kind === "community-card" || source.kind === "community-box") {
    const cover = normalizeViewerCoverSource(source as unknown as Record<string, unknown>, source.title);
    return {
      renderKind: "hosted-document",
      source,
      title: source.title,
      ...(source.createdAt ? { createdAt: source.createdAt } : undefined),
      documentUrl: source.documentUrl,
      ...(cover ? { cover } : undefined),
    };
  }

  return {
    renderKind: "unsupported",
    source,
    ...(source.title ? { title: source.title } : undefined),
    ...(source.createdAt ? { createdAt: source.createdAt } : undefined),
    reason: "remote-card-file",
  };
}
