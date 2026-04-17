type ChipsBridgeLike = {
  invoke?: (route: string, input?: Record<string, unknown>) => Promise<unknown>;
};

export const WEBPAGE_VIEWPORT_MESSAGE_TYPE = "chips:webpage-card:viewport";
export const WEBPAGE_VIEWPORT_EVENT = "chips:webpage-card:viewport-change";
export const WEBPAGE_CONTENT_HEIGHT_MESSAGE_TYPE = "chips:webpage-card:content-height";
export const WEBPAGE_VIEWPORT_GLOBAL_KEY = "__CHIPS_WEBPAGE_CARD_VIEWPORT__";

export interface WebpageViewportPayload {
  version: 1;
  displayMode: "fixed" | "free";
  fixedRatio: "7:16";
  width: number;
  height: number;
  baseHeight: number;
  maxHeight: number;
  scrollMode: boolean;
}

function clampViewportNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function escapeScriptContent(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}

function setViewportCssVariable(style: CSSStyleDeclaration, name: string, value: number): void {
  style.setProperty(name, `${Math.max(0, Math.round(value))}px`);
}

function normalizeViewportPayload(payload: WebpageViewportPayload): WebpageViewportPayload {
  return {
    version: 1,
    displayMode: payload.displayMode === "free" ? "free" : "fixed",
    fixedRatio: "7:16",
    width: clampViewportNumber(payload.width),
    height: clampViewportNumber(payload.height),
    baseHeight: clampViewportNumber(payload.baseHeight),
    maxHeight: clampViewportNumber(payload.maxHeight),
    scrollMode: Boolean(payload.scrollMode),
  };
}

