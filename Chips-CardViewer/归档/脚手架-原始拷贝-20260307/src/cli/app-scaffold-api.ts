import {
  createAppProjectInternal,
  getTemplateMeta,
  listTemplateMetas,
} from "../core/template-engine.js";
import type {
  AppScaffoldTemplateMeta,
  CreateAppProjectOptions,
} from "../core/types.js";

export type { AppScaffoldTemplateMeta, CreateAppProjectOptions } from "../core/types.js";

export interface CreateAppProjectResult {
  projectDir: string;
  templateId: string;
  filesCreated: number;
}

export async function listAppTemplates(): Promise<AppScaffoldTemplateMeta[]> {
  return listTemplateMetas();
}

export async function createAppProject(
  options: CreateAppProjectOptions,
): Promise<CreateAppProjectResult> {
  const { templateId } = options;
  // This call validates templateId and meta before rendering.
  await getTemplateMeta(templateId);
  return createAppProjectInternal(options);
}

