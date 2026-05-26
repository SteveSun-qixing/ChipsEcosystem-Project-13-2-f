declare module "micromark-extension-mark" {
  import type { Extension } from "micromark-util-types";

  export function pandocMark(options?: Record<string, unknown>): Extension;
}

declare module "micromark-extension-mark/index.js" {
  export { pandocMark } from "micromark-extension-mark";
}
