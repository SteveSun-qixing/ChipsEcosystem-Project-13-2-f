import React from 'react';
import { getInstalledBasecardDescriptors, subscribeBasecardRegistry } from '../../basecard-runtime/registry';
import type { BoxLayoutDescriptor } from 'chips-sdk';
import type { CardTypeDefinition, LayoutTypeDefinition } from './types';
import { useTranslation } from '../../hooks/useTranslation';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { getChipsClient } from '../../services/bridge-client';

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

function toLayoutTypeDefinitions(descriptors: BoxLayoutDescriptor[]): LayoutTypeDefinition[] {
  return descriptors
    .map((descriptor) => ({
      id: descriptor.layoutType,
      name: descriptor.displayName,
      icon: descriptor.icon ?? ENGINE_ICONS.layout,
      description: descriptor.description ?? '',
      keywords: [
        descriptor.displayName,
        descriptor.description ?? '',
        descriptor.layoutType,
        descriptor.pluginId,
      ].filter(Boolean),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
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
    let disposed = false;

    const load = async () => {
      const descriptors = await client.box.listLayoutDescriptors();
      if (!disposed) {
        setLayoutTypes(toLayoutTypeDefinitions(descriptors));
      }
    };

    void load().catch((error) => {
      console.error('[CardBoxLibrary] Failed to load layout descriptors.', error);
      if (!disposed) {
        setLayoutTypes([]);
      }
    });

    if (!client.events || typeof client.events.on !== 'function') {
      return () => {
        disposed = true;
      };
    }

    const refresh = () => {
      void load().catch((error) => {
        console.error('[CardBoxLibrary] Failed to refresh layout descriptors.', error);
      });
    };

    const unsubscribeInstalled = client.events.on('plugin.installed', refresh);
    const unsubscribeEnabled = client.events.on('plugin.enabled', refresh);
    const unsubscribeDisabled = client.events.on('plugin.disabled', refresh);
    const unsubscribeUninstalled = client.events.on('plugin.uninstalled', refresh);

    return () => {
      disposed = true;
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
