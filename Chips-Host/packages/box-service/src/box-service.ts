import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import yaml from 'yaml';
import { createError } from '../../../src/shared/errors';
import { createId } from '../../../src/shared/utils';
import type { CardInfoField, CardReadInfoResult } from '../../card-info-service/src';
import type { ZipEntryMeta } from '../../zip-service/src';
import { StoreZipService } from '../../zip-service/src';

const BOX_ID_PATTERN = /^[0-9A-Za-z]{10}$/;
const SUPPORTED_URL_SCHEMES = new Set(['file:', 'http:', 'https:', 'webdav:']);
const BOX_MIME_TYPE = 'application/vnd.chips.box+zip';
const CARD_MIME_TYPE = 'application/vnd.chips.card+zip';

type BoxTag = string | string[];
type EntryDetailField = 'cardInfo' | 'coverDescriptor' | 'previewDescriptor' | 'runtimeProps' | 'status';
type EntryResourceKind = 'cover' | 'preview' | 'cardFile' | 'custom';
type PrefetchTarget = 'cover' | 'preview' | 'cardInfo';

export interface BoxValidationResult {
  valid: boolean;
  errors: string[];
}

export interface BoxMetadata {
  chipStandardsVersion: string;
  boxId: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  activeLayoutType: string;
  description?: string;
  tags?: BoxTag[];
  coverAsset?: string;
  owner?: string;
  source?: Record<string, unknown>;
}

export interface BoxEntrySnapshot {
  entryId: string;
  url: string;
  enabled: boolean;
  snapshot: {
    cardId?: string;
    title?: string;
    summary?: string;
    tags?: BoxTag[];
    cover?: {
      mode: 'asset' | 'runtime' | 'none';
      assetPath?: string;
      mimeType?: string;
      width?: number;
      height?: number;
    };
    lastKnownModifiedAt?: string;
    contentType?: string;
  };
  layoutHints?: {
    sortKey?: string | number;
    aspectRatio?: number;
    group?: string;
    priority?: number;
  };
}

export interface BoxLayoutConfig {
  schemaVersion?: string;
  props?: Record<string, unknown>;
  assetRefs?: string[];
  [key: string]: unknown;
}

export interface BoxContent {
  activeLayoutType: string;
  layoutConfigs: Record<string, BoxLayoutConfig>;
}

export interface BoxInspection {
  metadata: BoxMetadata;
  content: BoxContent;
  entries: BoxEntrySnapshot[];
  assets: string[];
}

export interface BoxEntryQuery {
  cursor?: string;
  limit?: number;
  filter?: Record<string, unknown>;
  sort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
}

export interface BoxEntryPage {
  items: BoxEntrySnapshot[];
  total: number;
  nextCursor?: string;
}

export interface BoxSessionInfo {
  boxId: string;
  boxFile: string;
  name: string;
  activeLayoutType: string;
  availableLayouts: string[];
  tags?: BoxTag[];
  coverAsset?: string;
  capabilities: {
    listEntries: true;
    readEntryDetail: true;
    renderEntryCover: true;
    resolveEntryResource: true;
    readBoxAsset: true;
    prefetchEntries: true;
    openEntry: true;
  };
}

export interface BoxOpenViewResult {
  sessionId: string;
  box: BoxSessionInfo;
  initialView: BoxEntryPage;
}

export interface BoxEntryOpenResult {
  mode: 'card-window' | 'external';
  windowId?: string;
  pluginId?: string;
  url?: string;
}

export interface BoxEntryCoverView {
  title: string;
  coverUrl: string;
  mimeType: string;
  ratio?: string;
}

export interface ResolvedRuntimeResource {
  resourceUrl: string;
  mimeType: string;
  cacheKey?: string;
  expiresAt?: string;
  width?: number;
  height?: number;
}

export interface BoxReadEntryDetailResult {
  items: Array<{
    entryId: string;
    detail: Record<string, unknown>;
  }>;
}

export interface BoxServiceReadEntryDetailOptions {
  ownerKey: string;
  readCardInfo?: (cardFile: string, fields?: CardInfoField[]) => Promise<CardReadInfoResult>;
}

export interface BoxServiceResolveEntryResourceOptions extends BoxServiceReadEntryDetailOptions {
  openCardFile?: (cardFile: string) => Promise<BoxEntryOpenResult>;
  openExternalUrl?: (url: string) => Promise<void>;
}

export interface BoxOpenViewOptions {
  ownerKey: string;
  layoutType?: string;
  initialQuery?: BoxEntryQuery;
}

interface NormalizedBoxPackage {
  metadata: BoxMetadata;
  content: BoxContent;
  entries: BoxEntrySnapshot[];
  assets: string[];
}

interface LoadedArchivePackage extends NormalizedBoxPackage {
  zipEntries: Set<string>;
}

interface BoxSessionRecord {
  sessionId: string;
  ownerKey: string;
  createdAt: number;
  extractedDir: string;
  boxFile: string;
  metadata: BoxMetadata;
  content: BoxContent;
  entries: BoxEntrySnapshot[];
  entryMap: Map<string, BoxEntrySnapshot>;
  activeLayoutType: string;
  availableLayouts: string[];
  resourceCache: Map<string, ResolvedRuntimeResource>;
}

interface EntryLocator {
  scheme: string;
  url: string;
  filePath?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const asFiniteNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const toRatioString = (width?: number, height?: number): string | undefined => {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return undefined;
  }
  return `${width}:${height}`;
};

