import {
  CreateModuleProjectOptions,
  CreateModuleProjectResult,
  ModuleScaffoldTemplateMeta,
} from "../core/types";
import {
  listAvailableTemplates,
  loadTemplateMeta,
  renderTemplateToTarget,
} from "../core/template-engine";

export async function listModuleTemplates(): Promise<ModuleScaffoldTemplateMeta[]> {
  return listAvailableTemplates();
}

export async function createModuleProject(
  options: CreateModuleProjectOptions
): Promise<CreateModuleProjectResult> {
  await loadTemplateMeta(options.templateId);
  return renderTemplateToTarget(options);
}

export type {
  CreateModuleProjectOptions,
  CreateModuleProjectResult,
  ModuleScaffoldTemplateMeta,
} from "../core/types";
