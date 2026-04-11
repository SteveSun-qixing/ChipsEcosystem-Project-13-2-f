import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { hostIntegration, type WebPluginSessionView, type WebResourceOpenRequest } from '../services/host-integration.js';

const DEFAULT_THEME_SNAPSHOT = {
  themeId: 'chips-official.default-theme',
  version: '1.0.0',
};

function injectPluginRuntime(html: string, sessionId: string): string {
  const baseTag = `<base href="/api/v1/host/plugin-sessions/${encodeURIComponent(sessionId)}/">`;
  const scriptTag = `<script src="/api/v1/host/plugin-sessions/${encodeURIComponent(sessionId)}/bootstrap.js"></script>`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>\n    ${baseTag}\n    ${scriptTag}`);
  }

  return `${baseTag}\n${scriptTag}\n${html}`;
}

function resolveContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.avif':
      return 'image/avif';
    case '.ico':
      return 'image/x-icon';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

function createBootstrapScript(session: WebPluginSessionView): string {
  const launchContext = {
    pluginId: session.pluginId,
    sessionId: session.sessionId,
    launchParams: session.launchParams,
  };

  return `
(function () {
  const sessionId = ${JSON.stringify(session.sessionId)};
  const launchContext = ${JSON.stringify(launchContext)};
  const themeSnapshot = ${JSON.stringify(DEFAULT_THEME_SNAPSHOT)};
  const locale = "zh-CN";
  const pending = new Map();
  const listeners = new Map();
  const localFiles = new Map();
  const localObjectUrls = new Map();
  let requestCounter = 0;

  function createRequestId() {
    requestCounter += 1;
    return sessionId + ":" + String(requestCounter);
  }

  function emit(eventName, payload) {
    const handlers = listeners.get(eventName);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error("[chips-web-shell] event handler failed", error);
      }
    }
  }

  function on(eventName, handler) {
    const handlers = listeners.get(eventName) || new Set();
    handlers.add(handler);
    listeners.set(eventName, handlers);
    return function unsubscribe() {
      const current = listeners.get(eventName);
      if (!current) {
        return;
      }
      current.delete(handler);
      if (current.size === 0) {
        listeners.delete(eventName);
      }
    };
  }

  function once(eventName, handler) {
    const unsubscribe = on(eventName, function wrapped(payload) {
      unsubscribe();
      handler(payload);
    });
  }

  function postToParent(message) {
    if (!window.parent || window.parent === window) {
      throw new Error("chips web shell parent window is missing");
    }
    window.parent.postMessage(message, window.location.origin);
  }

  function sanitizeFileName(fileName) {
    return String(fileName || "file").replace(/[^a-zA-Z0-9._-]+/g, "-");
  }

  function storeLocalFile(file) {
    const token = "chips-web-file://" + crypto.randomUUID() + "/" + sanitizeFileName(file && file.name ? file.name : "file");
    localFiles.set(token, file);
    return token;
  }

  async function openBrowserFileDialog() {
    return await new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,.card,.box";
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.addEventListener("change", () => {
        const files = Array.from(input.files || []);
        input.remove();
        resolve(files.map((file) => storeLocalFile(file)));
      }, { once: true });
      input.click();
    });
  }

  function resolveLocalResourceUri(resourceId) {
    if (resourceId.startsWith("http://") || resourceId.startsWith("https://") || resourceId.startsWith("data:") || resourceId.startsWith("blob:")) {
      return resourceId;
    }
    if (!resourceId.startsWith("chips-web-file://")) {
      return null;
    }

    const file = localFiles.get(resourceId);
    if (!file) {
      throw new Error("local file handle not found");
    }

    const existingUrl = localObjectUrls.get(resourceId);
    if (existingUrl) {
      return existingUrl;
    }

    const objectUrl = URL.createObjectURL(file);
    localObjectUrls.set(resourceId, objectUrl);
    return objectUrl;
  }

  async function handleLocalInvoke(action, payload) {
    if (action === "platform.getInfo") {
      return {
        info: {
          hostKind: "web",
          platform: "web",
          arch: "browser",
          release: "web",
        },
      };
    }

    if (action === "platform.getCapabilities") {
      return {
        capabilities: {
          hostKind: "web",
          platform: "web",
          facets: {
            surface: { supported: true, interactive: true, supportedKinds: ["route", "tab", "modal"] },
            storage: { localWorkspace: false, sandboxFilePicker: true, remoteBacked: true },
            selection: { openFile: true, saveFile: false, directory: false, multiple: true },
            transfer: { upload: true, download: true, share: true, externalOpen: true, revealInShell: false },
            association: { fileAssociation: false, urlScheme: false, shareTarget: true },
            device: { screen: true, power: false, network: true },
            systemUi: { clipboard: true, tray: false, globalShortcut: false, notification: true },
            background: { keepAlive: false, wakeEvents: false },
            ipc: { namedPipe: false, unixSocket: false, sharedMemory: false },
            offscreenRender: { htmlToPdf: false, htmlToImage: false },
          },
        },
      };
    }

    if (action === "theme.getCurrent") {
      return {
        themeId: themeSnapshot.themeId,
        displayName: "Default Theme",
        version: themeSnapshot.version,
      };
    }

    if (action === "i18n.getCurrent") {
      return { locale };
    }

    if (action === "resource.resolve") {
      const resourceId = payload && typeof payload === "object" ? payload.resourceId : undefined;
      if (typeof resourceId !== "string" || resourceId.trim().length === 0) {
        throw new Error("resourceId is required");
      }
      const uri = resolveLocalResourceUri(resourceId.trim());
      if (!uri) {
        throw new Error("unsupported web resource id");
      }
      return { uri };
    }

    if (action === "platform.dialogOpenFile") {
      const filePaths = await openBrowserFileDialog();
      return { filePaths };
    }

    if (action === "platform.dialogSaveFile") {
      return { filePath: null };
    }

    if (action === "platform.dialogShowMessage") {
      const message = payload && typeof payload === "object" && payload.options && typeof payload.options === "object"
        ? payload.options.message
        : "";
      window.alert(typeof message === "string" ? message : "");
      return { response: 0 };
    }

    if (action === "platform.dialogShowConfirm") {
      const message = payload && typeof payload === "object" && payload.options && typeof payload.options === "object"
        ? payload.options.message
        : "";
      return { confirmed: window.confirm(typeof message === "string" ? message : "") };
    }

    if (action === "platform.notificationShow") {
      return { ack: true };
    }

    return null;
  }

  async function invokeRemote(action, payload) {
    const requestId = createRequestId();
    return await new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      postToParent({
        type: "chips.web-shell:invoke",
        sessionId,
        requestId,
        action,
        payload,
      });
    });
  }

  async function invoke(action, payload) {
    const local = await handleLocalInvoke(action, payload);
    if (local !== null) {
      return local;
    }
    return await invokeRemote(action, payload);
  }

  async function emitToHost(eventName, payload) {
    postToParent({
      type: "chips.web-shell:emit",
      sessionId,
      event: eventName,
      payload,
    });
  }

  window.addEventListener("message", function handleMessage(event) {
    if (event.origin !== window.location.origin) {
      return;
    }

    const data = event.data;
    if (!data || typeof data !== "object" || data.sessionId !== sessionId) {
      return;
    }

    if (data.type === "chips.web-shell:result") {
      const pendingRequest = pending.get(data.requestId);
      if (!pendingRequest) {
        return;
      }
      pending.delete(data.requestId);
      if (data.error) {
        const error = new Error(data.error.message || "Bridge invoke failed");
        if (data.error && typeof data.error === "object") {
          Object.assign(error, data.error);
        }
        pendingRequest.reject(error);
        return;
      }
      pendingRequest.resolve(data.result);
      return;
    }

    if (data.type === "chips.web-shell:event") {
      emit(data.event, data.payload);
    }
  });

  document.documentElement.lang = locale;
  document.documentElement.setAttribute("data-chips-theme-id", themeSnapshot.themeId);
  document.documentElement.setAttribute("data-chips-theme-version", themeSnapshot.version);

  window.chips = {
    invoke,
    on,
    once,
    emit: emitToHost,
    window: {},
    surface: {},
    transfer: {},
    association: {},
    platform: {
      getLaunchContext: function () {
        return launchContext;
      },
      getPathForFile: function (file) {
        if (!(file instanceof File)) {
          return "";
        }
        return storeLocalFile(file);
      },
    },
  };
})();
`.trimStart();
}

const hostRuntimeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api/v1/host/plugin-sessions',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request) => {
      const body = request.body as { pluginId?: unknown; launchParams?: unknown };
      const pluginId = typeof body?.pluginId === 'string' ? body.pluginId.trim() : '';
      if (!pluginId) {
        throw new Error('pluginId is required');
      }

      const session = await hostIntegration.openWebPluginSession({
        pluginId,
        launchParams: body?.launchParams && typeof body.launchParams === 'object' && !Array.isArray(body.launchParams)
          ? body.launchParams as Record<string, unknown>
          : {},
      });

      return { data: session };
    },
  );

  fastify.get(
    '/api/v1/host/plugin-sessions/:sessionId',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request) => {
      const { sessionId } = request.params as { sessionId: string };
      return { data: hostIntegration.getWebPluginSession(sessionId) };
    },
  );

  fastify.delete(
    '/api/v1/host/plugin-sessions/:sessionId',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      hostIntegration.closeWebPluginSession(sessionId);
      return reply.status(204).send();
    },
  );

  fastify.post(
    '/api/v1/host/resource-open-plan',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request) => {
      const body = request.body as WebResourceOpenRequest;
      const plan = await hostIntegration.resolveWebResourceOpenPlan(body);
      return { data: plan };
    },
  );

  fastify.get(
    '/api/v1/host/plugin-sessions/:sessionId/entry',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const entry = hostIntegration.getWebPluginEntry(sessionId);
      const html = await fs.readFile(entry.entryPath, 'utf-8');
      reply.type('text/html; charset=utf-8');
      reply.header('Cache-Control', 'no-store');
      return injectPluginRuntime(html, sessionId);
    },
  );

  fastify.get(
    '/api/v1/host/plugin-sessions/:sessionId/bootstrap.js',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const session = hostIntegration.getWebPluginSession(sessionId);
      reply.type('application/javascript; charset=utf-8');
      reply.header('Cache-Control', 'no-store');
      return createBootstrapScript(session);
    },
  );

  fastify.get(
    '/api/v1/host/plugin-sessions/:sessionId/assets/*',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request, reply) => {
      const params = request.params as { sessionId: string; '*': string };
      const assetPath = params['*'] ?? '';
      const resolvedPath = hostIntegration.resolveWebPluginAssetPath(params.sessionId, assetPath);
      const file = await fs.readFile(resolvedPath);
      reply.type(resolveContentType(resolvedPath));
      reply.header('Cache-Control', 'public, max-age=300');
      return reply.send(file);
    },
  );
};

export default hostRuntimeRoutes;
