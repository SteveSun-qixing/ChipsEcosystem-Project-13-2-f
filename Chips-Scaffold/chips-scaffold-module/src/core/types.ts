import { Stats } from "node:fs";

export interface ModuleScaffoldTemplateMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  extends?: string;
  excludeFiles?: string[];
  moduleShape?: string;
  supports?: {
    sdk?: boolean;
    react?: boolean;
    themeSystem?: boolean;
    i18nSystem?: boolean;
  };
}

export interface CreateModuleProjectOptions {
  projectName: string;
  targetDir: string;
  templateId: string;
  pluginId: string;
  moduleCapability: string;
  moduleConsumes?: Array<{
    capability: string;
    versionRange?: string;
  }>;
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
  CLI_COMMAND_ROOT: string;
  MODULE_CAPABILITY: string;
  MODULE_CONSUMES_YAML: string;
  DISPLAY_NAME: string;
  VERSION: string;
  AUTHOR_NAME?: string;
  AUTHOR_EMAIL?: string;
}

export interface StandardError extends Error {
  code: string;
  details?: unknown;
}

export interface TemplateFileInfo {
  absolutePath: string;
  relativePath: string;
  stats: Stats;
}

export interface CreateModuleProjectResult {
  projectDir: string;
  templateId: string;
  filesCreated: number;
}
