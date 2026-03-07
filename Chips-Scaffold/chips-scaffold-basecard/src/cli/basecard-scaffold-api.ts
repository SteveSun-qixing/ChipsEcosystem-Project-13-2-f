import {
  BasecardScaffoldTemplateMeta,
  CreateBasecardProjectOptions,
  CreateBasecardProjectResult,
} from "../core/types";
import {
  loadTemplateMeta,
  listAvailableTemplates,
  renderTemplateToTarget,
} from "../core/template-engine";

export async function listBasecardTemplates(): Promise<
  BasecardScaffoldTemplateMeta[]
> {
  return listAvailableTemplates();
}

export async function createBasecardProject(
  options: CreateBasecardProjectOptions
): Promise<CreateBasecardProjectResult> {
  await loadTemplateMeta(options.templateId);
  return renderTemplateToTarget(options);
}

export type {
  BasecardScaffoldTemplateMeta,
  CreateBasecardProjectOptions,
  CreateBasecardProjectResult,
} from "../core/types";

