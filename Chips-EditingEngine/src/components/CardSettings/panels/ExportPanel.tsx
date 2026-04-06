import React, { useState, useMemo, useEffect } from 'react';
import type { ModuleJobRecord, PlatformDialogSaveOptions } from 'chips-sdk';
import { useTranslation } from '../../../hooks/useTranslation';
import { useCard } from '../../../context/CardContext';
import { getChipsClient } from '../../../services/bridge-client';
import { fileService } from '../../../services/file-service';
import { ENGINE_ICONS } from '../../../icons/descriptors';
import { RuntimeIcon } from '../../../icons/RuntimeIcon';
import './ExportPanel.css';

interface ExportPanelProps {
  cardId: string;
  onBeforeExport?: () => void | Promise<void>;
}

type ExportFormat = 'card' | 'html' | 'pdf' | 'image';
type ConverterTargetType = Exclude<ExportFormat, 'card'>;
type FileConvertResultLike = {
  outputPath?: string;
};

const FILE_CONVERTER_CAPABILITY = 'converter.file.convert';
const CARD_TO_HTML_CAPABILITY = 'converter.card.to-html';
const HTML_TO_PDF_CAPABILITY = 'converter.html.to-pdf';
const HTML_TO_IMAGE_CAPABILITY = 'converter.html.to-image';
const FILE_CONVERTER_METHOD = 'convert';
const MODULE_JOB_POLL_INTERVAL_MS = 120;
const CONVERSION_PROGRESS_OFFSET = 20;
const CONVERSION_PROGRESS_SCALE = 0.8;

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

function ensureFileExtension(filePath: string, extension: string): string {
  return filePath.toLowerCase().endsWith(extension.toLowerCase())
    ? filePath
    : `${filePath}${extension}`;
}

function buildDefaultExportPath(
  cardPath: string,
  cardName: string | undefined,
  cardId: string,
  extension: string,
): string {
  const parentPath = getParentPath(cardPath);
  const fallbackName = sanitizeExportFileName(cardName ?? '') || cardId || 'card-export';
  const defaultPath = `${parentPath}/${fallbackName}${extension}`;

  if (normalizePathForCompare(defaultPath) === normalizePathForCompare(cardPath)) {
    return `${parentPath}/${fallbackName}-export${extension}`;
  }

  return defaultPath;
}

function buildSaveDialogOptions(
  format: ExportFormat,
  cardPath: string,
  cardName: string | undefined,
  cardId: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): PlatformDialogSaveOptions {
  switch (format) {
    case 'card':
      return {
        title: t('card_settings.export_save_card') || '保存 .card 文件',
        defaultPath: buildDefaultExportPath(cardPath, cardName, cardId, '.card'),
      };
    case 'html':
      return {
        title: t('card_settings.export_save_html') || '保存 HTML 导出包',
        defaultPath: buildDefaultExportPath(cardPath, cardName, cardId, '.zip'),
      };
    case 'pdf':
      return {
        title: t('card_settings.export_save_pdf') || '保存 PDF 文件',
        defaultPath: buildDefaultExportPath(cardPath, cardName, cardId, '.pdf'),
      };
    case 'image':
    default:
      return {
        title: t('card_settings.export_save_image') || '保存图片文件',
        defaultPath: buildDefaultExportPath(cardPath, cardName, cardId, '.png'),
      };
  }
}

function normalizeOutputPath(format: ExportFormat, outputPath: string): string {
  switch (format) {
    case 'card':
      return ensureCardExtension(outputPath);
    case 'html':
      return ensureFileExtension(outputPath, '.zip');
    case 'pdf':
      return ensureFileExtension(outputPath, '.pdf');
    case 'image':
    default:
      return ensureFileExtension(outputPath, '.png');
  }
}

function toConverterTargetType(format: ConverterTargetType): 'html' | 'pdf' | 'image' {
  return format;
}

function mapConversionProgress(percent: unknown): number {
  const numeric = typeof percent === 'number' && Number.isFinite(percent) ? percent : 0;
  const clamped = Math.max(0, Math.min(100, numeric));
  return Math.round(CONVERSION_PROGRESS_OFFSET + clamped * CONVERSION_PROGRESS_SCALE);
}

