import React, { useRef, useMemo, useEffect } from 'react';
import type { TemplateStyle, TemplateConfig } from './types';
import { generateCoverHtml, getTemplateById } from './templates/index';
import { useTranslation } from '../../hooks/useTranslation';
import './TemplatePreview.css';

interface TemplatePreviewProps {
  templateId: TemplateStyle | null;
  config: TemplateConfig;
  aspectRatio?: string;
  customHtml?: string;
  onHtmlGenerated?: (html: string) => void;
}

export function TemplatePreview({
  templateId,
  config,
  aspectRatio = '3/4',
  customHtml,
  onHtmlGenerated,
}: TemplatePreviewProps) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getPlaceholderHtml = () => {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <span>${t('cover_maker.preview_empty') || '预览区'}</span>
</body>
</html>`;
  };

  const generatedHtml = useMemo(() => {
    if (customHtml) {
      return customHtml;
    }

    if (!templateId || !config.title) {
      return getPlaceholderHtml();
    }

    try {
      return generateCoverHtml(templateId, config);
    } catch {
      return getPlaceholderHtml();
    }
  }, [templateId, config, customHtml, t]);

  const currentTemplate = useMemo(() => {
    if (!templateId) return null;
    return getTemplateById(templateId);
  }, [templateId]);

  const updateIframeContent = () => {
    if (!iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(generatedHtml);
    doc.close();

    if (templateId && config.title && onHtmlGenerated) {
      onHtmlGenerated(generatedHtml);
    }
  };

  useEffect(() => {
    updateIframeContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedHtml, templateId, config.title]);

  return (
    <div className="template-preview">
      <div className="template-preview__header">
        <span className="template-preview__label">{t('cover_maker.preview_label') || '预览效果'}</span>
        {currentTemplate && (
          <span className="template-preview__template-name">
            {t(currentTemplate.name) || currentTemplate.name}
          </span>
        )}
      </div>

      <div
        className="template-preview__container"
        style={{ aspectRatio }}
      >
        <iframe
          ref={iframeRef}
          className="template-preview__iframe"
          sandbox="allow-same-origin"
          title={t('cover_maker.preview_label') || '预览区'}
        />
      </div>

      <div className="template-preview__info">
        <span className="template-preview__ratio">
          {t('cover_maker.preview_ratio', { ratio: aspectRatio.replace('/', ':') }) || `比例 ${aspectRatio.replace('/', ':')}`}
        </span>
      </div>
    </div>
  );
}
