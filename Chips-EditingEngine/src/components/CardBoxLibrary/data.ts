import React from 'react';
import type { PluginRecord } from 'chips-sdk';
import { loadLayoutDefinition } from 'chips-box-layout-host';
import { getInstalledBasecardDescriptors, subscribeBasecardRegistry } from '../../basecard-runtime/registry';
import { getChipsClient } from '../../services/bridge-client';
import type { CardTypeDefinition, LayoutTypeDefinition } from './types';
import { useTranslation } from '../../hooks/useTranslation';
import { ENGINE_ICONS } from '../../icons/descriptors';

function createCardTypeDefinitions(): CardTypeDefinition[] {
  return getInstalledBasecardDescriptors()
    .map((descriptor) => ({
      id: descriptor.cardType,
      name: descriptor.displayName,
      icon: descriptor.icon ?? ENGINE_ICONS.card,
      description: descriptor.description ?? '',
      keywords: [
        descriptor.displayName,
        descriptor.description ?? '',
        descriptor.cardType,
        descriptor.pluginId,
        ...(descriptor.aliases ?? []),
      ].filter(Boolean),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

async function createLayoutTypeDefinitions(
  client: ReturnType<typeof getChipsClient>,
  records: PluginRecord[],
): Promise<LayoutTypeDefinition[]> {
  const definitions = await Promise.all(records
    .filter((record) => record.type === 'layout' && record.enabled)
    .map(async (record) => {
      const layoutType = record.layout?.layoutType ?? record.id;
      let name = record.layout?.displayName ?? record.name;
      let icon = ENGINE_ICONS.layout;

      if (record.layout?.layoutType) {
        try {
          const layoutDefinition = await loadLayoutDefinition(client, record.layout.layoutType);
          name = layoutDefinition.displayName || name;
          icon = layoutDefinition.icon ?? icon;
        } catch (error) {
          console.error('[CardBoxLibrary] Failed to load layout definition metadata.', error);
        }
      }

      return {
        id: layoutType,
        name,
        icon,
        description: record.description ?? '',
        keywords: [
          record.name,
          record.description ?? '',
          record.id,
          record.layout?.layoutType ?? '',
          ...(record.capabilities ?? []),
        ].filter(Boolean),
      };
    }));

  return definitions.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

export function useCardTypeDefinitions(): CardTypeDefinition[] {
  const [cardTypes, setCardTypes] = React.useState<CardTypeDefinition[]>(() => createCardTypeDefinitions());

  React.useEffect(() => {
    setCardTypes(createCardTypeDefinitions());
    return subscribeBasecardRegistry(() => {
      setCardTypes(createCardTypeDefinitions());
    });
  }, []);

  return cardTypes;
}

export function useLayoutTypeDefinitions(): LayoutTypeDefinition[] {
  const client = React.useMemo(() => getChipsClient(), []);
  const [layoutTypes, setLayoutTypes] = React.useState<LayoutTypeDefinition[]>([]);

  React.useEffect(() => {
    let active = true;

    const refresh = async () => {
      const plugins = await client.plugin.query({ type: 'layout' });
      if (!active) {
        return;
      }
      const nextLayoutTypes = await createLayoutTypeDefinitions(client, plugins);
      if (!active) {
        return;
      }
      setLayoutTypes(nextLayoutTypes);
    };

    void refresh().catch((error) => {
      console.error('[CardBoxLibrary] Failed to load installed layout plugins.', error);
      if (active) {
        setLayoutTypes([]);
      }
    });

    const refreshSafe = () => {
      void refresh().catch((error) => {
        console.error('[CardBoxLibrary] Failed to refresh installed layout plugins.', error);
      });
    };

    const unsubscribeInstalled = client.events.on('plugin.installed', refreshSafe);
    const unsubscribeEnabled = client.events.on('plugin.enabled', refreshSafe);
    const unsubscribeDisabled = client.events.on('plugin.disabled', refreshSafe);
    const unsubscribeUninstalled = client.events.on('plugin.uninstalled', refreshSafe);

    return () => {
      active = false;
      unsubscribeInstalled();
      unsubscribeEnabled();
      unsubscribeDisabled();
      unsubscribeUninstalled();
    };
  }, [client]);

  return layoutTypes;
}

export function useSearchCardTypes() {
  const { t } = useTranslation();
  const cardTypes = useCardTypeDefinitions();

  return React.useCallback((query: string): CardTypeDefinition[] => {
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
  }, [cardTypes, t]);
}

export function useSearchLayoutTypes() {
  const { t } = useTranslation();
  const layoutTypes = useLayoutTypeDefinitions();

  return React.useCallback((query: string): LayoutTypeDefinition[] => {
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
  }, [layoutTypes, t]);
}
