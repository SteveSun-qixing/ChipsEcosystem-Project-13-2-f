import { convertHtmlToImage } from "./exporter";
import type { HtmlToImageContext, HtmlToImageRequest, HtmlToImageResult } from "./types";

export type { HtmlToImageRequest, HtmlToImageResult } from "./types";

const moduleDefinition = {
  providers: [
    {
      capability: "converter.html.to-image",
      methods: {
        async convert(ctx: HtmlToImageContext, input: HtmlToImageRequest): Promise<HtmlToImageResult> {
          return convertHtmlToImage(ctx, input);
        },
      },
    },
  ],
};

export default moduleDefinition;
