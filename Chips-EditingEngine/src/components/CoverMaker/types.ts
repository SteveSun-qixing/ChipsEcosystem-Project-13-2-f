/**
 * 封面快速制作器类型定义
 * @module components/cover-maker/types
 */

export type CoverCreationMode = 'image' | 'html' | 'zip' | 'template';

export type TemplateStyle =
  | 'minimal-white'
  | 'gradient-blue'
  | 'dark-theme'
  | 'geometric'
  | 'bordered'
  | 'magazine'
  | 'news-banner'
  | 'circle-soft';

export interface CoverTemplate {
  id: TemplateStyle;
  name: string;
  description: string;
  previewStyle: string;
  generateHtml: (config: TemplateConfig) => string;
}

export interface TemplateConfig {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  primaryColor?: string;
  backgroundColor?: string;
}

export interface CoverData {
  mode: CoverCreationMode;
  htmlContent?: string;
  imageData?: {
    filename: string;
    data: Uint8Array;
    mimeType: string;
  };
  zipData?: {
    data: Uint8Array;
    entryFile: string;
  };
  templateConfig?: {
    templateId: TemplateStyle;
    config: TemplateConfig;
  };
}

export interface CoverCreationResult {
  success: boolean;
  htmlContent?: string;
  resources?: {
    path: string;
    data: Uint8Array;
  }[];
  error?: string;
}

export interface CoverMakerProps {
  cardId: string;
  currentCoverHtml?: string;
  visible: boolean;
  onClose?: () => void;
  onSave?: (data: CoverData) => void;
  onPreview?: (html: string) => void;
}
