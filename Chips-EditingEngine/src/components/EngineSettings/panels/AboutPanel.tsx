import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppBrandIcon } from '../../../icons/AppBrandIcon';
import './AboutPanel.css';

export function AboutPanel() {
  const { t } = useTranslation();

  const appInfo = {
    name: t('engine_settings.about_app_name') || 'Chips 编辑引擎',
    version: '0.1.0',
    protocolVersion: '1.0.0',
    license: 'MIT',
    techStack: 'React + TypeScript + Zustand + Vite',
    homepage: 'https://github.com/SteveSun-qixing/PotatoEcosystem-Editor',
    copyright: '© 2026 Chips Ecosystem',
  };

  return (
    <div className="about-panel">
      <div className="settings-panel-header">
        <h3 className="settings-panel-header__title">
          {t('engine_settings.about_title') || '关于'}
        </h3>
      </div>

      <div className="about-hero">
        <div className="about-hero__icon">
          <AppBrandIcon className="about-hero__icon-image" aria-hidden="true" />
        </div>
        <h2 className="about-hero__name">{appInfo.name}</h2>
        <span className="about-hero__version">v{appInfo.version}</span>
      </div>

      <div className="settings-info-list">
        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_version') || '版本'}
          </span>
          <span className="settings-info-item__value">
            {appInfo.version}
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_protocol_version') || '协议版本'}
          </span>
          <span className="settings-info-item__value">
            {appInfo.protocolVersion}
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_license') || '开源协议'}
          </span>
          <span className="settings-info-item__value">
            {appInfo.license}
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_tech_stack') || '技术栈'}
          </span>
          <span className="settings-info-item__value">
            {appInfo.techStack}
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_homepage') || '主页'}
          </span>
          <span className="settings-info-item__value">
            <a href={appInfo.homepage} target="_blank" rel="noopener noreferrer">
              {appInfo.homepage}
            </a>
          </span>
        </div>

        <div className="settings-info-item">
          <span className="settings-info-item__label">
            {t('engine_settings.about_copyright') || '版权信息'}
          </span>
          <span className="settings-info-item__value">
            {appInfo.copyright}
          </span>
        </div>
      </div>
    </div>
  );
}
