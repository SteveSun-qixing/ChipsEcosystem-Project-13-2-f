import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import './ExportPanel.css';

// Mocks for internal types
export interface CardMetaData {
  name?: string;
  tags?: (string | string[])[];
  created_at?: string | number;
  modified_at?: string | number;
  theme?: string;
  card_id?: string;
}
export interface BaseCardInfo {
  id: string;
  type: string;
  config: Record<string, unknown>;
}
export interface CardInfo {
  metadata: CardMetaData;
  structure: BaseCardInfo[];
  filePath?: string;
}

interface ExportPanelProps {
  cardId: string;
  cardInfo?: CardInfo;
}

export function ExportPanel({ cardId, cardInfo }: ExportPanelProps) {
  const { t } = useTranslation();

  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');

  // Reset status when cardId changes
  useEffect(() => {
    setExportProgress(0);
    setExportStatus('idle');
    setExportMessage('');
  }, [cardId]);

  const exportFormats = useMemo(() => [
    {
      key: 'card',
      icon: '📦',
      label: t('card_settings.export_card') || '导出为 .card',
      desc: '.card',
    },
    {
      key: 'html',
      icon: '🌐',
      label: t('card_settings.export_html') || '导出为 HTML',
      desc: 'HTML',
    },
    {
      key: 'pdf',
      icon: '📄',
      label: t('card_settings.export_pdf') || '导出为 PDF',
      desc: 'PDF',
    },
    {
      key: 'image',
      icon: '🖼️',
      label: t('card_settings.export_image') || '导出为图片',
      desc: 'PNG',
    },
  ], [t]);

  const handleExport = async (format: string) => {
    if (exportStatus === 'exporting') return;
    if (!cardInfo) {
      setExportStatus('error');
      setExportMessage(t('card_settings.export_no_card') || '无可导出的卡片信息');
      return;
    }

    setExportStatus('exporting');
    setExportProgress(0);
    setExportMessage(t('card_settings.export_start', { format: format.toUpperCase() }) || `开始导出 ${format}...`);

    try {
      setExportProgress(10);

      // Stub SDK behavior
      await new Promise(resolve => setTimeout(resolve, 500));
      setExportMessage(t('card_settings.export_save_card') || '正在保存卡片状态...');
      setExportProgress(35);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setExportMessage(t('card_settings.export_create_package') || '正在生成文件...');
      setExportProgress(80);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setExportProgress(100);
      setExportStatus('success');
      setExportMessage(t('card_settings.export_done') || '导出成功');

      // Auto clear success message
      setTimeout(() => {
        setExportStatus(prev => {
          if (prev === 'success') {
            setExportProgress(0);
            setExportMessage('');
            return 'idle';
          }
          return prev;
        });
      }, 5000);

    } catch (error) {
      setExportStatus('error');
      setExportMessage(t('card_settings.export_failed', {
        error: error instanceof Error ? error.message : t('card_settings.export_unknown_error'),
      }) || `导出失败: ${error}`);
    }
  };

  return (
    <div className="export-panel">
      <div className="export-panel__field">
        <label className="export-panel__label">
          {t('card_settings.export_format') || '导出格式'}
        </label>
        <div className="export-panel__grid">
          {exportFormats.map(fmt => (
            <button
              key={fmt.key}
              type="button"
              className="export-panel__format-card"
              disabled={exportStatus === 'exporting'}
              onClick={() => handleExport(fmt.key)}
            >
              <span className="export-panel__format-icon" aria-hidden="true">{fmt.icon}</span>
              <div className="export-panel__format-text">
                <span className="export-panel__format-title">{fmt.label}</span>
                <span className="export-panel__format-desc">{fmt.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {exportStatus !== 'idle' && (
        <div className="export-panel__progress">
          <div className="export-panel__progress-bar-container">
            <div
              className={`export-panel__progress-bar ${exportStatus === 'error' ? 'export-panel__progress-bar--error' : ''}`}
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <p
            className={`export-panel__message ${
              exportStatus === 'success' ? 'export-panel__message--success' : ''
            } ${
              exportStatus === 'error' ? 'export-panel__message--error' : ''
            }`}
          >
            {exportMessage}
          </p>
        </div>
      )}
    </div>
  );
}
