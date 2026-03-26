/**
 * URL 替换模块
 * 将 content/*.yaml 中引用本地资源文件名的字符串值替换为对应的 CDN URL
 */

/**
 * 深度遍历对象，对所有字符串值检查是否在 urlMap 中，若是则替换
 */
function replaceInValue(value: unknown, urlMap: Map<string, string>): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const source = record.source;
    const rawFilePath = typeof record.file_path === 'string' ? record.file_path : undefined;
    const cdnUrl = rawFilePath ? urlMap.get(rawFilePath) : undefined;

    if (source === 'file' && cdnUrl) {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(record)) {
        if (key === 'source') {
          result[key] = 'url';
          continue;
        }
        if (key === 'file_path') {
          continue;
        }
        result[key] = replaceInValue(val, urlMap);
      }
      result.url = cdnUrl;
      return result;
    }
  }

  if (typeof value === 'string') {
    // 直接文件名匹配（如 "photo.jpg"）
    const cdnUrl = urlMap.get(value);
    return cdnUrl ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceInValue(item, urlMap));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = replaceInValue(val, urlMap);
    }
    return result;
  }

  return value;
}

/**
 * 对整个 contentMap 执行 URL 替换，返回替换后的新 Map
 * 原 contentMap 不被修改（返回深拷贝后的替换版本）
 */
export function replaceContentUrls(
  contentMap: Map<string, Record<string, unknown>>,
  urlMap: Map<string, string>,
): Map<string, Record<string, unknown>> {
  const result = new Map<string, Record<string, unknown>>();

  for (const [id, content] of contentMap) {
    result.set(id, replaceInValue(content, urlMap) as Record<string, unknown>);
  }

  return result;
}

/**
 * 替换 cover.html 中的资源路径引用
 * 将 "cardcover/xxx.jpg" 等相对路径替换为 CDN URL
 */
export function replaceCoverHtmlUrls(coverHtml: string, urlMap: Map<string, string>): string {
  let result = coverHtml;

  for (const [filename, cdnUrl] of urlMap) {
    // 替换各种可能的相对路径引用
    result = result.replaceAll(`src="${filename}"`, `src="${cdnUrl}"`);
    result = result.replaceAll(`href="${filename}"`, `href="${cdnUrl}"`);
    result = result.replaceAll(`url('${filename}')`, `url('${cdnUrl}')`);
    result = result.replaceAll(`url("${filename}")`, `url("${cdnUrl}")`);

    // cardcover/ 相对路径
    result = result.replaceAll(`src="cardcover/${filename}"`, `src="${cdnUrl}"`);
    result = result.replaceAll(`href="cardcover/${filename}"`, `href="${cdnUrl}"`);
  }

  return result;
}
