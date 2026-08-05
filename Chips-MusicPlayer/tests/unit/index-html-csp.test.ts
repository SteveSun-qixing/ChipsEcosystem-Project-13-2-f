import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readIndexHtml(): string {
  return readFileSync(resolve(__dirname, "../../index.html"), "utf-8");
}

function readCspDirectives(html: string): Map<string, string[]> {
  const match = html.match(/Content-Security-Policy"\s+content="([^"]+)"/s);
  if (!match) {
    throw new Error("Content-Security-Policy meta tag is missing.");
  }

  return new Map(
    match[1]
      .split(";")
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...sources] = directive.split(/\s+/);
        return [name, sources] as const;
      }),
  );
}

describe("音乐播放器入口 CSP", () => {
  it("允许 Web 社区渲染缓存中的 HTTP 音频和封面资源", () => {
    const directives = readCspDirectives(readIndexHtml());

    expect(directives.get("media-src")).toEqual(expect.arrayContaining(["http:", "https:", "blob:"]));
    expect(directives.get("img-src")).toEqual(expect.arrayContaining(["http:", "https:", "blob:"]));
    expect(directives.get("connect-src")).toEqual(expect.arrayContaining(["http:", "https:"]));
  });
});