function createViewportBridgeScript(payload: WebpageViewportPayload): string {
  const initialPayload = JSON.stringify(normalizeViewportPayload(payload)).replace(/</g, "\\u003c");

  return escapeScriptContent(
    [
      "(function () {",
      `  var VIEWPORT_MESSAGE_TYPE = ${JSON.stringify(WEBPAGE_VIEWPORT_MESSAGE_TYPE)};`,
      `  var VIEWPORT_EVENT = ${JSON.stringify(WEBPAGE_VIEWPORT_EVENT)};`,
      `  var CONTENT_HEIGHT_MESSAGE_TYPE = ${JSON.stringify(WEBPAGE_CONTENT_HEIGHT_MESSAGE_TYPE)};`,
      `  var GLOBAL_KEY = ${JSON.stringify(WEBPAGE_VIEWPORT_GLOBAL_KEY)};`,
      "  var VIRTUAL_VH_CSS_VAR = '--chips-webpage-card-virtual-vh';",
      "  var viewportHeightUnitPattern = /(-?\\d*\\.?\\d+)(dvh|svh|lvh|vh)\\b/gi;",
      `  var initialPayload = ${initialPayload};`,
      "  var viewportState = null;",
      "  var rewriteFrame = 0;",
      "  function asNumber(value) {",
      "    return typeof value === 'number' && isFinite(value) ? Math.max(0, Math.round(value)) : 0;",
      "  }",
      "  function normalizePayload(payload) {",
      "    return {",
      "      version: 1,",
      "      displayMode: payload && payload.displayMode === 'free' ? 'free' : 'fixed',",
      "      fixedRatio: '7:16',",
      "      width: asNumber(payload && payload.width),",
      "      height: asNumber(payload && payload.height),",
      "      baseHeight: asNumber(payload && payload.baseHeight),",
      "      maxHeight: asNumber(payload && payload.maxHeight),",
      "      scrollMode: Boolean(payload && payload.scrollMode),",
      "    };",
      "  }",
      "  function convertViewportHeightUnits(value) {",
      "    if (typeof value !== 'string' || value.indexOf('vh') === -1 || value.indexOf(VIRTUAL_VH_CSS_VAR) !== -1) {",
      "      return value;",
      "    }",
      "    return value.replace(viewportHeightUnitPattern, function (_match, amount) {",
      "      return 'calc(var(' + VIRTUAL_VH_CSS_VAR + ', 1vh) * ' + amount + ')';",
      "    });",
      "  }",
      "  function rewriteStyleDeclaration(style) {",
      "    if (!style) {",
      "      return;",
      "    }",
      "    for (var index = 0; index < style.length; index += 1) {",
      "      var propertyName = style[index];",
      "      var propertyValue = style.getPropertyValue(propertyName);",
      "      var nextValue = convertViewportHeightUnits(propertyValue);",
      "      if (nextValue !== propertyValue) {",
      "        style.setProperty(propertyName, nextValue, style.getPropertyPriority(propertyName));",
      "      }",
      "    }",
      "  }",
      "  function rewriteCssRules(rules) {",
      "    if (!rules) {",
      "      return;",
      "    }",
      "    for (var index = 0; index < rules.length; index += 1) {",
      "      var rule = rules[index];",
      "      if (rule && rule.style) {",
      "        rewriteStyleDeclaration(rule.style);",
      "      }",
      "      if (rule && rule.cssRules) {",
      "        try {",
      "          rewriteCssRules(rule.cssRules);",
      "        } catch (_error) {",
      "          void _error;",
      "        }",
      "      }",
      "    }",
      "  }",
      "  function rewriteAccessibleStylesheets() {",
      "    var styleSheets = document.styleSheets;",
      "    for (var index = 0; index < styleSheets.length; index += 1) {",
      "      try {",
      "        rewriteCssRules(styleSheets[index].cssRules);",
      "      } catch (_error) {",
      "        void _error;",
      "      }",
      "    }",
      "  }",
      "  function rewriteInlineViewportUnits(rootNode) {",
      "    if (!rootNode) {",
      "      return;",
      "    }",
      "    if (rootNode.style) {",
      "      rewriteStyleDeclaration(rootNode.style);",
      "    }",
      "    if (typeof rootNode.querySelectorAll !== 'function') {",
      "      return;",
      "    }",
      "    var nodes = rootNode.querySelectorAll('[style]');",
      "    for (var index = 0; index < nodes.length; index += 1) {",
      "      rewriteStyleDeclaration(nodes[index].style);",
      "    }",
      "  }",
      "  function rewriteViewportUnits() {",
      "    rewriteAccessibleStylesheets();",
      "    rewriteInlineViewportUnits(document.documentElement);",
      "  }",
      "  function scheduleViewportUnitRewrite() {",
      "    if (rewriteFrame) {",
      "      return;",
      "    }",
      "    var schedule = typeof window.requestAnimationFrame === 'function'",
      "      ? function (callback) { return window.requestAnimationFrame(callback); }",
      "      : function (callback) { return window.setTimeout(callback, 0); };",
      "    rewriteFrame = schedule(function () {",
      "      rewriteFrame = 0;",
      "      rewriteViewportUnits();",
      "    });",
      "  }",
      "  function tryDefineWindowMetric(name, getter) {",
      "    try {",
      "      Object.defineProperty(window, name, {",
      "        configurable: true,",
      "        enumerable: true,",
      "        get: getter,",
      "      });",
      "    } catch (_error) {",
      "      void _error;",
      "    }",
      "  }",
      "  function installViewportMetricOverrides() {",
      "    tryDefineWindowMetric('innerHeight', function () {",
      "      return viewportState ? viewportState.height : 0;",
      "    });",
      "    tryDefineWindowMetric('outerHeight', function () {",
      "      return viewportState ? viewportState.height : 0;",
      "    });",
      "    try {",
      "      var root = document.documentElement;",
      "      if (root) {",
      "        Object.defineProperty(root, 'clientHeight', {",
      "          configurable: true,",
      "          get: function () {",
      "            return viewportState ? viewportState.height : 0;",
      "          },",
      "        });",
      "      }",
      "    } catch (_error) {",
      "      void _error;",
      "    }",
      "  }",
      "  function dispatchVirtualResize() {",
      "    try {",
      "      var EventCtor = window.Event;",
      "      if (typeof EventCtor === 'function') {",
      "        window.dispatchEvent(new EventCtor('resize'));",
      "      }",
      "    } catch (_error) {",
      "      void _error;",
      "    }",
      "  }",
      "  function applyPayload(payload) {",
      "    var nextPayload = normalizePayload(payload || initialPayload);",
      "    var previousWidth = viewportState ? viewportState.width : 0;",
      "    var previousHeight = viewportState ? viewportState.height : 0;",
      "    viewportState = nextPayload;",
      "    var root = document.documentElement;",
      "    if (root && root.style) {",
      "      root.style.setProperty('--chips-webpage-card-viewport-width', nextPayload.width + 'px');",
      "      root.style.setProperty('--chips-webpage-card-viewport-height', nextPayload.height + 'px');",
      "      root.style.setProperty('--chips-webpage-card-base-height', nextPayload.baseHeight + 'px');",
      "      root.style.setProperty('--chips-webpage-card-max-height', nextPayload.maxHeight + 'px');",
      "      root.style.setProperty(VIRTUAL_VH_CSS_VAR, (Math.max(1, nextPayload.height) / 100) + 'px');",
      "      root.style.setProperty('--chips-webpage-card-scroll-mode', nextPayload.scrollMode ? '1' : '0');",
      "      root.setAttribute('data-chips-webpage-card-display-mode', nextPayload.displayMode);",
      "      root.setAttribute('data-chips-webpage-card-fixed-ratio', nextPayload.fixedRatio);",
      "      root.setAttribute('data-chips-webpage-card-scroll-mode', nextPayload.scrollMode ? 'true' : 'false');",
      "    }",
      "    window[GLOBAL_KEY] = nextPayload;",
      "    scheduleViewportUnitRewrite();",
      "    try {",
      "      var CustomEventCtor = window.CustomEvent;",
      "      if (typeof CustomEventCtor === 'function') {",
      "        window.dispatchEvent(new CustomEventCtor(VIEWPORT_EVENT, { detail: nextPayload }));",
      "      }",
      "    } catch (_error) {",
      "      void _error;",
      "    }",
      "    if (nextPayload.width !== previousWidth || nextPayload.height !== previousHeight) {",
      "      dispatchVirtualResize();",
      "    }",
      "  }",
      "  function measureHeight() {",
      "    var root = document.documentElement;",
      "    var body = document.body;",
      "    return Math.max(",
      "      root && root.scrollHeight ? root.scrollHeight : 0,",
      "      root && root.offsetHeight ? root.offsetHeight : 0,",
      "      root && root.clientHeight ? root.clientHeight : 0,",
      "      body && body.scrollHeight ? body.scrollHeight : 0,",
      "      body && body.offsetHeight ? body.offsetHeight : 0,",
      "      body && body.clientHeight ? body.clientHeight : 0",
      "    );",
      "  }",
      "  function reportHeight() {",
      "    try {",
      "      if (!window.parent || window.parent === window) {",
      "        return;",
      "      }",
      "      window.parent.postMessage({",
      "        type: CONTENT_HEIGHT_MESSAGE_TYPE,",
      "        payload: {",
      "          version: 1,",
      "          contentHeight: measureHeight(),",
      "        },",
      "      }, '*');",
      "    } catch (_error) {",
      "      void _error;",
      "    }",
      "  }",
      "  window.addEventListener('message', function (event) {",
      "    var data = event && event.data;",
      "    if (!data || data.type !== VIEWPORT_MESSAGE_TYPE) {",
      "      return;",
      "    }",
      "    applyPayload(data.payload || initialPayload);",
      "    reportHeight();",
      "  });",
      "  if (typeof ResizeObserver === 'function') {",
      "    var resizeObserver = new ResizeObserver(function () {",
      "      scheduleViewportUnitRewrite();",
      "      reportHeight();",
      "    });",
      "    resizeObserver.observe(document.documentElement);",
      "    if (document.body) {",
      "      resizeObserver.observe(document.body);",
      "    }",
      "  }",
      "  try {",
      "    var mutationObserver = new MutationObserver(function () {",
      "      scheduleViewportUnitRewrite();",
      "      reportHeight();",
      "    });",
      "    mutationObserver.observe(document.documentElement, {",
      "      childList: true,",
      "      subtree: true,",
      "      attributes: true,",
      "      characterData: true,",
      "    });",
      "  } catch (_error) {",
      "    void _error;",
      "  }",
      "  installViewportMetricOverrides();",
      "  window.addEventListener('load', function () {",
      "    scheduleViewportUnitRewrite();",
      "    reportHeight();",
      "  });",
      "  if (document.readyState === 'complete' || document.readyState === 'interactive') {",
      "    window.setTimeout(function () {",
      "      scheduleViewportUnitRewrite();",
      "      reportHeight();",
      "    }, 0);",
      "  } else {",
      "    document.addEventListener('DOMContentLoaded', function () {",
      "      scheduleViewportUnitRewrite();",
      "      reportHeight();",
      "    }, { once: true });",
      "  }",
      "  applyPayload(initialPayload);",
      "  reportHeight();",
      "})();",
    ].join("\n"),
  );
}

