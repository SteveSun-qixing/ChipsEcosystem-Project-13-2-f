import { generateIcons } from "./generator";
import type { IconGenerateRequest, IconGenerateResult, IconMakerContext } from "./types";

export type { IconGenerateRequest, IconGenerateResult } from "./types";

const moduleDefinition = {
  providers: [
    {
      capability: "iconmaker.icon.generate",
      methods: {
        async generate(ctx: IconMakerContext, input: IconGenerateRequest): Promise<IconGenerateResult> {
          return generateIcons(ctx, input);
        },
      },
    },
  ],
};

export default moduleDefinition;