const normalizeTags = (value: unknown, field: string): BoxTag[] | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw createError('BOX_SCHEMA_INVALID', `${field} must be an array.`);
  }

  const normalized = value.map((item) => {
    if (typeof item === 'string' && item.trim().length > 0) {
      return item.trim();
    }
    if (Array.isArray(item) && item.every((member) => typeof member === 'string' && member.trim().length > 0)) {
      return item.map((member) => member.trim());
    }
    throw createError('BOX_SCHEMA_INVALID', `${field} must contain string tags or string arrays.`);
  });

  return normalized.length > 0 ? normalized : undefined;
};

const normalizeAssetPath = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createError('BOX_SCHEMA_INVALID', `${field} must be a non-empty string.`);
  }

  const normalized = value.trim().replace(/\\/g, '/');
  if (!normalized.startsWith('assets/')) {
    throw createError('BOX_SCHEMA_INVALID', `${field} must start with assets/.`, { value });
  }

  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw createError('BOX_SCHEMA_INVALID', `${field} contains invalid path traversal.`, { value });
  }

  return segments.join('/');
};

const ensureIsoUtc = (value: string, field: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw createError('BOX_SCHEMA_INVALID', `${field} must be a valid ISO 8601 UTC string.`, { value });
  }
  return value;
};

const ensureBase62Id = (value: string, field: string): string => {
  if (!BOX_ID_PATTERN.test(value)) {
    throw createError('BOX_SCHEMA_INVALID', `${field} must be a 10-character Base62 identifier.`, { value });
  }
  return value;
};

const parseYamlRecord = (text: string, filePath: string): Record<string, unknown> => {
  const parsed = yaml.parse(text) as unknown;
  if (!isRecord(parsed)) {
    throw createError('BOX_SCHEMA_INVALID', `YAML root must be an object: ${filePath}`, { filePath });
  }
  return parsed;
};

const sortObjectKeys = <T>(values: T[]): T[] => {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
};

const collectDirectoryFiles = async (rootDir: string): Promise<string[]> => {
  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join('/');
      files.push(relativePath);
    }
  }

  return sortObjectKeys(files);
};

const resolvePageCursor = (value: string | undefined): number => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const resolvePageLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 24;
  }
  return Math.max(1, Math.min(200, Math.floor(value)));
};

const compareValues = (left: unknown, right: unknown): number => {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left ?? '').localeCompare(String(right ?? ''));
};

export class BoxService {
  private readonly sessions = new Map<string, BoxSessionRecord>();

  public constructor(private readonly zip = new StoreZipService()) {}

  public async pack(boxDir: string, outputPath: string): Promise<string> {
    await this.loadDirectoryPackage(boxDir);
    await this.zip.compress(boxDir, outputPath);
    return outputPath;
  }

  public async unpack(boxFile: string, outputDir: string): Promise<string> {
    const validation = await this.validate(boxFile);
    if (!validation.valid) {
      throw createError('BOX_UNPACK_FAILED', 'Box format validation failed.', validation.errors);
    }
    await this.zip.extract(boxFile, outputDir);
    return outputDir;
  }

  public async inspect(boxFile: string): Promise<BoxInspection> {
    const loaded = await this.loadArchivePackage(boxFile);
    return {
      metadata: loaded.metadata,
      content: loaded.content,
      entries: loaded.entries,
      assets: loaded.assets
    };
  }