function detectResourceProtocol(resourceUrl: string): string | null {
  const match = resourceUrl.match(/^([a-zA-Z][a-zA-Z\d+.-]*):/);
  return match?.[1]?.toLowerCase() ?? null;
}

function decodeFileUrlPath(resourceUrl: string): string | null {
  try {
    const url = new URL(resourceUrl);
    if (url.protocol !== "file:") {
      return null;
    }

    if (url.hostname && url.hostname !== "localhost") {
      return `//${url.hostname}${decodeURIComponent(url.pathname)}`;
    }

    const decodedPath = decodeURIComponent(url.pathname);
    if (/^\/[a-zA-Z]:\//.test(decodedPath)) {
      return decodedPath.slice(1);
    }

    return decodedPath;
  } catch {
    return null;
  }
}

async function readTextViaBridge(resourceUrl: string): Promise<string | null> {
  const absolutePath = decodeFileUrlPath(resourceUrl);
  if (!absolutePath) {
    return null;
  }

  const bridge = (globalThis as { window?: { chips?: ChipsBridgeLike }; chips?: ChipsBridgeLike }).window?.chips
    ?? (globalThis as { chips?: ChipsBridgeLike }).chips;
  if (!bridge || typeof bridge.invoke !== "function") {
    return null;
  }

  const result = await bridge.invoke("file.read", {
    path: absolutePath,
    options: { encoding: "utf-8" },
  });
  const content = (result as { content?: unknown } | null)?.content ?? result;
  return typeof content === "string" ? content : null;
}

