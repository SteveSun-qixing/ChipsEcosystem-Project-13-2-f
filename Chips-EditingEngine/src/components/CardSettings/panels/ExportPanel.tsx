import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useCard } from '../../../context/CardContext';
import { getChipsClient } from '../../../services/bridge-client';
import { fileService } from '../../../services/file-service';
import './ExportPanel.css';

interface ExportPanelProps {
  cardId: string;
  onBeforeExport?: () => void | Promise<void>;
}

function normalizePathForCompare(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function getParentPath(filePath: string): string {
  const normalized = normalizePathForCompare(filePath);
  const lastSlashIndex = normalized.lastIndexOf('/');
  if (lastSlashIndex < 0) {
    return '';
  }
  return lastSlashIndex === 0 ? '/' : normalized.slice(0, lastSlashIndex);
}

function stripCardExtension(fileName: string): string {
  return fileName.toLowerCase().endsWith('.card')
    ? fileName.slice(0, -'.card'.length)
    : fileName;
}

function sanitizeExportFileName(fileName: string): string {
  return stripCardExtension(fileName)
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '')
    .trim();
}

function ensureCardExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith('.card')
    ? filePath
    : `${filePath}.card`;
}

function buildDefaultExportPath(cardPath: string, cardName: string | undefined, cardId: string): string {
  const parentPath = getParentPath(cardPath);
  const fallbackName = sanitizeExportFileName(cardName ?? '') || cardId || 'card-export';
  const defaultPath = `${parentPath}/${fallbackName}.card`;

  if (normalizePathForCompare(defaultPath) === normalizePathForCompare(cardPath)) {
    return `${parentPath}/${fallbackName}-export.card`;
  }

  return defaultPath;
}

export function ExportPanel({ cardId, onBeforeExport }: ExportPanelProps) {
  const { t } = useTranslation();
  const { getCard, saveCard } = useCard();

  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');
  const card = getCard(cardId);

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
      available: true,
    },
    {
      key: 'html',
      icon: '🌐',
      label: t('card_settings.export_html') || '导出为 HTML',
      desc: 'HTML',
      available: false,
    },
    {
      key: 'pdf',
      icon: '📄',
      label: t('card_settings.export_pdf') || '导出为 PDF',
      desc: 'PDF',
      available: false,
    },
    {
      key: 'image',
      icon: '🖼️',
      label: t('card_settings.export_image') || '导出为图片',
      desc: 'PNG',
      available: false,
    },
  ], [t]);

  const handleExport = async (format: string) => {
    if (exportStatus === 'exporting') return;
    if (format !== 'card') {
      setExportStatus('error');
      setExportProgress(0);
      setExportMessage(t('card_settings.export_unavailable') || '当前导出格式尚未接入正式链路');
      return;
    }

    if (!card?.path) {
      setExportStatus('error');
      setExportMessage(t('card_settings.export_no_card') || '无可导出的卡片信息');
      return;
    }

    try {
      const outputPath = await getChipsClient().platform.saveFile({
        title: t('card_settings.export_save_card') || '保存 .card 文件',
        defaultPath: buildDefaultExportPath(card.path, card.metadata.name, cardId),
      });

      if (!outputPath) {
        setExportProgress(0);
        setExportStatus('idle');
        setExportMessage('');
        return;
      }

      setExportStatus('exporting');
      setExportProgress(0);
      setExportMessage(t('card_settings.export_start', { format: format.toUpperCase() }) || `开始导出 ${format}...`);
      setExportProgress(15);
      await onBeforeExport?.();
      setExportMessage(t('card_settings.export_saving_card_state') || '正在保存卡片状态...');
      await saveCard(cardId);
      setExportProgress(55);

      setExportMessage(t('card_settings.export_create_package') || '正在生成文件...');
      const finalOutputPath = ensureCardExtension(outputPath);
      const packedPath = await getChipsClient().card.pack(card.path, finalOutputPath);
      setExportProgress(90);
      setExportMessage(t('card_settings.export_verify_output') || '正在校验导出文件...');

      const exportedFile = await fileService.stat(packedPath);
      if (!exportedFile.isFile) {
        throw new Error(t('card_settings.export_output_missing') || '导出目标文件未生成');
      }

      setExportProgress(100);
      setExportStatus('success');
      setExportMessage(
        t('card_settings.export_done_with_path', { path: packedPath }) || `导出完成：${packedPath}`
      );

    } catch (error) {
      console.error('[ExportPanel] Failed to export card.', {
        cardId,
        format,
        error,
      });
      setExportStatus('error');
      setExportProgress(0);
      setExportMessage(
        t('card_settings.export_failed', {
          error: error instanceof Error ? error.message : t('card_settings.export_unknown_error'),
        }) || `导出失败: ${error}`
      );
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
              data-testid={`export-format-${fmt.key}`}
              disabled={exportStatus === 'exporting' || fmt.available === false}
              title={fmt.available === false
                ? (t('card_settings.export_unavailable') || '当前导出格式尚未接入正式链路')
                : undefined}
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
