import {
  BoxlayoutScaffoldTemplateMeta,
  CreateBoxlayoutProjectOptions,
  CreateBoxlayoutProjectResult,
} from "../core/types";
import {
  listAvailableTemplates,
  loadTemplateMeta,
  renderTemplateToTarget,
} from "../core/template-engine";

export async function listBoxlayoutTemplates(): Promise<BoxlayoutScaffoldTemplateMeta[]> {
  return listAvailableTemplates();
}

export async function createBoxlayoutProject(
  options: CreateBoxlayoutProjectOptions
): Promise<CreateBoxlayoutProjectResult> {
  await loadTemplateMeta(options.templateId);
  return renderTemplateToTarget(options);
}

export type {
  BoxlayoutScaffoldTemplateMeta,
  CreateBoxlayoutProjectOptions,
  CreateBoxlayoutProjectResult,
} from "../core/types";