async function readTextViaFetch(resourceUrl: string, resourcePath: string): Promise<string> {
  const response = await fetch(resourceUrl);
  if (!response.ok) {
    throw new Error(`无法读取网页资源：${resourcePath}`);
  }

  return await response.text();
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function loadTextFromRuntimeUrl(resourceUrl: string, resourcePath: string): Promise<string> {
  const protocol = detectResourceProtocol(resourceUrl);
  if (protocol === "file") {
    const bridgeText = await readTextViaBridge(resourceUrl);
    if (typeof bridgeText === "string") {
      return bridgeText;
    }
  }

  return readTextViaFetch(resourceUrl, resourcePath);
}

export function deriveBaseHref(entryUrl: string): string {
  try {
    return new URL("./", entryUrl).toString();
  } catch {
    const normalized = entryUrl.replace(/\\/g, "/");
    return normalized.slice(0, normalized.lastIndexOf("/") + 1);
  }
}

export function applyViewportPayloadToDocument(doc: Document, payload: WebpageViewportPayload): void {
  const normalizedPayload = normalizeViewportPayload(payload);
  const root = doc.documentElement;
  if (!root) {
    return;
  }

  setViewportCssVariable(root.style, "--chips-webpage-card-viewport-width", normalizedPayload.width);
  setViewportCssVariable(root.style, "--chips-webpage-card-viewport-height", normalizedPayload.height);
  setViewportCssVariable(root.style, "--chips-webpage-card-base-height", normalizedPayload.baseHeight);
  setViewportCssVariable(root.style, "--chips-webpage-card-max-height", normalizedPayload.maxHeight);
  root.style.setProperty("--chips-webpage-card-scroll-mode", normalizedPayload.scrollMode ? "1" : "0");
  root.setAttribute("data-chips-webpage-card-display-mode", normalizedPayload.displayMode);
  root.setAttribute("data-chips-webpage-card-fixed-ratio", normalizedPayload.fixedRatio);
  root.setAttribute("data-chips-webpage-card-scroll-mode", normalizedPayload.scrollMode ? "true" : "false");

  const frameWindow = doc.defaultView as (Window & Record<string, unknown>) | null;
  if (!frameWindow) {
    return;
  }

  frameWindow[WEBPAGE_VIEWPORT_GLOBAL_KEY] = normalizedPayload;
  try {
    const CustomEventCtor = frameWindow.CustomEvent ?? CustomEvent;
    frameWindow.dispatchEvent(new CustomEventCtor(WEBPAGE_VIEWPORT_EVENT, { detail: normalizedPayload }));
  } catch {
    // Ignore custom event failures in minimal environments.
  }
}

export function publishViewportToFrame(
  frame: HTMLIFrameElement,
  payload: WebpageViewportPayload,
): void {
  const normalizedPayload = normalizeViewportPayload(payload);

  try {
    if (frame.contentDocument) {
      applyViewportPayloadToDocument(frame.contentDocument, normalizedPayload);
    }
  } catch {
    // Cross-origin documents can only receive postMessage.
  }

  try {
    frame.contentWindow?.postMessage({
      type: WEBPAGE_VIEWPORT_MESSAGE_TYPE,
      payload: normalizedPayload,
    }, "*");
  } catch {
    // Ignore message failures while the iframe is still booting.
  }
}

export function createSrcDocDocument(
  htmlText: string,
  baseHref: string,
  initialViewport?: WebpageViewportPayload,
): string {
  const baseTag = `<base href="${escapeHtmlAttribute(baseHref)}" />`;
  const viewportBridge = initialViewport
    ? `<script>${createViewportBridgeScript(initialViewport)}</script>`
    : "";
  if (/<head[\s>]/i.test(htmlText)) {
    return htmlText.replace(/<head([^>]*)>/i, `<head$1>${baseTag}${viewportBridge}`);
  }

  if (/<html[\s>]/i.test(htmlText)) {
    return htmlText.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}${viewportBridge}</head>`);
  }

  return `<!doctype html><html><head>${baseTag}${viewportBridge}</head><body>${htmlText}</body></html>`;
}
