const CARD_MIME_TYPE = 'application/vnd.chips.card+zip';

function toFileModuleUrl(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`);
  }
  return encodeURI(`file://${normalized.startsWith('/') ? normalized : `/${normalized}`}`);
}

function normalizeLayoutCacheKey(plugin) {
  return [
    plugin.id,
    plugin.version ?? '',
    plugin.installPath ?? '',
    plugin.entry ?? '',
    plugin.layout?.layoutType ?? '',
  ].join('::');
}

function isEnabledLayoutPlugin(record, layoutType) {
  return record.type === 'layout'
    && record.enabled
    && typeof record.entry === 'string'
    && record.entry.trim().length > 0
    && typeof record.installPath === 'string'
    && record.installPath.trim().length > 0
    && record.layout?.layoutType === layoutType;
}

async function defaultLayoutModuleLoader(moduleUrl) {
  return import(/* @vite-ignore */ moduleUrl);
}

function toLayoutDefinition(plugin, module) {
  const definition = module.layoutDefinition;
  if (!definition) {
    throw new Error(`布局插件未导出 layoutDefinition: ${plugin.id}`);
  }
  if (definition.layoutType !== plugin.layout?.layoutType) {
    throw new Error(`布局插件 layoutType 与 manifest 不一致: ${plugin.id}`);
  }
  if (typeof definition.createDefaultConfig !== 'function') {
    throw new Error(`布局插件缺少 createDefaultConfig: ${plugin.id}`);
  }
  if (typeof definition.normalizeConfig !== 'function') {
    throw new Error(`布局插件缺少 normalizeConfig: ${plugin.id}`);
  }
  if (typeof definition.validateConfig !== 'function') {
    throw new Error(`布局插件缺少 validateConfig: ${plugin.id}`);
  }
  if (typeof definition.renderView !== 'function') {
    throw new Error(`布局插件缺少 renderView: ${plugin.id}`);
  }
  return definition;
}

const layoutDescriptorCache = new Map();

function compareValues(left, right) {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function resolvePageCursor(cursor) {
  if (typeof cursor !== 'string' || cursor.trim().length === 0) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function resolvePageLimit(limit) {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return 24;
  }
  return Math.max(1, Math.min(200, Math.floor(limit)));
}

function pageEntries(entries, query) {
  const list = [...entries];
  if (query?.sort?.key) {
    const direction = query.sort.direction === 'desc' ? -1 : 1;
    list.sort((left, right) => {
      const key = query.sort.key;
      const leftValue = left.layoutHints?.[key] ?? left.snapshot?.[key] ?? left[key];
      const rightValue = right.layoutHints?.[key] ?? right.snapshot?.[key] ?? right[key];
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

export function clearLayoutDefinitionCache() {
  layoutDescriptorCache.clear();
}

export async function loadLayoutDescriptor(client, layoutType) {
  const installedPlugins = await client.plugin.query({ type: 'layout' });
  const plugin = installedPlugins.find((record) => isEnabledLayoutPlugin(record, layoutType));
  if (!plugin || typeof plugin.entry !== 'string') {
    throw new Error(`未找到已启用的布局插件: ${layoutType}`);
  }

  const cacheKey = normalizeLayoutCacheKey(plugin);
  const cached = layoutDescriptorCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const entryPath = `${plugin.installPath}/${plugin.entry}`
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
  const moduleUrl = toFileModuleUrl(entryPath);
  const loaded = await defaultLayoutModuleLoader(moduleUrl);
  const descriptor = {
    plugin,
    moduleUrl,
    layoutDefinition: toLayoutDefinition(plugin, loaded),
  };
  layoutDescriptorCache.set(cacheKey, descriptor);
  return descriptor;
}

export async function loadLayoutDefinition(client, layoutType) {
  const descriptor = await loadLayoutDescriptor(client, layoutType);
  return descriptor.layoutDefinition;
}

export function createBoxLayoutRuntime(client, sessionId) {
  return {
    listEntries(query) {
      return client.box.listEntries(sessionId, query);
    },
    readEntryDetail(request) {
      return client.box.readEntryDetail(sessionId, request.entryIds, request.fields);
    },
    resolveEntryResource(request) {
      return client.box.resolveEntryResource(sessionId, request.entryId, request.resource);
    },
    readBoxAsset(assetPath) {
      return client.box.readBoxAsset(sessionId, assetPath);
    },
    async prefetchEntries(request) {
      await client.box.prefetchEntries(sessionId, request.entryIds, request.targets);
    },
  };
}

export function createInMemoryBoxLayoutRuntime(options) {
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

        const detail = {};
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
          detail.cardMetadata = {
            cardId: entry.snapshot.cardId,
            title: entry.snapshot.title,
            summary: entry.snapshot.summary,
            tags: entry.snapshot.tags,
          };
        }

        return {
          entryId,
          detail,
        };
      });
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

      if (request.resource.kind === 'cardFile') {
        return {
          resourceUrl: entry.url,
          mimeType: CARD_MIME_TYPE,
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
  };
}
