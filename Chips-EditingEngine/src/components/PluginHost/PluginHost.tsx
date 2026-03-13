import React, { useState, useEffect, useRef } from 'react';
import { useCard } from '../../context/CardContext';
import { useTranslation } from '../../hooks/useTranslation';
import './PluginHost.css';

export interface PluginHostProps {
    cardType: string;
    baseCardId: string;
    config: Record<string, unknown>;
    onConfigChange?: (config: Record<string, unknown>) => void;
    onPluginLoaded?: () => void;
    onPluginError?: (error: Error) => void;
}

export function PluginHost({
    cardType,
    baseCardId,
    config,
    onConfigChange,
    onPluginLoaded,
    onPluginError
}: PluginHostProps) {
    const { openCards, activeCardId } = useCard();
    const { t } = useTranslation();

    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<Error | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const activeCard = activeCardId ? openCards.get(activeCardId) : undefined;
    const currentBaseCard = activeCard?.structure?.structure?.find((bc: any) => bc.id === baseCardId);

    useEffect(() => {
        setIsLoading(true);
        setLoadError(null);

        // Simulate plugin loading which normally happens via remote sandbox component
        const timer = setTimeout(() => {
            // For now, we don't have an active sandboxed plugin backend, so just simulate a successful connection
            setIsLoading(false);
            onPluginLoaded?.();
        }, 800);

        return () => clearTimeout(timer);
    }, [cardType, baseCardId, onPluginLoaded]);

    const handleReload = () => {
        setIsLoading(true);
        setLoadError(null);
        setTimeout(() => {
            setIsLoading(false);
        }, 800);
    };

    // Setup message passing with iframe sandbox
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

            const { type, payload } = event.data;
            if (type === 'chips:config-change') {
                setHasUnsavedChanges(true);
                onConfigChange?.(payload);
            } else if (type === 'chips:plugin-ready') {
                setIsLoading(false);
                onPluginLoaded?.();
            } else if (type === 'chips:plugin-error') {
                setIsLoading(false);
                const err = new Error(payload.message || 'Unknown plugin error');
                setLoadError(err);
                onPluginError?.(err);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onConfigChange, onPluginLoaded, onPluginError]);

    return (
        <div className="plugin-host">
            {isLoading && (
                <div className="plugin-host__loading">
                    <div className="plugin-host__spinner"></div>
                    <span className="plugin-host__loading-text">{t('plugin_host.loading') || 'Loading Plugin...'}</span>
                </div>
            )}

            {!isLoading && loadError && (
                <div className="plugin-host__error">
                    <div className="plugin-host__error-icon">⚠️</div>
                    <p className="plugin-host__error-text">
                        {loadError.message || t('plugin_host.error') || 'Failed to load plugin'}
                    </p>
                    <button
                        className="plugin-host__retry-btn"
                        type="button"
                        onClick={handleReload}
                    >
                        {t('plugin_host.retry') || 'Retry'}
                    </button>
                </div>
            )}

            {!isLoading && !loadError && (
                <div className="plugin-host__container">
                    {/* Here we would inject the actual sandboxed editor */}
                    <div className="plugin-host__placeholder">
                        <div className="plugin-host__sandbox-info">
                            <h3>{cardType} Editor</h3>
                            <p>Sandboxed Content Area</p>
                            <code>BaseCard: {baseCardId}</code>
                        </div>
                        {/* 
               Uncomment when ready to load real sandboxes:
               <iframe
                 ref={iframeRef}
                 src={`chips-plugin://${cardType}/editor.html`}
                 sandbox="allow-scripts allow-forms allow-popups"
                 className="plugin-host__iframe"
               /> 
             */}
                    </div>
                </div>
            )}

            {hasUnsavedChanges && (
                <div
                    className="plugin-host__unsaved-indicator"
                    title={t('plugin_host.unsaved') || 'Unsaved Changes'}
                >
                    <span className="plugin-host__unsaved-dot"></span>
                </div>
            )}
        </div>
    );
}
