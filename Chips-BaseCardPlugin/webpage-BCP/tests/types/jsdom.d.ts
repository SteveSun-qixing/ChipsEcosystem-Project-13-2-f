declare module "jsdom" {
  export class JSDOM {
    constructor(
      html?: string,
      options?: {
        runScripts?: "dangerously" | "outside-only";
        resources?: "usable";
        url?: string;
        pretendToBeVisual?: boolean;
      },
    );

    window: Window & typeof globalThis;
  }
}
