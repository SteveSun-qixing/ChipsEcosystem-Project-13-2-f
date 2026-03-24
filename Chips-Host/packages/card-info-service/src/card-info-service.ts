import fs from 'node:fs/promises';

export type CardInfoField = 'status' | 'metadata' | 'cover';
export type CardTag = string | string[];

export interface CardInfoStatus {
  state: 'ready' | 'missing' | 'invalid';
  exists: boolean;
  valid: boolean;
  errors?: string[];
}

export interface CardInfoMetadata {
  raw: Record<string, unknown>;
  chipStandardsVersion?: string;
  cardId?: string;
  name?: string;
  createdAt?: string;
  modifiedAt?: string;
  theme?: string;
  coverRatio?: string;
  tags?: CardTag[];
}

export interface CardInfoCover {
  title: string;
  resourceUrl: string;
  mimeType: 'text/html';
  ratio?: string;
}

export interface CardInfoPayload {
  status?: CardInfoStatus;
  metadata?: CardInfoMetadata;
  cover?: CardInfoCover;
}

export interface CardReadInfoResult {
  cardFile: string;
  info: CardInfoPayload;
}

export interface CardInfoServiceOptions {
  validate(cardFile: string): Promise<{ valid: boolean; errors?: string[] }>;
  readMetadata(cardFile: string): Promise<Record<string, unknown>>;
  renderCover(cardFile: string): Promise<{ title: string; coverUrl: string; ratio?: string }>;
}

const asString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const normalizeTags = (value: unknown): CardTag[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((item) => {
      if (typeof item === 'string' && item.trim().length > 0) {
        return item.trim();
      }
      if (Array.isArray(item) && item.every((member) => typeof member === 'string' && member.trim().length > 0)) {
        return item.map((member) => member.trim());
      }
      return null;
    })
    .filter((item): item is CardTag => item !== null);

  return normalized.length > 0 ? normalized : undefined;
};

const toMetadataView = (raw: Record<string, unknown>): CardInfoMetadata => {
  return {
    raw,
    chipStandardsVersion: asString(raw.chip_standards_version),
    cardId: asString(raw.card_id),
    name: asString(raw.name),
    createdAt: asString(raw.created_at),
    modifiedAt: asString(raw.modified_at),
    theme: asString(raw.theme),
    coverRatio: asString(raw.cover_ratio),
    tags: normalizeTags(raw.tags)
  };
};

export class CardInfoService {
  public constructor(private readonly options: CardInfoServiceOptions) {}

  public async readInfo(cardFile: string, fields?: CardInfoField[]): Promise<CardReadInfoResult> {
    const requestedFields = [...new Set(fields ?? ['status', 'metadata', 'cover'])];
    const info: CardInfoPayload = {};
    const status = await this.readStatus(cardFile);

    if (requestedFields.includes('status')) {
      info.status = status;
    }

    if (status.state !== 'ready') {
      return {
        cardFile,
        info
      };
    }

    if (requestedFields.includes('metadata')) {
      const metadata = await this.options.readMetadata(cardFile);
      info.metadata = toMetadataView(metadata);
    }

    if (requestedFields.includes('cover')) {
      const cover = await this.options.renderCover(cardFile);
      info.cover = {
        title: cover.title,
        resourceUrl: cover.coverUrl,
        mimeType: 'text/html',
        ratio: cover.ratio
      };
    }

    return {
      cardFile,
      info
    };
  }

  private async readStatus(cardFile: string): Promise<CardInfoStatus> {
    const stats = await fs.stat(cardFile).catch(() => null);
    if (!stats?.isFile()) {
      return {
        state: 'missing',
        exists: false,
        valid: false
      };
    }

    const validation = await this.options.validate(cardFile);
    if (!validation.valid) {
      return {
        state: 'invalid',
        exists: true,
        valid: false,
        errors: Array.isArray(validation.errors) ? validation.errors : undefined
      };
    }

    return {
      state: 'ready',
      exists: true,
      valid: true
    };
  }
}