function resolveProgressMessage(
  stage: unknown,
  fallbackMessage: unknown,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  switch (stage) {
    case 'prepare':
      return t('card_settings.export_prepare') || '正在准备导出任务…';
    case 'render-html':
      return t('card_settings.export_render_html') || '正在生成 HTML 页面…';
    case 'rewrite-assets':
      return t('card_settings.export_rewrite_assets') || '正在整理资源文件…';
    case 'write-output':
      return t('card_settings.export_write_output') || '正在写入导出文件…';
    case 'package-html':
      return t('card_settings.export_package_html') || '正在打包 HTML 导出内容…';
    case 'render-pdf':
      return t('card_settings.export_render_pdf') || '正在生成 PDF…';
    case 'render-image':
      return t('card_settings.export_render_image') || '正在生成图片…';
    case 'cleanup':
      return t('card_settings.export_cleanup') || '正在清理临时文件…';
    case 'completed':
      return t('card_settings.export_done') || '导出完成';
    default:
      return typeof fallbackMessage === 'string' && fallbackMessage.trim().length > 0
        ? fallbackMessage
        : (t('card_settings.export_launch_conversion') || '正在执行导出任务…');
  }
}

function toJobError(job: ModuleJobRecord, t: (key: string, params?: Record<string, string | number>) => string): Error {
  const error = new Error(
    job.error?.message
      || t('card_settings.export_unknown_error')
      || '未知错误',
  ) as Error & { code?: string };
  if (job.error?.code) {
    error.code = job.error.code;
  }
  return error;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForModuleJob(
  jobId: string,
  onProgress: (job: ModuleJobRecord) => void,
  t: (key: string, params?: Record<string, string | number>) => string,
): Promise<FileConvertResultLike> {
  const client = getChipsClient();

  while (true) {
    const job = await client.module.job.get(jobId);
    onProgress(job);

    if (job.status === 'completed') {
      return (job.output ?? {}) as FileConvertResultLike;
    }

    if (job.status === 'failed' || job.status === 'cancelled') {
      throw toJobError(job, t);
    }

    await sleep(MODULE_JOB_POLL_INTERVAL_MS);
  }
}

function normalizeExportError(error: unknown, fallbackMessage: string): { message: string; code?: string } {
  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      code: (error as Error & { code?: string }).code,
    };
  }

  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; code?: unknown; error?: unknown };
    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return {
        message: record.message,
        code: typeof record.code === 'string' ? record.code : undefined,
      };
    }
    if (typeof record.error === 'string' && record.error.trim().length > 0) {
      return {
        message: record.error,
        code: typeof record.code === 'string' ? record.code : undefined,
      };
    }
  }

  return { message: fallbackMessage };
}

