import { objectWithKeys, schemaRegistry, type SchemaValidator } from '../../shared/schema';

const registerPair = (action: string, requestKeys: string[], responseKeys: string[] = []): void => {
  schemaRegistry.register(`schemas/${action}.request.json`, objectWithKeys(requestKeys));
  schemaRegistry.register(`schemas/${action}.response.json`, objectWithKeys(responseKeys));
};

const RENDER_TARGETS = new Set(['app-root', 'card-iframe', 'module-slot', 'offscreen-render']);
const CARD_RENDER_MODES = new Set(['view', 'preview']);
const CARD_INTERACTION_POLICIES = new Set(['native', 'delegate']);
const MODULE_PROVIDER_STATUSES = new Set(['enabled', 'running', 'disabled', 'error']);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const validateCardRenderRequest: SchemaValidator = (input: unknown) => {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const errors: string[] = [];
  if (typeof input.cardFile !== 'string' || input.cardFile.trim().length === 0) {
    errors.push('cardFile must be a non-empty string');
  }

  if (typeof input.options !== 'undefined') {
    if (!isRecord(input.options)) {
      errors.push('options must be an object');
    } else {
      const target = input.options.target;
      if (typeof target !== 'undefined' && (typeof target !== 'string' || !RENDER_TARGETS.has(target))) {
        errors.push('options.target is invalid');
      }

      const verifyConsistency = input.options.verifyConsistency;
      if (typeof verifyConsistency !== 'undefined' && typeof verifyConsistency !== 'boolean') {
        errors.push('options.verifyConsistency must be a boolean');
      }

      validateOptionalString(input.options.themeId, 'options.themeId', errors);
      validateOptionalString(input.options.locale, 'options.locale', errors);

      const mode = input.options.mode;
      if (typeof mode !== 'undefined' && (typeof mode !== 'string' || !CARD_RENDER_MODES.has(mode))) {
        errors.push('options.mode is invalid');
      }

      const interactionPolicy = input.options.interactionPolicy;
      if (
        typeof interactionPolicy !== 'undefined' &&
        (typeof interactionPolicy !== 'string' || !CARD_INTERACTION_POLICIES.has(interactionPolicy))
      ) {
        errors.push('options.interactionPolicy is invalid');
      }

      const viewport = input.options.viewport;
      if (typeof viewport !== 'undefined') {
        if (!isRecord(viewport)) {
          errors.push('options.viewport must be an object');
        } else {
          for (const key of ['width', 'height', 'scrollTop', 'scrollLeft']) {
            const value = viewport[key];
            if (typeof value === 'undefined') {
              continue;
            }
            if (typeof value !== 'number' || !Number.isFinite(value)) {
              errors.push(`options.viewport.${key} must be a finite number`);
              continue;
            }
            if ((key === 'width' || key === 'height') && value <= 0) {
              errors.push(`options.viewport.${key} must be greater than 0`);
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }
  return { valid: true };
};

const validateCardRenderEditorRequest: SchemaValidator = (input: unknown) => {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const errors: string[] = [];
  if (typeof input.cardType !== 'string' || input.cardType.trim().length === 0) {
    errors.push('cardType must be a non-empty string');
  }

  if (typeof input.baseCardId !== 'undefined' && (typeof input.baseCardId !== 'string' || input.baseCardId.trim().length === 0)) {
    errors.push('baseCardId must be a non-empty string when provided');
  }

  if (typeof input.initialConfig !== 'undefined' && !isRecord(input.initialConfig)) {
    errors.push('initialConfig must be an object when provided');
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

const validateOptionalString = (value: unknown, field: string, errors: string[]): void => {
  if (typeof value !== 'undefined' && (typeof value !== 'string' || value.trim().length === 0)) {
    errors.push(`${field} must be a non-empty string when provided`);
  }
};

const validateOptionalFiniteNumber = (value: unknown, field: string, errors: string[]): void => {
  if (typeof value !== 'undefined' && (typeof value !== 'number' || !Number.isFinite(value))) {
    errors.push(`${field} must be a finite number when provided`);
  }
};

const validateModuleListProvidersRequest: SchemaValidator = (input: unknown) => {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const errors: string[] = [];
  validateOptionalString(input.capability, 'capability', errors);
  validateOptionalString(input.pluginId, 'pluginId', errors);
  validateOptionalString(input.versionRange, 'versionRange', errors);
  if (
    typeof input.status !== 'undefined' &&
    (typeof input.status !== 'string' || !MODULE_PROVIDER_STATUSES.has(input.status))
  ) {
    errors.push('status must be one of enabled/running/disabled/error');
  }
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

const validateModuleResolveRequest: SchemaValidator = (input: unknown) => {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const errors: string[] = [];
  if (typeof input.capability !== 'string' || input.capability.trim().length === 0) {
    errors.push('capability must be a non-empty string');
  }
  validateOptionalString(input.versionRange, 'versionRange', errors);
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

const validateModuleInvokeRequest: SchemaValidator = (input: unknown) => {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const errors: string[] = [];
  if (typeof input.capability !== 'string' || input.capability.trim().length === 0) {
    errors.push('capability must be a non-empty string');
  }
  if (typeof input.method !== 'string' || input.method.trim().length === 0) {
    errors.push('method must be a non-empty string');
  }
  if (!isRecord(input.input)) {
    errors.push('input must be an object');
  }
  validateOptionalString(input.pluginId, 'pluginId', errors);
  if (
    typeof input.timeoutMs !== 'undefined' &&
    (typeof input.timeoutMs !== 'number' || !Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0)
  ) {
    errors.push('timeoutMs must be a positive finite number when provided');
  }
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

const validateModuleInvokeResponse: SchemaValidator = (input: unknown) => {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  if (input.mode === 'sync') {
    return 'output' in input ? { valid: true } : { valid: false, errors: ['sync response must include output'] };
  }

  if (input.mode === 'job') {
    return typeof input.jobId === 'string' && input.jobId.trim().length > 0
      ? { valid: true }
      : { valid: false, errors: ['job response must include non-empty jobId'] };
  }

  return { valid: false, errors: ['mode must be sync or job'] };
};

const validateModuleJobRequest: SchemaValidator = (input: unknown) => {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  return typeof input.jobId === 'string' && input.jobId.trim().length > 0
    ? { valid: true }
    : { valid: false, errors: ['jobId must be a non-empty string'] };
};

const validatePlatformRenderHtmlToPdfRequest: SchemaValidator = (input: unknown) => {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const errors: string[] = [];
  if (typeof input.htmlDir !== 'string' || input.htmlDir.trim().length === 0) {
    errors.push('htmlDir must be a non-empty string');
  }
  if (typeof input.outputFile !== 'string' || input.outputFile.trim().length === 0) {
    errors.push('outputFile must be a non-empty string');
  }
  validateOptionalString(input.entryFile, 'entryFile', errors);

  if (typeof input.options !== 'undefined') {
    if (!isRecord(input.options)) {
      errors.push('options must be an object');
    } else {
      validateOptionalString(input.options.pageSize, 'options.pageSize', errors);
      if (typeof input.options.landscape !== 'undefined' && typeof input.options.landscape !== 'boolean') {
        errors.push('options.landscape must be a boolean when provided');
      }
      if (typeof input.options.printBackground !== 'undefined' && typeof input.options.printBackground !== 'boolean') {
        errors.push('options.printBackground must be a boolean when provided');
      }

      if (typeof input.options.marginMm !== 'undefined') {
        if (!isRecord(input.options.marginMm)) {
          errors.push('options.marginMm must be an object');
        } else {
          validateOptionalFiniteNumber(input.options.marginMm.top, 'options.marginMm.top', errors);
          validateOptionalFiniteNumber(input.options.marginMm.right, 'options.marginMm.right', errors);
          validateOptionalFiniteNumber(input.options.marginMm.bottom, 'options.marginMm.bottom', errors);
          validateOptionalFiniteNumber(input.options.marginMm.left, 'options.marginMm.left', errors);
        }
      }
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

const validatePlatformRenderHtmlToImageRequest: SchemaValidator = (input: unknown) => {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const errors: string[] = [];
  if (typeof input.htmlDir !== 'string' || input.htmlDir.trim().length === 0) {
    errors.push('htmlDir must be a non-empty string');
  }
  if (typeof input.outputFile !== 'string' || input.outputFile.trim().length === 0) {
    errors.push('outputFile must be a non-empty string');
  }
  validateOptionalString(input.entryFile, 'entryFile', errors);

  if (typeof input.options !== 'undefined') {
    if (!isRecord(input.options)) {
      errors.push('options must be an object');
    } else {
      validateOptionalString(input.options.format, 'options.format', errors);
      validateOptionalFiniteNumber(input.options.width, 'options.width', errors);
      validateOptionalFiniteNumber(input.options.height, 'options.height', errors);
      validateOptionalFiniteNumber(input.options.scaleFactor, 'options.scaleFactor', errors);
      validateOptionalString(input.options.background, 'options.background', errors);
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

export const registerHostSchemas = (): void => {
  registerPair('file.read', ['path']);
  registerPair('file.write', ['path', 'content']);
  registerPair('file.stat', ['path']);
  registerPair('file.list', ['dir']);
  registerPair('file.watch', ['path']);
  registerPair('file.mkdir', ['path']);
  registerPair('file.delete', ['path']);
  registerPair('file.move', ['sourcePath', 'destPath']);
  registerPair('file.copy', ['sourcePath', 'destPath']);

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
  registerPair('platform.ipcCreateChannel', ['name', 'transport']);
  registerPair('platform.ipcSend', ['channelId', 'payload']);
  registerPair('platform.ipcReceive', ['channelId']);
  registerPair('platform.ipcCloseChannel', ['channelId']);
  registerPair('platform.ipcListChannels', []);
  schemaRegistry.register('schemas/platform.renderHtmlToPdf.request.json', validatePlatformRenderHtmlToPdfRequest);
  schemaRegistry.register('schemas/platform.renderHtmlToPdf.response.json', objectWithKeys(['outputFile']));
  schemaRegistry.register('schemas/platform.renderHtmlToImage.request.json', validatePlatformRenderHtmlToImageRequest);
  schemaRegistry.register('schemas/platform.renderHtmlToImage.response.json', objectWithKeys(['outputFile', 'format']));

  registerPair('plugin.list', []);
  registerPair('plugin.get', ['pluginId']);
  registerPair('plugin.getSelf', []);
  registerPair('plugin.getCardPlugin', ['cardType']);
  registerPair('plugin.getLayoutPlugin', ['layoutType']);
  registerPair('plugin.install', ['manifestPath']);
  registerPair('plugin.enable', ['pluginId']);
  registerPair('plugin.disable', ['pluginId']);
  registerPair('plugin.uninstall', ['pluginId']);
  registerPair('plugin.launch', ['pluginId']);
  registerPair('plugin.getShortcut', ['pluginId']);
  registerPair('plugin.createShortcut', ['pluginId']);
  registerPair('plugin.removeShortcut', ['pluginId']);
  registerPair('plugin.query', []);
  registerPair('plugin.init', ['pluginId']);
  registerPair('plugin.handshake.complete', ['sessionId', 'nonce']);

  schemaRegistry.register('schemas/module.listProviders.request.json', validateModuleListProvidersRequest);
  schemaRegistry.register('schemas/module.listProviders.response.json', objectWithKeys(['providers']));
  schemaRegistry.register('schemas/module.resolve.request.json', validateModuleResolveRequest);
  schemaRegistry.register('schemas/module.resolve.response.json', objectWithKeys(['provider']));
  schemaRegistry.register('schemas/module.invoke.request.json', validateModuleInvokeRequest);
  schemaRegistry.register('schemas/module.invoke.response.json', validateModuleInvokeResponse);
  schemaRegistry.register('schemas/module.job.get.request.json', validateModuleJobRequest);
  schemaRegistry.register('schemas/module.job.get.response.json', objectWithKeys(['job']));
  schemaRegistry.register('schemas/module.job.cancel.request.json', validateModuleJobRequest);
  schemaRegistry.register('schemas/module.job.cancel.response.json', objectWithKeys(['ack']));

  registerPair('platform.getInfo', []);
  registerPair('platform.getCapabilities', []);
  registerPair('platform.getScreenInfo', []);
  registerPair('platform.listScreens', []);
  registerPair('platform.openExternal', ['url']);

  registerPair('log.write', ['level', 'message']);
  registerPair('log.query', []);
  registerPair('log.export', []);

  registerPair('credential.get', ['ref']);
  registerPair('credential.set', ['ref', 'value']);
  registerPair('credential.delete', ['ref']);
  registerPair('credential.rotate', ['ref']);

  registerPair('card.pack', ['cardDir', 'outputPath'], ['cardFile']);
  registerPair('card.unpack', ['cardFile', 'outputDir'], ['outputDir']);
  registerPair('card.readMetadata', ['cardFile'], ['metadata']);
  registerPair('card.parse', ['cardFile']);
  schemaRegistry.register('schemas/card.render.request.json', validateCardRenderRequest);
  schemaRegistry.register('schemas/card.render.response.json', objectWithKeys(['view']));
  registerPair('card.renderCover', ['cardFile'], ['view']);
  schemaRegistry.register('schemas/card.renderEditor.request.json', validateCardRenderEditorRequest);
  schemaRegistry.register('schemas/card.renderEditor.response.json', objectWithKeys(['view']));
  registerPair('card.releaseRenderSession', ['sessionId'], ['ack']);
  registerPair('card.resolveDocumentPath', ['documentUrl'], ['path']);
  registerPair('card.validate', ['cardFile']);

  registerPair('box.pack', ['boxDir', 'outputPath'], ['boxFile']);
  registerPair('box.unpack', ['boxFile', 'outputDir'], ['outputDir']);
  registerPair('box.inspect', ['boxFile'], ['inspection']);
  registerPair('box.validate', ['boxFile'], ['validationResult']);
  registerPair('box.readMetadata', ['boxFile'], ['metadata']);
  schemaRegistry.register('schemas/box.openView.request.json', objectWithKeys(['boxFile']));
  schemaRegistry.register('schemas/box.openView.response.json', objectWithKeys(['sessionId', 'box', 'initialView']));
  registerPair('box.listEntries', ['sessionId'], ['page']);
  registerPair('box.readEntryDetail', ['sessionId', 'entryIds', 'fields'], ['items']);
  registerPair('box.resolveEntryResource', ['sessionId', 'entryId', 'resource'], ['resource']);
  registerPair('box.readBoxAsset', ['sessionId', 'assetPath'], ['resource']);
  registerPair('box.prefetchEntries', ['sessionId', 'entryIds', 'targets'], ['ack']);
  registerPair('box.closeView', ['sessionId'], ['ack']);

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
