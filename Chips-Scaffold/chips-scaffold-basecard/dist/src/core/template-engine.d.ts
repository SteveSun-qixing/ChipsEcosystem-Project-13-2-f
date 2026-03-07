import { BasecardScaffoldTemplateMeta, CreateBasecardProjectOptions, CreateBasecardProjectResult } from "./types";
export declare function loadTemplateMeta(templateId: string): Promise<BasecardScaffoldTemplateMeta>;
export declare function listAvailableTemplates(): Promise<BasecardScaffoldTemplateMeta[]>;
export declare function renderTemplateToTarget(options: CreateBasecardProjectOptions): Promise<CreateBasecardProjectResult>;
