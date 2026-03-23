import { convertCardToHtml } from "./exporter";
import type { CardToHtmlContext, CardToHtmlRequest, CardToHtmlResult } from "./types";

export type { CardToHtmlRequest, CardToHtmlResult } from "./types";

const moduleDefinition = {
  providers: [
    {
      capability: "converter.card.to-html",
      methods: {
        async convert(ctx: CardToHtmlContext, input: CardToHtmlRequest): Promise<CardToHtmlResult> {
          return convertCardToHtml(ctx, input);
        },
      },
    },
  ],
};

export default moduleDefinition;
