"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBasecardTemplates = listBasecardTemplates;
exports.createBasecardProject = createBasecardProject;
const template_engine_1 = require("../core/template-engine");
async function listBasecardTemplates() {
    return (0, template_engine_1.listAvailableTemplates)();
}
async function createBasecardProject(options) {
    await (0, template_engine_1.loadTemplateMeta)(options.templateId);
    return (0, template_engine_1.renderTemplateToTarget)(options);
}
