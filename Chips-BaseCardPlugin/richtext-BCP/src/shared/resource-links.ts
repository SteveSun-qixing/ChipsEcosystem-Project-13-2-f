import type { BasecardConfig } from "../schema/card-config";
import { isRelativeResourcePath, normalizeResourcePath } from "./utils";

export async function loadMarkdownFromConfig(
  config: BasecardConfig,
  resolveResourceUrl?: (resourcePath: string) => Promise<string>,
): Promise<string> {
  if (config.content_source === "inline") {
    return config.content_text ?? "";
  }

  const resourcePath = normalizeResourcePath(config.content_file ?? "");
  if (!resourcePath) {
    return "";
  }

  const resourceUrl = resolveResourceUrl
    ? await resolveResourceUrl(resourcePath)
    : resourcePath;

  const response = await fetch(resourceUrl);
  if (!response.ok) {
    throw new Error(`无法读取 Markdown 资源：${resourcePath}`);
  }

  return await response.text();
}

export async function rewriteRelativeResourceUrls(
  container: HTMLElement,
  resolveResourceUrl?: (resourcePath: string) => Promise<string>,
): Promise<string[]> {
  if (!resolveResourceUrl) {
    return [];
  }

  const tracked = new Set<string>();
  const tasks: Array<Promise<void>> = [];

  for (const element of Array.from(container.querySelectorAll<HTMLElement>("img[src], a[href]"))) {
    const attribute = element.tagName.toLowerCase() === "img" ? "src" : "href";
    const rawValue = element.getAttribute(attribute) ?? "";
    if (!isRelativeResourcePath(rawValue)) {
      continue;
    }

    const resourcePath = normalizeResourcePath(rawValue);
    if (!resourcePath) {
      continue;
    }

    tracked.add(resourcePath);
    tasks.push(
      resolveResourceUrl(resourcePath)
        .then((resolvedUrl) => {
          element.setAttribute(attribute, resolvedUrl);
          if (attribute === "href") {
            element.setAttribute("target", "_blank");
            element.setAttribute("rel", "noopener noreferrer");
          }
        })
        .catch(() => {
          // 保持原始相对路径，交由宿主或 base href 决定最终行为。
        }),
    );
  }

  await Promise.all(tasks);
  return Array.from(tracked);
}
