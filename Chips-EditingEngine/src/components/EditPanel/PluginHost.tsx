import React from 'react';
import { EditorHost } from '../../editor-runtime/EditorHost';
import './PluginHost.css';

export interface PluginHostProps {
  cardId?: string;
  cardType: string;
  baseCardId: string;
  config: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  onPluginLoaded?: (pluginInfo: any) => void;
  onPluginError?: (error: Error) => void;
}

export function PluginHost({
  cardId,
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
      cardType={cardType}
      baseCardId={baseCardId}
      sourceConfig={config}
      onConfigChange={onConfigChange}
      onPluginLoaded={onPluginLoaded}
      onPluginError={onPluginError}
    />
  );
}
