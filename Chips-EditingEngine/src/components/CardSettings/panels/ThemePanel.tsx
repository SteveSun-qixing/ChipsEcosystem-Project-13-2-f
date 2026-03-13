import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import './ThemePanel.css';

// import { getEditorSdk } from '@/services/sdk-service';

export interface ThemePanelProps {
  value: string;
  onChange: (themeId: string) => void;
}

export function ThemePanel({ value, onChange }: ThemePanelProps) {
  const { t } = useTranslation();

  const DEFAULT_THEME_ID = 'default-light';

  const THEME_NAME_KEY_MAP: Record<string, string> = {
    'default-light': 'card_settings.theme_default_light',
    'default-dark': 'card_settings.theme_default_dark',
  };

  const [themes, setThemes] = useState<{ id: string; name: string; installed: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const selectedTheme = value || DEFAULT_THEME_ID;

  const selectTheme = (themeId: string) => {
    onChange(themeId);
  };

  const loadThemes = async () => {
    setIsLoading(true);
    try {
      // Mock SDK response
      // const sdk = await getEditorSdk();
      // const themeList = sdk.themes.listThemes();
      const themeList = [
        { id: 'default-light', name: '默认浅色', installed: true },
        { id: 'default-dark', name: '默认深色', installed: true },
      ];

      if (themeList.length > 0) {
        setThemes(themeList.map(theme => ({
          ...theme,
          name: t(THEME_NAME_KEY_MAP[theme.id]) || theme.name,
        })));
      } else {
        setThemes([{
          id: DEFAULT_THEME_ID,
          name: t('card_settings.theme_default_light') || '默认浅色',
          installed: true,
        }]);
      }
    } catch (error) {
      console.error('Failed to load themes:', error);
      setThemes([{
        id: DEFAULT_THEME_ID,
        name: t('card_settings.theme_default_light') || '默认浅色',
        installed: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadThemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (themes.length > 0 && !themes.some(th => th.id === selectedTheme)) {
      selectTheme(themes[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themes, selectedTheme]);

  const handleUploadTheme = () => {
    alert(t('card_settings.theme_upload_coming') || '主体上传功能开发中...');
  };

  return (
    <div className="theme-panel">
      <div className="theme-panel__header">
        <label className="theme-panel__label">
          {t('card_settings.theme_select') || '选择主题'}
        </label>
        <button
          type="button"
          className="theme-panel__upload-btn"
          onClick={handleUploadTheme}
        >
          📤 {t('card_settings.theme_upload') || '导入主题'}
        </button>
      </div>

      {isLoading ? (
        <div className="theme-panel__loading">
          <span className="theme-panel__loading-text">
            {t('card_settings.theme_loading') || '加载中...'}
          </span>
        </div>
      ) : (
        <div className="theme-panel__grid">
          {themes.map(theme => (
            <button
              key={theme.id}
              type="button"
              className={`theme-panel__item ${selectedTheme === theme.id ? 'theme-panel__item--selected' : ''}`}
              onClick={() => selectTheme(theme.id)}
            >
              <span className="theme-panel__item-preview" />
              <span className="theme-panel__item-name">{theme.name}</span>
              {selectedTheme === theme.id && (
                <span
                  className="theme-panel__item-check"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {themes.length <= 1 && !isLoading && (
        <div className="theme-panel__hint">
          <span className="theme-panel__hint-icon">💡</span>
          <span className="theme-panel__hint-message">
            {t('card_settings.theme_hint') || '可前往插件市场下载更多主题。'}
          </span>
        </div>
      )}
    </div>
  );
}
