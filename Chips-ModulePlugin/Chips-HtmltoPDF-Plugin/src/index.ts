import { convertHtmlToPdf } from "./exporter";
import type { HtmlToPdfContext, HtmlToPdfRequest, HtmlToPdfResult } from "./types";

export type { HtmlToPdfRequest, HtmlToPdfResult } from "./types";

const moduleDefinition = {
  providers: [
    {
      capability: "converter.html.to-pdf",
      methods: {
        async convert(ctx: HtmlToPdfContext, input: HtmlToPdfRequest): Promise<HtmlToPdfResult> {
          return convertHtmlToPdf(ctx, input);
        },
      },
    },
  ],
};

export default moduleDefinition;
