import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChipsButton, ChipsInput } from '@chips/component-library';
import { useTranslation } from '../../hooks/useTranslation';
import type {
  CoverCreationMode,
  TemplateStyle,
  TemplateConfig,
  CoverData,
  CoverMakerProps,
} from './types';
import { TemplateGrid } from './TemplateGrid';
import { TemplatePreview } from './TemplatePreview';
import { generateImageCoverHtml } from './templates/index';
import './CoverMaker.css';

export function CoverMaker({
  cardId,
  currentCoverHtml,
  visible,
  onClose,
  onSave,
  onPreview,
}: CoverMakerProps) {
  const { t } = useTranslation();

  const [currentMode, setCurrentMode] = useState<CoverCreationMode>('template');

  const modeOptions = useMemo(() => [
    { id: 'image' as CoverCreationMode, name: t('cover_maker.mode_image') || '图片封面', icon: '🖼️', description: t('cover_maker.mode_image_desc') || '上传图片' },
    { id: 'html' as CoverCreationMode, name: t('cover_maker.mode_html') || 'HTML封面', icon: '📝', description: t('cover_maker.mode_html_desc') || '手写HTML代码' },
    { id: 'zip' as CoverCreationMode, name: t('cover_maker.mode_zip') || 'ZIP封面', icon: '📦', description: t('cover_maker.mode_zip_desc') || '上传ZIP文件' },
    { id: 'template' as CoverCreationMode, name: t('cover_maker.mode_template') || '模板', icon: '🎨', description: t('cover_maker.mode_template_desc') || '使用模板生成' },
  ], [t]);

  // Image mode state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // HTML mode state
  const [htmlCode, setHtmlCode] = useState('');

  // ZIP mode state
  const [selectedZip, setSelectedZip] = useState<File | null>(null);
  const [zipFileName, setZipFileName] = useState<string | null>(null);

  // Template mode state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle | null>('minimal-white');
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({
    title: '',
    subtitle: '',
    author: '',
    date: '',
  });

  const [generatedHtml, setGeneratedHtml] = useState<string>('');

  const coverRatios = useMemo(() => [
    { value: '1/1', label: t('cover_maker.ratio_square') || '1:1 正方形' },
    { value: '3/4', label: t('cover_maker.ratio_standard') || '3:4 标准' },
    { value: '4/3', label: t('cover_maker.ratio_landscape') || '4:3 横向' },
    { value: '9/16', label: t('cover_maker.ratio_phone') || '9:16 手机' },
    { value: '16/9', label: t('cover_maker.ratio_video') || '16:9 视频' },
    { value: '2/3', label: t('cover_maker.ratio_book') || '2:3 书籍' },
  ], [t]);

  const [selectedRatio, setSelectedRatio] = useState('3/4');

  const canSave = useMemo(() => {
    switch (currentMode) {
      case 'image':
        return selectedImage !== null;
      case 'html':
        return htmlCode.trim().length > 0;
      case 'zip':
        return selectedZip !== null;
      case 'template':
        return selectedTemplate !== null && templateConfig.title.trim().length > 0;
      default:
        return false;
    }
  }, [currentMode, selectedImage, htmlCode, selectedZip, selectedTemplate, templateConfig.title]);

  const previewHtml = useMemo(() => {
    switch (currentMode) {
      case 'image':
        if (imagePreviewUrl) {
          return generateImageCoverHtml(imagePreviewUrl);
        }
        return '';
      case 'html':
        return htmlCode;
      case 'template':
        return generatedHtml;
      default:
        return '';
    }
  }, [currentMode, imagePreviewUrl, htmlCode, generatedHtml]);

  const switchMode = (mode: CoverCreationMode) => {
    setCurrentMode(mode);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  const handleZipSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'application/zip' || file.name.endsWith('.zip'))) {
      setSelectedZip(file);
      setZipFileName(file.name);
    }
  };

  const clearZip = () => {
    setSelectedZip(null);
    setZipFileName(null);
  };

  const handleHtmlGenerated = (html: string) => {
    setGeneratedHtml(html);
  };

  const handleSave = async () => {
    if (!canSave) return;

    let coverData: CoverData;

    switch (currentMode) {
      case 'image': {
        if (!selectedImage) return;
        const imageBuffer = await selectedImage.arrayBuffer();
        coverData = {
          mode: 'image',
          imageData: {
            filename: selectedImage.name,
            data: new Uint8Array(imageBuffer),
            mimeType: selectedImage.type,
          },
        };
        break;
      }
      case 'html':
        coverData = {
          mode: 'html',
          htmlContent: htmlCode,
        };
        break;
      case 'zip': {
        if (!selectedZip) return;
        const zipBuffer = await selectedZip.arrayBuffer();
        coverData = {
          mode: 'zip',
          zipData: {
            data: new Uint8Array(zipBuffer),
            entryFile: 'index.html',
          },
        };
        break;
      }
      case 'template':
        if (!selectedTemplate) return;
        coverData = {
          mode: 'template',
          htmlContent: generatedHtml,
          templateConfig: {
            templateId: selectedTemplate,
            config: { ...templateConfig },
          },
        };
        break;
      default:
        return;
    }

    if (onSave) onSave(coverData);
    if (onClose) onClose();
  };

  const handleCancel = () => {
    if (onClose) onClose();
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).classList.contains('cover-maker-overlay')) {
      handleCancel();
    }
  };

  const handleGlobalKeydown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && visible) {
      handleCancel();
    }
  }, [visible, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [handleGlobalKeydown]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  if (!visible) return null;

  return (
    <div className="cover-maker-overlay" onClick={handleOverlayClick}>
      <div className="cover-maker">
        <div className="cover-maker__header">
          <h2 className="cover-maker__title">{t('cover_maker.title') || '快速制作封面'}</h2>
          <button
            className="cover-maker__close"
            type="button"
            aria-label={t('cover_maker.close') || '关闭'}
            onClick={handleCancel}
          >
            ✕
          </button>
        </div>

        <div className="cover-maker__modes">
          {modeOptions.map(mode => (
            <button
              key={mode.id}
              className={`cover-maker__mode-btn ${currentMode === mode.id ? 'cover-maker__mode-btn--active' : ''}`}
              type="button"
              onClick={() => switchMode(mode.id)}
            >
              <span className="cover-maker__mode-icon">{mode.icon}</span>
              <span className="cover-maker__mode-name">{mode.name}</span>
            </button>
          ))}
        </div>

        <div className="cover-maker__content">
          <div className="cover-maker__form">
            {currentMode === 'image' && (
              <div className="cover-maker__section">
                <p className="cover-maker__description">
                  {t('cover_maker.image_description') || '上传一张图片作为卡片封面。支持 PNG、JPG、WEBP 格式。'}
                </p>
                <div className="cover-maker__upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    className="cover-maker__file-input"
                    onChange={handleImageSelect}
                  />
                  {!selectedImage ? (
                    <div className="cover-maker__upload-placeholder">
                      <span className="cover-maker__upload-icon">🖼️</span>
                      <span className="cover-maker__upload-text">{t('cover_maker.image_upload_text') || '点击或拖拽图片到此处上传'}</span>
                      <span className="cover-maker__upload-hint">{t('cover_maker.image_upload_hint') || '建议比例 3:4，文件大小不超过 5MB'}</span>
                    </div>
                  ) : (
                    <div className="cover-maker__upload-selected">
                      {imagePreviewUrl && (
                        <img
                          src={imagePreviewUrl}
                          className="cover-maker__image-thumb"
                          alt={t('cover_maker.preview_alt') || '预览图片'}
                        />
                      )}
                      <div className="cover-maker__file-info">
                        <span className="cover-maker__file-name">{selectedImage.name}</span>
                        <button
                          type="button"
                          className="cover-maker__file-remove"
                          onClick={clearImage}
                        >
                          {t('cover_maker.remove') || '删除'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentMode === 'html' && (
              <div className="cover-maker__section">
                <p className="cover-maker__description">
                  {t('cover_maker.html_description') || '直接输入 HTML 代码生成封面。可以包含内联 CSS 和 Base64 图片。'}
                </p>
                <div className="cover-maker__field">
                  <label className="cover-maker__label">{t('cover_maker.html_label') || 'HTML 代码'}</label>
                  <textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className="cover-maker__code-input chips-textarea__inner"
                    placeholder={t('cover_maker.html_placeholder') || '输入 <html>...</html>'}
                    rows={12}
                  />
                </div>
              </div>
            )}

            {currentMode === 'zip' && (
              <div className="cover-maker__section">
                <p className="cover-maker__description">
                  {t('cover_maker.zip_description') || '上传包含 index.html 和相关资源的 ZIP 资源包作为封面。'}
                </p>
                <div className="cover-maker__upload-area">
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    className="cover-maker__file-input"
                    onChange={handleZipSelect}
                  />
                  {!selectedZip ? (
                    <div className="cover-maker__upload-placeholder">
                      <span className="cover-maker__upload-icon">📦</span>
                      <span className="cover-maker__upload-text">{t('cover_maker.zip_upload_text') || '点击或拖拽 ZIP 包到此处上传'}</span>
                      <span className="cover-maker__upload-hint">{t('cover_maker.zip_upload_hint') || '根目录必须包含 index.html'}</span>
                    </div>
                  ) : (
                    <div className="cover-maker__upload-selected">
                      <span className="cover-maker__zip-icon">📦</span>
                      <div className="cover-maker__file-info">
                        <span className="cover-maker__file-name">{zipFileName}</span>
                        <button
                          type="button"
                          className="cover-maker__file-remove"
                          onClick={clearZip}
                        >
                          {t('cover_maker.remove') || '删除'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="cover-maker__notice">
                  <span className="cover-maker__notice-icon">ℹ️</span>
                  <span className="cover-maker__notice-text">
                    {t('cover_maker.zip_notice') || '注意：ZIP 资源包将被解压并存储，如果包含外部链接可能会导致导出为单文件时无法离线查看。'}
                  </span>
                </div>
              </div>
            )}

            {currentMode === 'template' && (
              <div className="cover-maker__section">
                <p className="cover-maker__description">
                  {t('cover_maker.template_description') || '选择预设风格，填写内容即可快速生成高质量纯排版封面。'}
                </p>
                <div className="cover-maker__field">
                  <label className="cover-maker__label">{t('cover_maker.template_style') || '封面样式'}</label>
                  <TemplateGrid value={selectedTemplate} onChange={setSelectedTemplate} />
                </div>
                <div className="cover-maker__field">
                  <label className="cover-maker__label">
                    {t('cover_maker.title') || '主标题'}
                    <span className="cover-maker__required">*</span>
                  </label>
                  <input
                    value={templateConfig.title}
                    onChange={(e) => setTemplateConfig({ ...templateConfig, title: e.target.value })}
                    className="cover-maker__input chips-input__inner"
                    placeholder={t('cover_maker.title_placeholder') || '输入卡片标题'}
                  />
                </div>
                <div className="cover-maker__field">
                  <label className="cover-maker__label">{t('cover_maker.subtitle') || '副标题'}</label>
                  <input
                    value={templateConfig.subtitle}
                    onChange={(e) => setTemplateConfig({ ...templateConfig, subtitle: e.target.value })}
                    className="cover-maker__input chips-input__inner"
                    placeholder={t('cover_maker.subtitle_placeholder') || '输入副标题内容'}
                  />
                </div>
                <div className="cover-maker__field-row">
                  <div className="cover-maker__field">
                    <label className="cover-maker__label">{t('cover_maker.author') || '作者'}</label>
                    <input
                      value={templateConfig.author}
                      onChange={(e) => setTemplateConfig({ ...templateConfig, author: e.target.value })}
                      className="cover-maker__input chips-input__inner"
                      placeholder={t('cover_maker.author_placeholder') || '输入作者名称'}
                    />
                  </div>
                  <div className="cover-maker__field">
                    <label className="cover-maker__label">{t('cover_maker.date') || '日期'}</label>
                    <input
                      value={templateConfig.date}
                      onChange={(e) => setTemplateConfig({ ...templateConfig, date: e.target.value })}
                      className="cover-maker__input chips-input__inner"
                      placeholder={t('cover_maker.date_placeholder') || '输入创作时间'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="cover-maker__preview-panel">
            <div className="cover-maker__preview-header">
              <label className="cover-maker__label">{t('cover_maker.ratio') || '预览比例'}</label>
              <select 
                value={selectedRatio} 
                onChange={e => setSelectedRatio(e.target.value)}
                className="cover-maker__select chips-select__selector"
              >
                {coverRatios.map(ratio => (
                  <option key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </option>
                ))}
              </select>
            </div>

            {currentMode === 'template' ? (
              <TemplatePreview
                templateId={selectedTemplate}
                config={templateConfig}
                aspectRatio={selectedRatio}
                onHtmlGenerated={handleHtmlGenerated}
              />
            ) : currentMode === 'html' ? (
              <TemplatePreview
                templateId={null}
                config={{ title: '' }}
                customHtml={htmlCode}
                aspectRatio={selectedRatio}
              />
            ) : currentMode === 'image' && imagePreviewUrl ? (
              <TemplatePreview
                templateId={null}
                config={{ title: '' }}
                customHtml={previewHtml}
                aspectRatio={selectedRatio}
              />
            ) : (
              <div className="cover-maker__preview-placeholder">
                <span className="cover-maker__preview-placeholder-icon">👁️</span>
                <span className="cover-maker__preview-placeholder-text">
                  {currentMode === 'zip' ? (t('cover_maker.preview_zip') || 'ZIP 资源包无法实时预览') : (t('cover_maker.preview_default') || '请完善配置以查看效果')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="cover-maker__footer">
          <button
            type="button"
            className="cover-maker__btn cover-maker__btn--secondary"
            onClick={handleCancel}
          >
            {t('cover_maker.cancel') || '取消'}
          </button>
          <button
            type="button"
            className="cover-maker__btn cover-maker__btn--primary"
            disabled={!canSave}
            onClick={handleSave}
          >
            {t('cover_maker.save') || '确定并应用'}
          </button>
        </div>
      </div>
    </div>
  );
}
