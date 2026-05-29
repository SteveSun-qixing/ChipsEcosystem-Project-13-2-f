import type { BoxEntrySnapshot } from 'chips-sdk';
import type { BoxLayoutRuntime, InMemoryBoxLayoutRuntimeOptions } from './contracts';

const BOX_MIME_TYPE = 'application/vnd.chips.box+zip';
const CARD_MIME_TYPE = 'application/vnd.chips.card+zip';

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function resolvePageCursor(cursor: string | undefined): number {
  if (typeof cursor !== 'string' || cursor.trim().length === 0) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function resolvePageLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return 24;
  }
  return Math.max(1, Math.min(200, Math.floor(limit)));
}

function pageEntries(entries: BoxEntrySnapshot[], query: Parameters<BoxLayoutRuntime['listEntries']>[0]) {
  const list = [...entries];
  if (query?.sort?.key) {
    const direction = query.sort.direction === 'desc' ? -1 : 1;
    list.sort((left, right) => {
      const key = query.sort?.key ?? '';
      const leftValue = left.layoutHints?.[key] ?? left.snapshot?.[key as keyof typeof left.snapshot] ?? left[key as keyof BoxEntrySnapshot];
      const rightValue = right.layoutHints?.[key] ?? right.snapshot?.[key as keyof typeof right.snapshot] ?? right[key as keyof BoxEntrySnapshot];
      return compareValues(leftValue, rightValue) * direction;
    });
  }

  const cursor = resolvePageCursor(query?.cursor);
  const limit = resolvePageLimit(query?.limit);
  const items = list.slice(cursor, cursor + limit);
  const nextIndex = cursor + items.length;

  return {
    items,
    total: list.length,
    nextCursor: nextIndex < list.length ? String(nextIndex) : undefined,
  };
}

export function createInMemoryBoxLayoutRuntime(options: InMemoryBoxLayoutRuntimeOptions): BoxLayoutRuntime {
  const getEntries = () => options.getEntries();

  return {
    async listEntries(query) {
      return pageEntries(getEntries(), query);
    },
    async readEntryDetail(request) {
      return request.entryIds.map((entryId) => {
        const entry = getEntries().find((item) => item.entryId === entryId);
        if (!entry) {
          throw new Error(`箱子条目不存在: ${entryId}`);
        }

        const detail: Record<string, unknown> = {};
        for (const field of request.fields) {
          if (field === 'coverDescriptor') {
            detail.coverDescriptor = entry.snapshot.cover ?? { mode: 'none' };
            continue;
          }
          if (field === 'previewDescriptor') {
            detail.previewDescriptor = entry.snapshot.cover ?? { mode: 'none' };
            continue;
          }
          if (field === 'runtimeProps') {
            detail.runtimeProps = {
              url: entry.url,
              enabled: entry.enabled,
            };
            continue;
          }
          if (field === 'status') {
            detail.status = {
              state: entry.enabled ? 'ready' : 'disabled',
            };
            continue;
          }
          detail.documentInfo = {
            documentId: entry.snapshot.documentId,
            title: entry.snapshot.title,
            summary: entry.snapshot.summary,
            tags: entry.snapshot.tags,
            contentType: entry.snapshot.contentType,
          };
        }

        return {
          entryId,
          detail,
        };
      });
    },
    async renderEntryCover(entryId) {
      if (options.renderEntryCover) {
        return options.renderEntryCover(entryId);
      }

      const entry = getEntries().find((item) => item.entryId === entryId);
      if (!entry) {
        throw new Error(`箱子条目不存在: ${entryId}`);
      }

      if (entry.snapshot.cover?.mode === 'asset' && entry.snapshot.cover.assetPath) {
        const asset = await options.readBoxAsset(entry.snapshot.cover.assetPath);
        return {
          title: entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId,
          coverUrl: asset.resourceUrl,
          mimeType: entry.snapshot.cover.mimeType ?? asset.mimeType,
          ratio:
            typeof entry.snapshot.cover.width === 'number' && typeof entry.snapshot.cover.height === 'number'
              ? `${entry.snapshot.cover.width}:${entry.snapshot.cover.height}`
              : undefined,
        };
      }

      throw new Error(`当前预览运行时不支持动态封面渲染: ${entryId}`);
    },
    async resolveEntryResource(request) {
      const entry = getEntries().find((item) => item.entryId === request.entryId);
      if (!entry) {
        throw new Error(`箱子条目不存在: ${request.entryId}`);
      }

      if ((request.resource.kind === 'cover' || request.resource.kind === 'preview')
        && entry.snapshot.cover?.mode === 'asset'
        && entry.snapshot.cover.assetPath) {
        return options.readBoxAsset(entry.snapshot.cover.assetPath);
      }

      if (request.resource.kind === 'documentFile') {
        return {
          resourceUrl: entry.url,
          mimeType: entry.snapshot.contentType === 'chips/box' ? BOX_MIME_TYPE : CARD_MIME_TYPE,
        };
      }

      if (request.resource.kind === 'custom' && request.resource.key) {
        return options.readBoxAsset(request.resource.key);
      }

      throw new Error(`当前预览运行时不支持资源类型: ${request.resource.kind}`);
    },
    readBoxAsset(assetPath) {
      return options.readBoxAsset(assetPath);
    },
    async prefetchEntries() {
      return undefined;
    },
    async openEntry(entryId) {
      if (!options.openEntry) {
        throw new Error(`当前预览运行时不支持打开箱子条目: ${entryId}`);
      }
      return options.openEntry(entryId);
    },
  };
}
