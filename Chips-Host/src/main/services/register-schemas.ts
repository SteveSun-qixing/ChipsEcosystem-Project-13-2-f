import { objectWithKeys, schemaRegistry } from '../../shared/schema';

const registerPair = (action: string, keys: string[]): void => {
  schemaRegistry.register(`schemas/${action}.request.json`, objectWithKeys(keys));
  schemaRegistry.register(`schemas/${action}.response.json`, () => ({ valid: true }));
};

export const registerHostSchemas = (): void => {
  registerPair('file.read', ['path']);
  registerPair('file.write', ['path', 'content']);
  registerPair('file.stat', ['path']);
  registerPair('file.list', ['dir']);

  registerPair('resource.resolve', ['resourceId']);
  registerPair('resource.readMetadata', ['resourceId']);
  registerPair('resource.readBinary', ['resourceId']);

  registerPair('config.get', ['key']);
  registerPair('config.set', ['key', 'value']);
  registerPair('config.batchSet', ['entries']);
  registerPair('config.reset', []);

  registerPair('theme.list', []);
  registerPair('theme.apply', ['id']);
  registerPair('theme.getCurrent', []);
  registerPair('theme.getAllCss', []);
  registerPair('theme.resolve', ['chain']);
  registerPair('theme.contract.get', []);

  registerPair('i18n.getCurrent', []);
  registerPair('i18n.setCurrent', ['locale']);
  registerPair('i18n.translate', ['key']);
  registerPair('i18n.listLocales', []);

  registerPair('window.open', ['config']);
  registerPair('window.focus', ['windowId']);
  registerPair('window.resize', ['windowId', 'width', 'height']);
  registerPair('window.setState', ['windowId', 'state']);
  registerPair('window.getState', ['windowId']);
  registerPair('window.close', ['windowId']);

  registerPair('platform.dialogOpenFile', []);
  registerPair('platform.dialogSaveFile', []);
  registerPair('platform.dialogShowMessage', ['options']);
  registerPair('platform.dialogShowConfirm', ['options']);
  registerPair('platform.clipboardRead', []);
  registerPair('platform.clipboardWrite', ['data']);
  registerPair('platform.shellOpenPath', ['path']);
  registerPair('platform.shellOpenExternal', ['url']);
  registerPair('platform.shellShowItemInFolder', ['path']);
  registerPair('platform.notificationShow', ['options']);
  registerPair('platform.traySet', ['options']);
  registerPair('platform.trayClear', []);
  registerPair('platform.trayGetState', []);
  registerPair('platform.shortcutRegister', ['accelerator']);
  registerPair('platform.shortcutUnregister', ['accelerator']);
  registerPair('platform.shortcutIsRegistered', ['accelerator']);
  registerPair('platform.shortcutList', []);
  registerPair('platform.shortcutClear', []);
  registerPair('platform.powerGetState', []);
  registerPair('platform.powerSetPreventSleep', ['prevent']);

  registerPair('plugin.install', ['manifestPath']);
  registerPair('plugin.enable', ['pluginId']);
  registerPair('plugin.disable', ['pluginId']);
  registerPair('plugin.uninstall', ['pluginId']);
  registerPair('plugin.query', []);
  registerPair('plugin.init', ['pluginId']);
  registerPair('plugin.handshake.complete', ['sessionId', 'nonce']);

  registerPair('module.mount', ['slot', 'module']);
  registerPair('module.unmount', ['slot']);
  registerPair('module.query', ['slot']);
  registerPair('module.list', []);

  registerPair('platform.getInfo', []);
  registerPair('platform.getCapabilities', []);
  registerPair('platform.openExternal', ['url']);

  registerPair('log.write', ['level', 'message']);
  registerPair('log.query', []);
  registerPair('log.export', []);

  registerPair('credential.get', ['ref']);
  registerPair('credential.set', ['ref', 'value']);
  registerPair('credential.delete', ['ref']);
  registerPair('credential.rotate', ['ref']);

  registerPair('card.parse', ['cardFile']);
  registerPair('card.render', ['cardFile']);
  registerPair('card.validate', ['cardFile']);

  registerPair('box.pack', ['boxDir', 'outputPath']);
  registerPair('box.unpack', ['boxFile', 'outputDir']);
  registerPair('box.inspect', ['boxFile']);

  registerPair('zip.compress', ['inputDir', 'outputZip']);
  registerPair('zip.extract', ['zipPath', 'outputDir']);
  registerPair('zip.list', ['zipPath']);

  registerPair('serializer.encode', ['payload']);
  registerPair('serializer.decode', ['payload']);
  registerPair('serializer.validate', ['payload', 'schema']);

  registerPair('control-plane.health', []);
  registerPair('control-plane.check', []);
  registerPair('control-plane.metrics', []);
  registerPair('control-plane.diagnose', []);
};
