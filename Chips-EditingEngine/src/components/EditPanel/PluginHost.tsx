import React from 'react';
import type { BasecardResourceOperations } from '../../basecard-runtime/contracts';
import { EditorHost } from '../../editor-runtime/EditorHost';
import './PluginHost.css';

export interface PluginHostProps {
  cardId?: string;
  cardPath: string;
  cardType: string;
  baseCardId: string;
  config: Record<string, unknown>;
  onConfigChange?: (
    config: Record<string, unknown>,
    resourceOperations?: BasecardResourceOperations,
  ) => void | Promise<void>;
  onPluginLoaded?: (pluginInfo: any) => void;
  onPluginError?: (error: Error) => void;
}

export function PluginHost({
  cardId,
  cardPath,
  cardType,
  baseCardId,
  config,
  onConfigChange,
  onPluginLoaded,
  onPluginError,
}: PluginHostProps) {
  if (!cardId) {
    return null;
  }

  return (
    <EditorHost
      cardId={cardId}
      cardPath={cardPath}
      cardType={cardType}
      baseCardId={baseCardId}
      sourceConfig={config}
      onConfigChange={onConfigChange}
      onPluginLoaded={onPluginLoaded}
      onPluginError={onPluginError}
    />
  );
}
