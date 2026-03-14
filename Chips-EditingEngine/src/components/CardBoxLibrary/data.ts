import yaml from 'yaml';
import type { CardTypeDefinition, LayoutTypeDefinition } from './types';
import { useTranslation } from '../../hooks/useTranslation';

interface PluginManifest {
  id?: string;
  name?: string;
  description?: string;
  icon?: string;
  tags?: string[];
  type?: string;
  cardType?: string;
  layoutType?: string;
  capabilities?: {
    cardTypes?: string[];
    layoutTypes?: string[];
  };
}

function resolveIcon(manifest: PluginManifest): string {
  const icon = manifest.icon ?? '';
  const isEmoji = icon && !icon.includes('/') && !icon.includes('.') && icon.length <= 3;
  if (isEmoji) {
    return icon;
  }
  return '🧩';
}

function parsePluginManifest(raw: unknown, path: string): PluginManifest | null {
  if (!raw) return null;
  try {
    if (path.endsWith('.json')) {
      return JSON.parse(raw as string) as PluginManifest;
    }
    return yaml.parse(raw as string) as PluginManifest;
  } catch {
    return null;
  }
}

function resolveCardTypeIds(manifest: PluginManifest): string[] {
  const capabilityIds = Array.isArray(manifest.capabilities?.cardTypes)
    ? manifest.capabilities.cardTypes
        .map((value) => String(value).trim())
        .filter(Boolean)
    : [];

  if (capabilityIds.length > 0) {
    return capabilityIds;
  }

  const fallbackId = manifest.cardType ?? manifest.id;
  return fallbackId ? [fallbackId] : [];
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const definitions = new Map<string, T>();
  for (const item of items) {
    if (!definitions.has(item.id)) {
      definitions.set(item.id, item);
    }
  }
  return Array.from(definitions.values());
}

// 动态加载所有基础卡片插件和布局插件的清单
const manifestModules = import.meta.glob('../../../../Chips-BaseCardPlugin/**/manifest.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const layoutManifestModules = {
  ...import.meta.glob('../../../../LayoutPlugin/**/manifest.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../../LayoutPlugin/**/manifest.yaml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../../LayoutPlugin/**/manifest.yml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../../layout-plugin/**/manifest.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};

export const cardTypes: CardTypeDefinition[] = dedupeById(
  Object.entries(manifestModules)
    .map(([path, raw]) => parsePluginManifest(raw, path))
    .filter((manifest): manifest is PluginManifest => Boolean(manifest))
    .filter((manifest) => manifest.type === 'card')
    .flatMap((manifest) => {
      const name = manifest.name ?? manifest.id ?? 'unknown';
      const description = manifest.description ?? '';

      return resolveCardTypeIds(manifest).map((id) => ({
        id,
        name,
        icon: resolveIcon(manifest),
        description,
        keywords: [name, description, id, manifest.id ?? '', ...(manifest.tags ?? [])]
          .filter(Boolean)
          .map((item) => String(item)),
      }));
    })
)
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

export const layoutTypes: LayoutTypeDefinition[] = Object.entries(layoutManifestModules)
  .map(([path, raw]) => parsePluginManifest(raw, path))
  .filter((manifest): manifest is PluginManifest => Boolean(manifest))
  .filter((manifest) => manifest.type === 'layout')
  .map((manifest) => {
    const id = manifest.layoutType ?? manifest.id ?? 'unknown';
    const name = manifest.name ?? id;
    const description = manifest.description ?? '';
    const keywords = [name, description, id, ...(manifest.tags ?? [])]
      .filter(Boolean)
      .map((item) => String(item));

    return {
      id,
      name,
      icon: resolveIcon(manifest),
      description,
      keywords,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

export function useSearchCardTypes() {
  const { t } = useTranslation();

  return (query: string): CardTypeDefinition[] => {
    if (!query.trim()) return cardTypes;

    const lowerQuery = query.toLowerCase();
    return cardTypes.filter((type) => {
      const name = (t(type.name) || type.name).toLowerCase();
      const description = (t(type.description) || type.description).toLowerCase();
      const keywords = type.keywords.map((keyword) => (t(keyword) || keyword).toLowerCase());
      return (
        name.includes(lowerQuery) ||
        description.includes(lowerQuery) ||
        keywords.some((keyword) => keyword.includes(lowerQuery))
      );
    });
  };
}

export function useSearchLayoutTypes() {
  const { t } = useTranslation();

  return (query: string): LayoutTypeDefinition[] => {
    if (!query.trim()) return layoutTypes;

    const lowerQuery = query.toLowerCase();
    return layoutTypes.filter((type) => {
      const name = (t(type.name) || type.name).toLowerCase();
      const description = (t(type.description) || type.description).toLowerCase();
      const keywords = type.keywords.map((keyword) => (t(keyword) || keyword).toLowerCase());
      return (
        name.includes(lowerQuery) ||
        description.includes(lowerQuery) ||
        keywords.some((keyword) => keyword.includes(lowerQuery))
      );
    });
  };
}
