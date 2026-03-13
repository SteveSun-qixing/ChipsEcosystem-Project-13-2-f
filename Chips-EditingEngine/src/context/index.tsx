import React, { ReactNode } from 'react';
import { EditorProvider } from './EditorContext';
import { CardProvider } from './CardContext';
import { UIProvider } from './UIContext';
import { SettingsProvider } from './SettingsContext';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <SettingsProvider>
            <UIProvider>
                <EditorProvider>
                    <CardProvider>
                        {children}
                    </CardProvider>
                </EditorProvider>
            </UIProvider>
        </SettingsProvider>
    );
}
