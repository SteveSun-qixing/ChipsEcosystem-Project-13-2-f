import { describe, expect, it } from 'vitest';
import {
  EDITING_ENGINE_COMMAND_HANDLER_IDS,
  EDITING_ENGINE_COMMAND_IDS,
  createEditingEngineCommandViews,
  editingEngineCommandDefinitions,
  isApplicationChromeCommand,
  resolveEditingEngineCommandState,
} from '../../src/commands/editing-engine-commands';
import { appConfig } from '../../config/app-config';
import type { EditingEngineCommandRuntimeState } from '../../src/commands/editing-engine-commands';

const RAW_TEXT_FIELDS = ['title', 'description', 'label', 'ariaLabel'] as const;

const readyRuntime: EditingEngineCommandRuntimeState = {
  appReady: true,
  canUndo: true,
  canRedo: false,
  undoBusy: false,
  redoBusy: false,
  currentLayout: 'infinite-canvas',
  themeId: 'chips-official.default-theme',
};

describe('editing engine command definitions', () => {
  it('uses stable app-scoped command ids and handler ids', () => {
    expect(EDITING_ENGINE_COMMAND_IDS).toMatchObject({
      fileNewCard: 'chips-official.editing-engine.file.new-card',
      fileNewBox: 'chips-official.editing-engine.file.new-box',
      fileOpen: 'chips-official.editing-engine.file.open',
      fileRename: 'chips-official.editing-engine.file.rename',
      fileDelete: 'chips-official.editing-engine.file.delete',
      fileRefresh: 'chips-official.editing-engine.file.refresh',
      searchWorkspace: 'chips-official.editing-engine.search.workspace',
      editUndo: 'chips-official.editing-engine.edit.undo',
      editRedo: 'chips-official.editing-engine.edit.redo',
      viewToggleLayout: 'chips-official.editing-engine.view.toggle-layout',
      viewToggleTheme: 'chips-official.editing-engine.view.toggle-theme',
      settingsOpen: 'chips-official.editing-engine.settings.open',
    });

    expect(EDITING_ENGINE_COMMAND_HANDLER_IDS).toMatchObject({
      fileNewCard: 'editing-engine:file.new-card',
      fileNewBox: 'editing-engine:file.new-box',
      fileOpen: 'editing-engine:file.open',
      fileRename: 'editing-engine:file.rename',
      fileDelete: 'editing-engine:file.delete',
      fileRefresh: 'editing-engine:file.refresh',
      searchWorkspace: 'editing-engine:search.workspace',
      editUndo: 'editing-engine:edit.undo',
      editRedo: 'editing-engine:edit.redo',
      viewToggleLayout: 'editing-engine:view.toggle-layout',
      viewToggleTheme: 'editing-engine:view.toggle-theme',
      settingsOpen: 'editing-engine:settings.open',
    });
  });

  it('keeps command metadata serializable and i18n-key driven', () => {
    const commandIds = new Set<string>();
    const handlerIds = new Set<string>();

    for (const definition of editingEngineCommandDefinitions) {
      commandIds.add(definition.commandId);
      handlerIds.add(definition.handlerId);

      expect(definition.commandId.startsWith(`${appConfig.appId}.`)).toBe(true);
      expect(definition.scope).toEqual({ kind: 'app', appId: appConfig.appId });
      expect(definition.titleKey).toMatch(/^commands\./);
      expect(definition.descriptionKey).toMatch(/^commands\./);
      expect(definition.ariaLabelKey).toMatch(/^commands\./);
      expect(definition.handlerId).toMatch(/^editing-engine:/);
      expect(definition.icon?.name).toEqual(expect.any(String));
      expect(definition.permission).toBeTruthy();

      for (const field of RAW_TEXT_FIELDS) {
        expect(definition).not.toHaveProperty(field);
      }
    }

    expect(commandIds.size).toBe(editingEngineCommandDefinitions.length);
    expect(handlerIds.size).toBe(editingEngineCommandDefinitions.length);
  });

  it('publishes menu, toolbar and shortcut placements from the same definitions', () => {
    const byId = new Map(editingEngineCommandDefinitions.map((definition) => [definition.commandId, definition]));

    expect(byId.get(EDITING_ENGINE_COMMAND_IDS.fileNewCard)?.menuPlacement).toEqual(
      expect.arrayContaining([expect.objectContaining({ menuId: 'file', groupId: 'create', order: 10 })]),
    );
    expect(byId.get(EDITING_ENGINE_COMMAND_IDS.fileNewCard)?.toolbarPlacement).toEqual(
      expect.arrayContaining([expect.objectContaining({ toolbarId: 'workspace', groupId: 'create', order: 10 })]),
    );
    expect(byId.get(EDITING_ENGINE_COMMAND_IDS.fileNewCard)?.shortcut).toEqual(
      expect.objectContaining({ accelerator: 'Mod+N', preventDefault: true }),
    );

    expect(byId.get(EDITING_ENGINE_COMMAND_IDS.fileOpen)?.menuPlacement).toEqual(
      expect.arrayContaining([expect.objectContaining({ menuId: 'workspace-file', groupId: 'open' })]),
    );
    expect(byId.get(EDITING_ENGINE_COMMAND_IDS.fileOpen)?.toolbarPlacement).toBeUndefined();

    expect(byId.get(EDITING_ENGINE_COMMAND_IDS.viewToggleTheme)?.permission).toBe('theme.write');
    expect(byId.get(EDITING_ENGINE_COMMAND_IDS.editUndo)?.permission).toBe('command.invoke');
  });

  it('derives runtime state without replacing the internal undo and redo history manager', () => {
    const undoDefinition = editingEngineCommandDefinitions.find(
      (definition) => definition.commandId === EDITING_ENGINE_COMMAND_IDS.editUndo,
    );
    const redoDefinition = editingEngineCommandDefinitions.find(
      (definition) => definition.commandId === EDITING_ENGINE_COMMAND_IDS.editRedo,
    );

    expect(undoDefinition).toBeTruthy();
    expect(redoDefinition).toBeTruthy();

    expect(resolveEditingEngineCommandState(undoDefinition!, readyRuntime)).toMatchObject({
      enabled: true,
      visible: true,
      busy: false,
    });
    expect(resolveEditingEngineCommandState(redoDefinition!, readyRuntime)).toMatchObject({
      enabled: false,
      visible: true,
      disabledReasonKey: 'commands.edit.redo.disabled',
    });
  });

  it('filters file context commands out of application chrome', () => {
    const views = createEditingEngineCommandViews(readyRuntime);
    const chromeIds = views.filter(isApplicationChromeCommand).map((view) => view.commandId);

    expect(chromeIds).toContain(EDITING_ENGINE_COMMAND_IDS.fileNewCard);
    expect(chromeIds).toContain(EDITING_ENGINE_COMMAND_IDS.fileRefresh);
    expect(chromeIds).not.toContain(EDITING_ENGINE_COMMAND_IDS.fileOpen);
    expect(chromeIds).not.toContain(EDITING_ENGINE_COMMAND_IDS.fileRename);
    expect(chromeIds).not.toContain(EDITING_ENGINE_COMMAND_IDS.fileDelete);
  });
});