export function ExportPanel({ cardId, onBeforeExport }: ExportPanelProps) {
  const { t, locale } = useTranslation();
  const { getCard, saveCard } = useCard();

  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');
  const [exportAvailability, setExportAvailability] = useState<Record<ExportFormat, boolean>>({
    card: true,
    html: false,
    pdf: false,
    image: false,
  });
  const card = getCard(cardId);

  // Reset status when cardId changes
  useEffect(() => {
    setExportProgress(0);
    setExportStatus('idle');
    setExportMessage('');
  }, [cardId]);

  useEffect(() => {
    let disposed = false;

    const checkAvailability = async () => {
      try {
        const client = getChipsClient();
        const [fileProviders, cardProviders, pdfProviders, imageProviders] = await Promise.all([
          client.module.listProviders({ capability: FILE_CONVERTER_CAPABILITY }),
          client.module.listProviders({ capability: CARD_TO_HTML_CAPABILITY }),
          client.module.listProviders({ capability: HTML_TO_PDF_CAPABILITY }),
          client.module.listProviders({ capability: HTML_TO_IMAGE_CAPABILITY }),
        ]);

        if (disposed) {
          return;
        }

        const hasEnabledProvider = (providers: Array<{ status?: string }>) =>
          providers.some((provider) => provider.status === 'enabled' || provider.status === 'running');

        const hasFileConverter = hasEnabledProvider(fileProviders);
        const hasCardToHtml = hasEnabledProvider(cardProviders);
        const hasHtmlToPdf = hasEnabledProvider(pdfProviders);
        const hasHtmlToImage = hasEnabledProvider(imageProviders);

        setExportAvailability({
          card: true,
          html: hasFileConverter && hasCardToHtml,
          pdf: hasFileConverter && hasCardToHtml && hasHtmlToPdf,
          image: hasFileConverter && hasCardToHtml && hasHtmlToImage,
        });
      } catch (error) {
        if (disposed) {
          return;
        }

        console.warn('[ExportPanel] Failed to resolve export provider availability.', error);
        setExportAvailability({
          card: true,
          html: false,
          pdf: false,
          image: false,
        });
      }
    };

    void checkAvailability();

    return () => {
      disposed = true;
    };
  }, []);

  const exportFormats = useMemo(() => [
    {
      key: 'card',
      icon: ENGINE_ICONS.box,
      label: t('card_settings.export_card') || '导出为 .card',
      desc: '.card',
      available: exportAvailability.card,
    },
    {
      key: 'html',
      icon: ENGINE_ICONS.html,
      label: t('card_settings.export_html') || '导出为 HTML',
      desc: 'HTML ZIP',
      available: exportAvailability.html,
    },
    {
      key: 'pdf',
      icon: ENGINE_ICONS.pdf,
      label: t('card_settings.export_pdf') || '导出为 PDF',
      desc: 'PDF',
      available: exportAvailability.pdf,
    },
    {
      key: 'image',
      icon: ENGINE_ICONS.image,
      label: t('card_settings.export_image') || '导出为图片',
      desc: 'PNG',
      available: exportAvailability.image,
    },
  ], [exportAvailability, t]);

  const handleExport = async (format: ExportFormat) => {
    if (exportStatus === 'exporting') return;
    if (exportAvailability[format] === false) {
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
      const client = getChipsClient();
      const outputPath = await client.platform.saveFile(
        buildSaveDialogOptions(format, card.path, card.metadata.name, cardId, t),
      );

      if (!outputPath) {
        setExportProgress(0);
        setExportStatus('idle');
        setExportMessage('');
        return;
      }

      setExportStatus('exporting');
      setExportProgress(0);
      setExportMessage(t('card_settings.export_start', { format: format.toUpperCase() }) || `开始导出 ${format}...`);
      setExportProgress(10);
      await onBeforeExport?.();
      setExportMessage(t('card_settings.export_saving_card_state') || '正在保存卡片状态...');
      await saveCard(cardId);
      setExportProgress(format === 'card' ? 55 : CONVERSION_PROGRESS_OFFSET);

      const finalOutputPath = normalizeOutputPath(format, outputPath);
      let exportedPath = finalOutputPath;

      if (format === 'card') {
        setExportMessage(t('card_settings.export_create_package') || '正在生成文件...');
        exportedPath = await client.card.pack(card.path, finalOutputPath);
        setExportProgress(90);
      } else {
        setExportMessage(t('card_settings.export_launch_conversion') || '正在启动导出任务…');
        const started = await client.module.invoke({
          capability: FILE_CONVERTER_CAPABILITY,
          method: FILE_CONVERTER_METHOD,
          input: {
            source: {
              type: 'card',
              path: card.path,
            },
            target: {
              type: toConverterTargetType(format),
            },
            output: {
              path: finalOutputPath,
              overwrite: true,
            },
            options: {
              locale,
              ...(card.metadata.themeId ? { themeId: card.metadata.themeId } : {}),
              ...(format === 'html'
                ? {
                    html: {
                      packageMode: 'zip',
                      includeAssets: true,
                      includeManifest: true,
                    },
                  }
                : {}),
              ...(format === 'image'
                ? {
                    image: {
                      format: 'png',
                    },
                  }
                : {}),
            },
          },
        });

        const handleModuleProgress = (job: ModuleJobRecord) => {
          const progress = job.progress ?? {};
          setExportProgress(mapConversionProgress(progress.percent));
          setExportMessage(resolveProgressMessage(progress.stage, progress.message, t));
        };

        const result = started.mode === 'job'
          ? await waitForModuleJob(started.jobId, handleModuleProgress, t)
          : (started.output ?? {}) as FileConvertResultLike;

        exportedPath = typeof result.outputPath === 'string' && result.outputPath.trim().length > 0
          ? result.outputPath
          : finalOutputPath;
        setExportProgress(95);
      }

      setExportMessage(t('card_settings.export_verify_output') || '正在校验导出文件...');

      const exportedFile = await fileService.stat(exportedPath);
      if (!exportedFile.isFile) {
        throw new Error(t('card_settings.export_output_missing') || '导出目标文件未生成');
      }

      setExportProgress(100);
      setExportStatus('success');
      setExportMessage(
        t('card_settings.export_done_with_path', { path: exportedPath }) || `导出完成：${exportedPath}`
      );

    } catch (error) {
      console.error('[ExportPanel] Failed to export card.', {
        cardId,
        format,
        error,
      });
      const normalizedError = normalizeExportError(
        error,
        t('card_settings.export_unknown_error') || '未知错误',
      );
      setExportStatus('error');
      setExportProgress(0);
      setExportMessage(
        t('card_settings.export_failed', {
          error: normalizedError.message,
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
              onClick={() => handleExport(fmt.key as ExportFormat)}
            >
              <span className="export-panel__format-icon" aria-hidden="true">
                <RuntimeIcon icon={fmt.icon} />
              </span>
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
