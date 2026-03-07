export interface StandardError extends Error {
  code: string;
  details?: unknown;
}

export interface AppScaffoldTemplateMeta {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  supports?: {
    multiWindow?: boolean;
    sdk?: boolean;
    componentLibrary?: boolean;
  };
}

export interface CreateAppProjectOptions {
  projectName: string;
  targetDir: string;
  templateId: string;
  pluginId: string;
  displayName: string;
  version: string;
  authorName?: string;
  authorEmail?: string;
}

export interface TemplateContext {
  PROJECT_NAME: string;
  TARGET_DIR: string;
  TEMPLATE_ID: string;
  PLUGIN_ID: string;
  DISPLAY_NAME: string;
  VERSION: string;
  AUTHOR_NAME?: string;
  AUTHOR_EMAIL?: string;
}

