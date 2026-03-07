/**
 * DOM工具函数
 */

/**
 * 解析HTML字符串为DocumentFragment
 */
export function parseHtml(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * 遍历DOM节点
 */
export function walkNodes(node: Node, callback: (node: Node) => void | boolean): void {
  const result = callback(node);
  if (result === false) return;

  let child = node.firstChild;
  while (child) {
    const next = child.nextSibling;
    walkNodes(child, callback);
    child = next;
  }
}

/**
 * 提取纯文本
 */
export function extractText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

/**
 * 统计字数（中文按字计，英文按词计）
 */
export function countWords(html: string): number {
  const text = extractText(html);
  // 简单处理：移除空白后计算字符数
  return text.replace(/\s/g, '').length;
}

/**
 * 检查是否为空内容
 */
export function isEmpty(html: string): boolean {
  const text = extractText(html);
  return text.trim().length === 0;
}

/**
 * 获取第一张图片URL
 */
export function getFirstImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/**
 * 获取所有链接
 */
export function getAllLinks(html: string): string[] {
  const links: string[] = [];
  const regex = /<a[^>]+href=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return links;
}

/**
 * 获取块级父元素
 */
export function getBlockParent(node: Node | null): HTMLElement | null {
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const display = window.getComputedStyle(element).display;
      if (display === 'block' || display === 'list-item') {
        return element;
      }
    }
    node = node.parentNode;
  }
  return null;
}

/**
 * 转义HTML特殊字符
 */
export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}
