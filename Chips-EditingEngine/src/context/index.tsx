import React, { ReactNode } from 'react';
import { EditorProvider } from './EditorContext';
import { CardProvider } from './CardContext';
import { UIProvider } from './UIContext';
import { SettingsProvider } from './SettingsContext';
import { EditorRuntimeProvider } from '../editor-runtime/context';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <SettingsProvider>
            <UIProvider>
                <EditorProvider>
                    <EditorRuntimeProvider>
                        <CardProvider>
                            {children}
                        </CardProvider>
                    </EditorRuntimeProvider>
                </EditorProvider>
            </UIProvider>
        </SettingsProvider>
    );
}