  public async validate(boxFile: string): Promise<BoxValidationResult> {
    try {
      await this.loadArchivePackage(boxFile);
      return {
        valid: true,
        errors: []
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const details = (error as { details?: unknown }).details;
        if (Array.isArray(details) && details.every((item) => typeof item === 'string')) {
          return {
            valid: false,
            errors: details
          };
        }
        return {
          valid: false,
          errors: [(error as { message: string }).message]
        };
      }
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  public async readMetadata(boxFile: string): Promise<BoxMetadata> {
    const loaded = await this.loadArchivePackage(boxFile);
    return loaded.metadata;
  }

  public async openView(boxFile: string, options: BoxOpenViewOptions): Promise<BoxOpenViewResult> {
    const loaded = await this.loadArchivePackage(boxFile);
    const extractedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-box-view-'));
    try {
      await this.zip.extract(boxFile, extractedDir);
      const requestedLayoutType = asString(options.layoutType);
      const activeLayoutType = requestedLayoutType ?? loaded.content.activeLayoutType;
      const availableLayouts = sortObjectKeys([...new Set([activeLayoutType, ...Object.keys(loaded.content.layoutConfigs)])]);
      const sessionId = createId();
      const session: BoxSessionRecord = {
        sessionId,
        ownerKey: options.ownerKey,
        createdAt: Date.now(),
        extractedDir,
        boxFile,
        metadata: loaded.metadata,
        content: loaded.content,
        entries: loaded.entries,
        entryMap: new Map(loaded.entries.map((entry) => [entry.entryId, entry])),
        activeLayoutType,
        availableLayouts,
        resourceCache: new Map()
      };
      this.sessions.set(sessionId, session);

      return {
        sessionId,
        box: this.toSessionInfo(session),
        initialView: this.listEntriesInternal(session, options.initialQuery)
      };
    } catch (error) {
      await fs.rm(extractedDir, { recursive: true, force: true });
      throw createError('BOX_OPEN_FAILED', 'Failed to open box view session.', {
        boxFile,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  public async listEntries(sessionId: string, ownerKey: string, query?: BoxEntryQuery): Promise<BoxEntryPage> {
    const session = this.requireSession(sessionId, ownerKey);
    return this.listEntriesInternal(session, query);
  }

  public async readEntryDetail(
    sessionId: string,
    entryIds: string[],
    fields: EntryDetailField[],
    options: BoxServiceReadEntryDetailOptions
  ): Promise<BoxReadEntryDetailResult> {
    const session = this.requireSession(sessionId, options.ownerKey);
    const uniqueFields = [...new Set(fields)];

    const items = await Promise.all(
      entryIds.map(async (entryId) => {
        const entry = session.entryMap.get(entryId);
        if (!entry) {
          throw createError('BOX_ENTRY_NOT_FOUND', `Box entry not found: ${entryId}`, { sessionId, entryId });
        }

        const detail: Record<string, unknown> = {};
        const locator = this.resolveEntryLocator(entry.url);

        for (const field of uniqueFields) {
          if (field === 'status') {
            detail.status = await this.readEntryStatus(locator);
            continue;
          }

          if (field === 'cardInfo') {
            if (locator.scheme === 'file:' && locator.filePath && options.readCardInfo) {
              detail.cardInfo = (await options.readCardInfo(locator.filePath, ['status', 'metadata', 'cover'])).info;
            } else {
              detail.cardInfo = {
                status: {
                  state: locator.scheme === 'file:' ? 'missing' : 'invalid',
                  exists: false,
                  valid: false
                }
              };
            }
            continue;
          }

          if (field === 'coverDescriptor') {
            detail.coverDescriptor = entry.snapshot.cover
              ? {
                  ...entry.snapshot.cover
                }
              : { mode: 'none' };
            continue;
          }

          if (field === 'previewDescriptor') {
            detail.previewDescriptor =
              entry.snapshot.cover?.mode === 'asset'
                ? {
                    mode: 'asset',
                    assetPath: entry.snapshot.cover.assetPath,
                    mimeType: entry.snapshot.cover.mimeType,
                    width: entry.snapshot.cover.width,
                    height: entry.snapshot.cover.height
                  }
                : {
                    mode: entry.snapshot.cover?.mode ?? 'none'
                  };
            continue;
          }

          detail.runtimeProps = {
            scheme: locator.scheme.replace(/:$/, ''),
            url: entry.url,
            enabled: entry.enabled,
            isLocalFile: locator.scheme === 'file:'
          };
        }

        return {
          entryId,
          detail
        };
      })
    );

    return { items };
  }

  public async resolveEntryResource(
    sessionId: string,
    entryId: string,
    resource: {
      kind: EntryResourceKind;
      key?: string;
      sizeHint?: {
        width?: number;
        height?: number;
      };
    },
    options: BoxServiceResolveEntryResourceOptions
  ): Promise<ResolvedRuntimeResource> {
    const session = this.requireSession(sessionId, options.ownerKey);
    const entry = session.entryMap.get(entryId);
    if (!entry) {
      throw createError('BOX_ENTRY_NOT_FOUND', `Box entry not found: ${entryId}`, { sessionId, entryId });
    }

    const cacheKey = `${entryId}:${resource.kind}:${resource.key ?? ''}`;
    const cached = session.resourceCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let resolved: ResolvedRuntimeResource;
    if (resource.kind === 'cover' || resource.kind === 'preview') {
      const cover = entry.snapshot.cover;
      if (cover?.mode === 'asset' && cover.assetPath) {
        resolved = await this.readBoxAsset(sessionId, cover.assetPath, options.ownerKey);
        if (cover.mimeType) {
          resolved = {
            ...resolved,
            mimeType: cover.mimeType,
            width: cover.width,
            height: cover.height
          };
        }
      } else {
        const locator = this.resolveEntryLocator(entry.url);
        if (locator.scheme === 'file:' && locator.filePath && options.readCardInfo) {
          const info = await options.readCardInfo(locator.filePath, ['status', 'cover']);
          if (info.info.status?.state !== 'ready' || !info.info.cover) {
            throw createError('BOX_RESOURCE_NOT_FOUND', `Entry cover resource missing: ${entryId}`, { sessionId, entryId });
          }
          resolved = {
            resourceUrl: info.info.cover.resourceUrl,
            mimeType: info.info.cover.mimeType,
            cacheKey
          };
        } else {
          throw createError('BOX_RESOURCE_NOT_FOUND', `Entry ${resource.kind} resource is unavailable.`, {
            sessionId,
            entryId,
            kind: resource.kind
          });
        }
      }
    } else if (resource.kind === 'cardFile') {
      const locator = this.resolveEntryLocator(entry.url);
      if (locator.scheme === 'file:' && locator.filePath) {
        const exists = await this.pathExists(locator.filePath);
        if (!exists) {
          throw createError('BOX_RESOURCE_NOT_FOUND', `Card file is missing: ${entryId}`, { sessionId, entryId });
        }
        resolved = {
          resourceUrl: pathToFileURL(locator.filePath).href,
          mimeType: CARD_MIME_TYPE,
          cacheKey
        };
      } else {
        resolved = {
          resourceUrl: entry.url,
          mimeType: CARD_MIME_TYPE,
          cacheKey
        };
      }
    } else {
      if (!resource.key) {
        throw createError('BOX_RESOURCE_NOT_FOUND', 'Custom box resource requires a non-empty key.', {
          sessionId,
          entryId
        });
      }
      resolved = await this.readBoxAsset(sessionId, resource.key, options.ownerKey);
    }

    session.resourceCache.set(cacheKey, resolved);
    return resolved;
  }

  public async renderEntryCover(
    sessionId: string,
    entryId: string,
    options: Pick<BoxServiceReadEntryDetailOptions, 'ownerKey' | 'readCardInfo'>
  ): Promise<BoxEntryCoverView> {
    const session = this.requireSession(sessionId, options.ownerKey);
    const entry = session.entryMap.get(entryId);
    if (!entry) {
      throw createError('BOX_ENTRY_NOT_FOUND', `Box entry not found: ${entryId}`, { sessionId, entryId });
    }

    const fallbackTitle = entry.snapshot.title ?? entry.snapshot.cardId ?? entry.entryId;
    const cover = entry.snapshot.cover;
    if (cover?.mode === 'asset' && cover.assetPath) {
      const asset = await this.readBoxAsset(sessionId, cover.assetPath, options.ownerKey);
      return {
        title: fallbackTitle,
        coverUrl: asset.resourceUrl,
        mimeType: cover.mimeType ?? asset.mimeType,
        ratio: toRatioString(cover.width, cover.height)
      };
    }

    const locator = this.resolveEntryLocator(entry.url);
    if (locator.scheme === 'file:' && locator.filePath && options.readCardInfo) {
      const info = await options.readCardInfo(locator.filePath, ['status', 'cover', 'metadata']);
      if (info.info.status?.state !== 'ready' || !info.info.cover) {
        throw createError('BOX_RESOURCE_NOT_FOUND', `Entry cover resource missing: ${entryId}`, { sessionId, entryId });
      }

      return {
        title: info.info.cover.title || info.info.metadata?.name || fallbackTitle,
        coverUrl: info.info.cover.resourceUrl,
        mimeType: info.info.cover.mimeType,
        ratio: info.info.cover.ratio ?? info.info.metadata?.coverRatio
      };
    }

    throw createError('BOX_RESOURCE_NOT_FOUND', 'Current box entry does not provide a renderable cover view.', {
      sessionId,
      entryId,
      url: entry.url
    });
  }

  public async openEntry(
    sessionId: string,
    entryId: string,
    options: Pick<BoxServiceResolveEntryResourceOptions, 'ownerKey' | 'openCardFile' | 'openExternalUrl'>
  ): Promise<BoxEntryOpenResult> {
    const session = this.requireSession(sessionId, options.ownerKey);
    const entry = session.entryMap.get(entryId);
    if (!entry) {
      throw createError('BOX_ENTRY_NOT_FOUND', `Box entry not found: ${entryId}`, { sessionId, entryId });
    }

    const locator = this.resolveEntryLocator(entry.url);
    if (locator.scheme === 'file:' && locator.filePath) {
      const exists = await this.pathExists(locator.filePath);
      if (!exists) {
        throw createError('BOX_RESOURCE_NOT_FOUND', `Card file is missing: ${entryId}`, { sessionId, entryId });
      }
      if (!options.openCardFile) {
        throw createError('BOX_OPEN_FAILED', 'Current Host cannot open local card files for this box session.', {
          sessionId,
          entryId
        });
      }
      return options.openCardFile(locator.filePath);
    }

    if (!options.openExternalUrl) {
      throw createError('BOX_OPEN_FAILED', 'Current Host cannot open external URLs for this box session.', {
        sessionId,
        entryId,
        url: entry.url
      });
    }

    await options.openExternalUrl(entry.url);
    return {
      mode: 'external',
      url: entry.url
    };
  }

  public async readBoxAsset(sessionId: string, assetPath: string, ownerKey: string): Promise<ResolvedRuntimeResource> {
    const session = this.requireSession(sessionId, ownerKey);
    const normalizedAssetPath = normalizeAssetPath(assetPath, 'assetPath');
    const absolutePath = path.join(session.extractedDir, normalizedAssetPath);
    const relative = path.relative(session.extractedDir, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw createError('BOX_ASSET_NOT_FOUND', `Box asset is outside package root: ${normalizedAssetPath}`, {
        sessionId,
        assetPath
      });
    }

    const exists = await this.pathExists(absolutePath);
    if (!exists) {
      throw createError('BOX_ASSET_NOT_FOUND', `Box asset not found: ${normalizedAssetPath}`, {
        sessionId,
        assetPath: normalizedAssetPath
      });
    }

    return {
      resourceUrl: pathToFileURL(absolutePath).href,
      mimeType: this.mimeTypeForPath(normalizedAssetPath),
      cacheKey: `box-asset:${normalizedAssetPath}`
    };
  }

  public async prefetchEntries(
    sessionId: string,
    entryIds: string[],
    targets: PrefetchTarget[],
    options: BoxServiceResolveEntryResourceOptions
  ): Promise<{ ack: true }> {
    const session = this.requireSession(sessionId, options.ownerKey);
    const uniqueEntryIds = [...new Set(entryIds)];
    const uniqueTargets = [...new Set(targets)];

    for (const entryId of uniqueEntryIds) {
      if (!session.entryMap.has(entryId)) {
        throw createError('BOX_ENTRY_NOT_FOUND', `Box entry not found: ${entryId}`, { sessionId, entryId });
      }
    }

    const detailFields: EntryDetailField[] = [];
    if (uniqueTargets.includes('cardInfo')) {
      detailFields.push('cardInfo');
    }
    if (detailFields.length > 0) {
      await this.readEntryDetail(sessionId, uniqueEntryIds, detailFields, options);
    }

    for (const entryId of uniqueEntryIds) {
      if (uniqueTargets.includes('cover')) {
        await this.resolveEntryResource(
          sessionId,
          entryId,
          {
            kind: 'cover'
          },
          options
        ).catch(() => undefined);
      }
      if (uniqueTargets.includes('preview')) {
        await this.resolveEntryResource(
          sessionId,
          entryId,
          {
            kind: 'preview'
          },
          options
        ).catch(() => undefined);
      }
    }

    return { ack: true };
  }

  public async closeView(sessionId: string, ownerKey: string): Promise<{ ack: true }> {
    const session = this.requireSession(sessionId, ownerKey);
    this.sessions.delete(sessionId);
    await fs.rm(session.extractedDir, { recursive: true, force: true });
    return { ack: true };
  }

  private async loadArchivePackage(boxFile: string): Promise<LoadedArchivePackage> {
    const stats = await fs.stat(boxFile).catch(() => null);
    if (!stats?.isFile()) {
      throw createError('BOX_NOT_FOUND', `Box file not found: ${boxFile}`, { boxFile });
    }

    const entries = await this.zip.list(boxFile);
    const entrySet = new Set(entries.map((entry) => entry.path));
    const validationErrors = this.validateZipEntries(entries);
    if (validationErrors.length > 0) {
      throw createError('BOX_FORMAT_INVALID', 'Box format validation failed.', validationErrors);
    }

    const [metadataRaw, structureRaw, contentRaw] = await Promise.all([
      this.zip.readEntry(boxFile, '.box/metadata.yaml').then((buffer) => parseYamlRecord(buffer.toString('utf-8'), '.box/metadata.yaml')),
      this.zip.readEntry(boxFile, '.box/structure.yaml').then((buffer) => parseYamlRecord(buffer.toString('utf-8'), '.box/structure.yaml')),
      this.zip.readEntry(boxFile, '.box/content.yaml').then((buffer) => parseYamlRecord(buffer.toString('utf-8'), '.box/content.yaml'))
    ]);

    const normalized = this.normalizePackage(metadataRaw, structureRaw, contentRaw, entrySet);
    return {
      ...normalized,
      zipEntries: entrySet
    };
  }

  private async loadDirectoryPackage(boxDir: string): Promise<NormalizedBoxPackage> {
    const stats = await fs.stat(boxDir).catch(() => null);
    if (!stats?.isDirectory()) {
      throw createError('BOX_PACK_FAILED', `Box directory not found: ${boxDir}`, { boxDir });
    }

    const files = await collectDirectoryFiles(boxDir);
    const fileSet = new Set(files);
    for (const requiredPath of ['.box/metadata.yaml', '.box/structure.yaml', '.box/content.yaml']) {
      if (!fileSet.has(requiredPath)) {
        throw createError('BOX_SCHEMA_INVALID', `Missing required path: ${requiredPath}`, { boxDir, requiredPath });
      }
    }

    const [metadataRaw, structureRaw, contentRaw] = await Promise.all([
      fs.readFile(path.join(boxDir, '.box/metadata.yaml'), 'utf-8').then((text) => parseYamlRecord(text, '.box/metadata.yaml')),
      fs.readFile(path.join(boxDir, '.box/structure.yaml'), 'utf-8').then((text) => parseYamlRecord(text, '.box/structure.yaml')),
      fs.readFile(path.join(boxDir, '.box/content.yaml'), 'utf-8').then((text) => parseYamlRecord(text, '.box/content.yaml'))
    ]);

    return this.normalizePackage(metadataRaw, structureRaw, contentRaw, fileSet);
  }

  private validateZipEntries(entries: ZipEntryMeta[]): string[] {
    const names = new Set(entries.map((entry) => entry.path));
    const errors: string[] = [];

    for (const requiredPath of ['.box/metadata.yaml', '.box/structure.yaml', '.box/content.yaml']) {
      if (!names.has(requiredPath)) {
        errors.push(`Missing required path: ${requiredPath}`);
      }
    }

    for (const entry of entries) {
      if (entry.compressedSize !== entry.size) {
        errors.push(`ZIP entry must use store mode: ${entry.path}`);
      }
      if (entry.path.toLowerCase().endsWith('.card')) {
        errors.push(`Box package cannot embed card files: ${entry.path}`);
      }
    }

    return errors;
  }

  private normalizePackage(
    metadataRaw: Record<string, unknown>,
    structureRaw: Record<string, unknown>,
    contentRaw: Record<string, unknown>,
    knownFiles: Set<string>
  ): NormalizedBoxPackage {
    if ('box_type' in metadataRaw) {
      throw createError('BOX_SCHEMA_INVALID', 'metadata.yaml cannot contain legacy box_type.');
    }

    const metadata = this.normalizeMetadata(metadataRaw, knownFiles);
    const content = this.normalizeContent(contentRaw, knownFiles);
    const entries = this.normalizeEntries(structureRaw, knownFiles);

    if (metadata.activeLayoutType !== content.activeLayoutType) {
      throw createError('BOX_SCHEMA_INVALID', 'metadata.active_layout_type must equal content.active_layout_type.', {
        metadata: metadata.activeLayoutType,
        content: content.activeLayoutType
      });
    }

    const assets = sortObjectKeys(
      [...knownFiles].filter((filePath) => filePath.startsWith('assets/') && !filePath.endsWith('/'))
    );

    return {
      metadata,
      content,
      entries,
      assets
    };
  }

  private normalizeMetadata(raw: Record<string, unknown>, knownFiles: Set<string>): BoxMetadata {
    const chipStandardsVersion = asString(raw.chip_standards_version);
    const boxId = asString(raw.box_id);
    const name = asString(raw.name);
    const createdAt = asString(raw.created_at);
    const modifiedAt = asString(raw.modified_at);
    const activeLayoutType = asString(raw.active_layout_type);

    if (!chipStandardsVersion || !boxId || !name || !createdAt || !modifiedAt || !activeLayoutType) {
      throw createError('BOX_SCHEMA_INVALID', 'metadata.yaml is missing required fields.');
    }

    const metadata: BoxMetadata = {
      chipStandardsVersion,
      boxId: ensureBase62Id(boxId, 'metadata.box_id'),
      name,
      createdAt: ensureIsoUtc(createdAt, 'metadata.created_at'),
      modifiedAt: ensureIsoUtc(modifiedAt, 'metadata.modified_at'),
      activeLayoutType
    };

    const description = asString(raw.description);
    if (description) {
      metadata.description = description;
    }

    const tags = normalizeTags(raw.tags, 'metadata.tags');
    if (tags) {
      metadata.tags = tags;
    }

    const coverAssetValue = raw.cover_asset;
    if (typeof coverAssetValue !== 'undefined') {
      const normalizedCoverAsset = normalizeAssetPath(coverAssetValue, 'metadata.cover_asset');
      if (!knownFiles.has(normalizedCoverAsset)) {
        throw createError('BOX_SCHEMA_INVALID', `metadata.cover_asset does not exist: ${normalizedCoverAsset}`);
      }
      metadata.coverAsset = normalizedCoverAsset;
    }

    const owner = asString(raw.owner);
    if (owner) {
      metadata.owner = owner;
    }

    if (typeof raw.source !== 'undefined') {
      if (!isRecord(raw.source)) {
        throw createError('BOX_SCHEMA_INVALID', 'metadata.source must be an object.');
      }
      metadata.source = raw.source;
    }

    return metadata;
  }

  private normalizeContent(raw: Record<string, unknown>, knownFiles: Set<string>): BoxContent {
    const activeLayoutType = asString(raw.active_layout_type);
    if (!activeLayoutType) {
      throw createError('BOX_SCHEMA_INVALID', 'content.active_layout_type is required.');
    }

    const rawLayoutConfigs = raw.layout_configs;
    if (!isRecord(rawLayoutConfigs)) {
      throw createError('BOX_SCHEMA_INVALID', 'content.layout_configs must be an object.');
    }

    const layoutConfigs: Record<string, BoxLayoutConfig> = {};
    for (const [layoutType, configValue] of Object.entries(rawLayoutConfigs)) {
      if (!isRecord(configValue)) {
        throw createError('BOX_SCHEMA_INVALID', `layout config must be an object: ${layoutType}`);
      }
      const layoutConfig: BoxLayoutConfig = {};
      const schemaVersion = asString(configValue.schema_version);
      if (schemaVersion) {
        layoutConfig.schemaVersion = schemaVersion;
      }
      if (typeof configValue.props !== 'undefined') {
        if (!isRecord(configValue.props)) {
          throw createError('BOX_SCHEMA_INVALID', `layout_configs.${layoutType}.props must be an object.`);
        }
        layoutConfig.props = configValue.props;
      }
      if (typeof configValue.asset_refs !== 'undefined') {
        if (!Array.isArray(configValue.asset_refs)) {
          throw createError('BOX_SCHEMA_INVALID', `layout_configs.${layoutType}.asset_refs must be an array.`);
        }
        layoutConfig.assetRefs = configValue.asset_refs.map((item, index) => {
          const normalizedAssetPath = normalizeAssetPath(item, `layout_configs.${layoutType}.asset_refs[${index}]`);
          if (!knownFiles.has(normalizedAssetPath)) {
            throw createError('BOX_SCHEMA_INVALID', `layout asset reference not found: ${normalizedAssetPath}`);
          }
          return normalizedAssetPath;
        });
      }

      for (const [key, value] of Object.entries(configValue)) {
        if (key === 'schema_version' || key === 'props' || key === 'asset_refs') {
          continue;
        }
        layoutConfig[key] = value;
      }
      layoutConfigs[layoutType] = layoutConfig;
    }

    return {
      activeLayoutType,
      layoutConfigs
    };
  }

  private normalizeEntries(raw: Record<string, unknown>, knownFiles: Set<string>): BoxEntrySnapshot[] {
    if ('cards' in raw) {
      throw createError('BOX_SCHEMA_INVALID', 'structure.yaml cannot contain legacy cards field.');
    }
    const rawEntries = raw.entries;
    if (!Array.isArray(rawEntries)) {
      throw createError('BOX_SCHEMA_INVALID', 'structure.entries must be an array.');
    }

    const normalizedEntries: BoxEntrySnapshot[] = [];
    const seenEntryIds = new Set<string>();

    for (const [index, item] of rawEntries.entries()) {
      if (!isRecord(item)) {
        throw createError('BOX_SCHEMA_INVALID', `structure.entries[${index}] must be an object.`);
      }
      if ('internal' in item || 'external' in item || 'location' in item || 'path' in item) {
        throw createError('BOX_SCHEMA_INVALID', `structure.entries[${index}] contains legacy location fields.`);
      }

      const entryId = asString(item.entry_id);
      const url = asString(item.url);
      if (!entryId || !url || typeof item.enabled !== 'boolean') {
        throw createError('BOX_SCHEMA_INVALID', `structure.entries[${index}] is missing required fields.`);
      }
      const normalizedEntryId = ensureBase62Id(entryId, `structure.entries[${index}].entry_id`);
      if (seenEntryIds.has(normalizedEntryId)) {
        throw createError('BOX_SCHEMA_INVALID', `Duplicate box entry id: ${normalizedEntryId}`);
      }
      seenEntryIds.add(normalizedEntryId);
      this.assertSupportedUrl(url, `structure.entries[${index}].url`);

      const snapshot = this.normalizeEntrySnapshot(item.snapshot, knownFiles, index);
      const layoutHints = this.normalizeLayoutHints(item.layout_hints, index);

      normalizedEntries.push({
        entryId: normalizedEntryId,
        url,
        enabled: item.enabled,
        snapshot,
        layoutHints
      });
    }

    return normalizedEntries;
  }

  private normalizeEntrySnapshot(
    value: unknown,
    knownFiles: Set<string>,
    index: number
  ): BoxEntrySnapshot['snapshot'] {
    if (typeof value === 'undefined') {
      return {};
    }
    if (!isRecord(value)) {
      throw createError('BOX_SCHEMA_INVALID', `structure.entries[${index}].snapshot must be an object.`);
    }

    const snapshot: BoxEntrySnapshot['snapshot'] = {};
    const cardId = asString(value.card_id);
    if (cardId) {
      snapshot.cardId = cardId;
    }
    const title = asString(value.title);
    if (title) {
      snapshot.title = title;
    }
    const summary = asString(value.summary);
    if (summary) {
      snapshot.summary = summary;
    }
    const tags = normalizeTags(value.tags, `structure.entries[${index}].snapshot.tags`);
    if (tags) {
      snapshot.tags = tags;
    }
    if (typeof value.cover !== 'undefined') {
      if (!isRecord(value.cover)) {
        throw createError('BOX_SCHEMA_INVALID', `structure.entries[${index}].snapshot.cover must be an object.`);
      }
      const mode = asString(value.cover.mode);
      if (mode !== 'asset' && mode !== 'runtime' && mode !== 'none') {
        throw createError('BOX_SCHEMA_INVALID', `structure.entries[${index}].snapshot.cover.mode is invalid.`);
      }
      const cover: NonNullable<BoxEntrySnapshot['snapshot']['cover']> = {
        mode
      };
      if (mode === 'asset') {
        const assetPath = normalizeAssetPath(value.cover.asset_path, `structure.entries[${index}].snapshot.cover.asset_path`);
        if (!knownFiles.has(assetPath)) {
          throw createError('BOX_SCHEMA_INVALID', `structure.entries[${index}].snapshot.cover.asset_path not found.`);
        }
        cover.assetPath = assetPath;
      }
      const mimeType = asString(value.cover.mime_type);
      if (mimeType) {
        cover.mimeType = mimeType;
      }
      const width = asFiniteNumber(value.cover.width);
      if (typeof width !== 'undefined') {
        cover.width = width;
      }
      const height = asFiniteNumber(value.cover.height);
      if (typeof height !== 'undefined') {
        cover.height = height;
      }
      snapshot.cover = cover;
    }
    const lastKnownModifiedAt = asString(value.last_known_modified_at);
    if (lastKnownModifiedAt) {
      snapshot.lastKnownModifiedAt = ensureIsoUtc(
        lastKnownModifiedAt,
        `structure.entries[${index}].snapshot.last_known_modified_at`
      );
    }
    const contentType = asString(value.content_type);
    if (contentType) {
      snapshot.contentType = contentType;
    }

    return snapshot;
  }

  private normalizeLayoutHints(value: unknown, index: number): BoxEntrySnapshot['layoutHints'] | undefined {
    if (typeof value === 'undefined') {
      return undefined;
    }
    if (!isRecord(value)) {
      throw createError('BOX_SCHEMA_INVALID', `structure.entries[${index}].layout_hints must be an object.`);
    }

    const layoutHints: NonNullable<BoxEntrySnapshot['layoutHints']> = {};
    const sortKeyValue = value.sort_key;
    if (typeof sortKeyValue === 'string' || typeof sortKeyValue === 'number') {
      layoutHints.sortKey = sortKeyValue;
    }
    const aspectRatio = asFiniteNumber(value.aspect_ratio);
    if (typeof aspectRatio !== 'undefined') {
      layoutHints.aspectRatio = aspectRatio;
    }
    const group = asString(value.group);
    if (group) {
      layoutHints.group = group;
    }
    const priority = asFiniteNumber(value.priority);
    if (typeof priority !== 'undefined') {
      layoutHints.priority = priority;
    }

    return Object.keys(layoutHints).length > 0 ? layoutHints : undefined;
  }

  private assertSupportedUrl(value: string, field: string): void {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw createError('BOX_SCHEMA_INVALID', `${field} must be an absolute URL.`, { value });
    }

    if (!SUPPORTED_URL_SCHEMES.has(parsed.protocol)) {
      throw createError('BOX_URL_SCHEME_UNSUPPORTED', `${field} uses unsupported URL scheme.`, { value });
    }
    if (parsed.username || parsed.password) {
      throw createError('BOX_SCHEMA_INVALID', `${field} must not embed credentials.`, { value });
    }
  }

  private requireSession(sessionId: string, ownerKey: string): BoxSessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw createError('BOX_VIEW_SESSION_NOT_FOUND', `Box view session not found: ${sessionId}`, { sessionId });
    }
    if (session.ownerKey !== ownerKey) {
      throw createError('BOX_LAYOUT_ACCESS_DENIED', 'Current caller cannot access this box session.', {
        sessionId
      });
    }
    return session;
  }

  private toSessionInfo(session: BoxSessionRecord): BoxSessionInfo {
    return {
      boxId: session.metadata.boxId,
      boxFile: session.boxFile,
      name: session.metadata.name,
      activeLayoutType: session.activeLayoutType,
      availableLayouts: session.availableLayouts,
      tags: session.metadata.tags,
      coverAsset: session.metadata.coverAsset,
      capabilities: {
        listEntries: true,
        readEntryDetail: true,
        renderEntryCover: true,
        resolveEntryResource: true,
        readBoxAsset: true,
        prefetchEntries: true,
        openEntry: true
      }
    };
  }

  private listEntriesInternal(session: BoxSessionRecord, query?: BoxEntryQuery): BoxEntryPage {
    const filtered = this.applyEntryQuery(session.entries, query);
    const offset = resolvePageCursor(query?.cursor);
    const limit = resolvePageLimit(query?.limit);
    const pageItems = filtered.slice(offset, offset + limit);
    const nextOffset = offset + pageItems.length;

    return {
      items: pageItems,
      total: filtered.length,
      nextCursor: nextOffset < filtered.length ? String(nextOffset) : undefined
    };
  }

  private applyEntryQuery(entries: BoxEntrySnapshot[], query?: BoxEntryQuery): BoxEntrySnapshot[] {
    let working = [...entries];

    const filter = query?.filter;
    if (filter) {
      if (typeof filter.enabled === 'boolean') {
        working = working.filter((entry) => entry.enabled === filter.enabled);
      }
      const group = asString(filter.group);
      if (group) {
        working = working.filter((entry) => entry.layoutHints?.group === group);
      }
      const text = asString(filter.text);
      if (text) {
        const lowered = text.toLowerCase();
        working = working.filter((entry) => {
          const haystack = [entry.snapshot.title, entry.snapshot.summary, entry.url, entry.entryId]
            .filter((item): item is string => typeof item === 'string')
            .join(' ')
            .toLowerCase();
          return haystack.includes(lowered);
        });
      }
      const tags = Array.isArray(filter.tags) ? filter.tags.filter((item): item is string => typeof item === 'string') : [];
      if (tags.length > 0) {
        working = working.filter((entry) => {
          const flattened = (entry.snapshot.tags ?? []).flatMap((item) => (Array.isArray(item) ? item : [item]));
          return tags.every((tag) => flattened.includes(tag));
        });
      }
    }

    const sort = query?.sort;
    if (!sort?.key) {
      return working;
    }

    const direction = sort.direction === 'desc' ? -1 : 1;
    working.sort((left, right) => {
      const compared = compareValues(this.resolveSortValue(left, sort.key), this.resolveSortValue(right, sort.key));
      if (compared !== 0) {
        return compared * direction;
      }
      return left.entryId.localeCompare(right.entryId);
    });
    return working;
  }

  private resolveSortValue(entry: BoxEntrySnapshot, key: string): unknown {
    if (key === 'entryId') {
      return entry.entryId;
    }
    if (key === 'title') {
      return entry.snapshot.title ?? '';
    }
    if (key === 'sortKey' || key === 'layoutHints.sortKey') {
      return entry.layoutHints?.sortKey ?? '';
    }
    if (key === 'priority' || key === 'layoutHints.priority') {
      return entry.layoutHints?.priority ?? 0;
    }
    if (key === 'lastKnownModifiedAt' || key === 'snapshot.lastKnownModifiedAt') {
      return entry.snapshot.lastKnownModifiedAt ?? '';
    }

    if (key.startsWith('snapshot.')) {
      return (entry.snapshot as Record<string, unknown>)[key.slice('snapshot.'.length)];
    }
    if (key.startsWith('layoutHints.')) {
      return (entry.layoutHints as Record<string, unknown> | undefined)?.[key.slice('layoutHints.'.length)];
    }
    return '';
  }

  private resolveEntryLocator(url: string): EntryLocator {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw createError('BOX_RESOLVE_FAILED', `Invalid entry URL: ${url}`, { url });
    }

    if (!SUPPORTED_URL_SCHEMES.has(parsed.protocol)) {
      throw createError('BOX_URL_SCHEME_UNSUPPORTED', `Unsupported box entry URL scheme: ${parsed.protocol}`, { url });
    }

    if (parsed.protocol === 'file:') {
      return {
        scheme: parsed.protocol,
        url,
        filePath: fileURLToPath(parsed)
      };
    }
    return {
      scheme: parsed.protocol,
      url
    };
  }

  private async readEntryStatus(locator: EntryLocator): Promise<Record<string, unknown>> {
    if (locator.scheme === 'file:' && locator.filePath) {
      const exists = await this.pathExists(locator.filePath);
      return {
        state: exists ? 'ready' : 'missing',
        scheme: 'file',
        url: locator.url
      };
    }

    return {
      state: 'remote',
      scheme: locator.scheme.replace(/:$/, ''),
      url: locator.url
    };
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    const stats = await fs.stat(targetPath).catch(() => null);
    return Boolean(stats?.isFile());
  }

  private mimeTypeForPath(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.png') {
      return 'image/png';
    }
    if (extension === '.jpg' || extension === '.jpeg') {
      return 'image/jpeg';
    }
    if (extension === '.webp') {
      return 'image/webp';
    }
    if (extension === '.svg') {
      return 'image/svg+xml';
    }
    if (extension === '.json') {
      return 'application/json';
    }
    if (extension === '.html') {
      return 'text/html';
    }
    if (extension === '.css') {
      return 'text/css';
    }
    if (extension === '.txt' || extension === '.md') {
      return 'text/plain';
    }
    if (extension === '.box') {
      return BOX_MIME_TYPE;
    }
    if (extension === '.card') {
      return CARD_MIME_TYPE;
    }
    return 'application/octet-stream';
  }
}
