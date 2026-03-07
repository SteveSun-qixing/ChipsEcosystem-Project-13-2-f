/**
 * HTML安全过滤器
 */

import {
  ALLOWED_TAGS,
  ALLOWED_ATTRS,
  ALLOWED_PROTOCOLS,
  ALLOWED_STYLES,
} from '../types/constants';

/**
 * 过滤HTML内容，移除危险元素和属性
 *
 * @param html - 原始HTML字符串
 * @returns 安全的HTML字符串
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  sanitizeNode(doc.body);

  return doc.body.innerHTML;
}

/**
 * 递归清理节点
 */
function sanitizeNode(node: Node): void {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element;
      const tagName = element.tagName.toLowerCase();

      // 移除script、style等危险标签
      if (['script', 'style', 'iframe', 'object', 'embed', 'form'].includes(tagName)) {
        node.removeChild(element);
        continue;
      }

      // 检查标签白名单
      if (!ALLOWED_TAGS.includes(tagName)) {
        // 保留内容，移除标签
        while (element.firstChild) {
          node.insertBefore(element.firstChild, element);
        }
        node.removeChild(element);
        continue;
      }

      // 过滤属性
      sanitizeAttributes(element);

      // 递归处理子节点
      sanitizeNode(element);
    }
  }
}

/**
 * 清理元素属性
 */
function sanitizeAttributes(element: Element): void {
  const tagName = element.tagName.toLowerCase();
  const allowedForTag = ALLOWED_ATTRS[tagName] || [];
  const allowedForAll = ALLOWED_ATTRS['*'] || [];
  const allowed = new Set([...allowedForAll, ...allowedForTag]);

  const attrs = Array.from(element.attributes);
  for (const attr of attrs) {
    const name = attr.name.toLowerCase();

    // 移除事件处理器
    if (name.startsWith('on')) {
      element.removeAttribute(attr.name);
      continue;
    }

    // 移除javascript:协议
    if (attr.value.toLowerCase().includes('javascript:')) {
      element.removeAttribute(attr.name);
      continue;
    }

    // 检查属性白名单
    if (!allowed.has(name)) {
      element.removeAttribute(attr.name);
      continue;
    }

    // 检查href协议
    if (name === 'href' || name === 'src') {
      if (!isAllowedUrl(attr.value)) {
        element.removeAttribute(attr.name);
      }
    }

    // 过滤style属性
    if (name === 'style') {
      const safeStyle = sanitizeStyle(attr.value);
      if (safeStyle) {
        element.setAttribute('style', safeStyle);
      } else {
        element.removeAttribute('style');
      }
    }
  }
}

/**
 * 检查URL是否安全
 */
function isAllowedUrl(url: string): boolean {
  if (!url) return true;

  // 检查是否包含javascript:
  if (url.toLowerCase().includes('javascript:')) {
    return false;
  }

  // 检查是否包含data:（除了图片）
  if (url.toLowerCase().startsWith('data:') && !url.toLowerCase().startsWith('data:image/')) {
    return false;
  }

  // 相对路径是允许的
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || url.startsWith('#')) {
    return true;
  }

  // data:image是允许的
  if (url.toLowerCase().startsWith('data:image/')) {
    return true;
  }

  try {
    const parsed = new URL(url, 'http://example.com');
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 过滤样式属性
 */
function sanitizeStyle(style: string): string {
  if (!style) return '';

  const parts = style.split(';').filter(Boolean);
  const safe: string[] = [];

  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) continue;

    const prop = part.substring(0, colonIndex).trim().toLowerCase();
    const value = part.substring(colonIndex + 1).trim();

    if (ALLOWED_STYLES.includes(prop)) {
      // 检查value是否包含url或expression
      if (!value.toLowerCase().includes('url(') && !value.toLowerCase().includes('expression(')) {
        safe.push(`${prop}: ${value}`);
      }
    }
  }

  return safe.join('; ');
}

/**
 * 检查HTML是否安全
 */
export function isSafeHtml(html: string): boolean {
  const sanitized = sanitizeHtml(html);
  // 简单比较，实际可能需要更精细的对比
  return sanitized === html;
}
