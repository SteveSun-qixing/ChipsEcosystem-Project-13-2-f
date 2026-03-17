export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const EMPTY_RICH_TEXT_BODY = "<p></p>";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "sup",
  "sub",
  "code",
  "span",
  "a",
  "img",
]);

const GLOBAL_ALLOWED_ATTRS = new Set(["title", "style"]);

const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title", "style"]),
  img: new Set(["src", "alt", "width", "height", "title", "style"]),
};

const STYLE_ALLOWED_PROPS = new Set([
  "color",
  "background-color",
  "font-size",
  "text-align",
  "font-weight",
  "font-style",
  "text-decoration",
]);

function sanitizeStyleAttribute(style: string): string {
  const safe: string[] = [];
  const declarations = style.split(";");
  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const [propRaw, valueRaw] = trimmed.split(":", 2);
    if (!propRaw || !valueRaw) continue;
    const prop = propRaw.trim().toLowerCase();
    const value = valueRaw.trim();
    if (STYLE_ALLOWED_PROPS.has(prop)) {
      safe.push(`${prop}: ${value}`);
    }
  }
  return safe.join("; ");
}

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return false;
  }
  return true;
}

function sanitizeElement(el: HTMLElement): void {
  const tag = el.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tag)) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
    return;
  }

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name;
    const value = attr.value;
    const lowerName = name.toLowerCase();

    const allowedForTag =
      TAG_ALLOWED_ATTRS[tag as keyof typeof TAG_ALLOWED_ATTRS];
    const isAllowedGlobal = GLOBAL_ALLOWED_ATTRS.has(lowerName);
    const isAllowedOnTag = allowedForTag?.has(lowerName) ?? false;

    if (!isAllowedGlobal && !isAllowedOnTag) {
      el.removeAttribute(name);
      continue;
    }

    if (lowerName === "style") {
      const safeStyle = sanitizeStyleAttribute(value);
      if (safeStyle) {
        el.setAttribute("style", safeStyle);
      } else {
        el.removeAttribute("style");
      }
      continue;
    }

    if (tag === "a" && lowerName === "href") {
      if (!isSafeUrl(value)) {
        el.removeAttribute(name);
      } else {
        if (!el.hasAttribute("target")) {
          el.setAttribute("target", "_blank");
        }
        const existingRel = el.getAttribute("rel") || "";
        const relParts = new Set(
          existingRel
            .split(/\s+/)
            .map((p) => p.trim())
            .filter(Boolean)
        );
        relParts.add("noopener");
        el.setAttribute("rel", Array.from(relParts).join(" "));
      }
      continue;
    }

    if (tag === "img" && lowerName === "src") {
      if (!isSafeUrl(value) && !value.startsWith("/")) {
        el.removeAttribute(name);
      }
      continue;
    }
  }
}

export function sanitizeRichTextHtml(html: string): string {
  if (!html) return "";

  if (typeof document === "undefined") {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  const elements: HTMLElement[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.ELEMENT_NODE) {
      elements.push(node as HTMLElement);
    }
  }

  for (const el of elements) {
    sanitizeElement(el);
  }

  return template.innerHTML;
}

export function normalizeRichTextHtml(html: string): string {
  const sanitized = sanitizeRichTextHtml(html);
  if (!sanitized.trim()) {
    return EMPTY_RICH_TEXT_BODY;
  }

  return sanitized;
}

export function hasMeaningfulRichTextContent(html: string): boolean {
  const sanitized = normalizeRichTextHtml(html);
  const plainText = sanitized
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();

  if (plainText.length > 0) {
    return true;
  }

  return /<(img|video|audio|iframe|hr|table|ul|ol|blockquote|pre)\b/i.test(sanitized);
}
