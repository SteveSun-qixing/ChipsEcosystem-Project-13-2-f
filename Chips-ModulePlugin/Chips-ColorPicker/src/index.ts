import { pickImageColors } from "./picker";
import type { ColorPickRequest, ColorPickResult } from "./types";

export type { ColorPickRequest, ColorPickResult } from "./types";

const moduleDefinition = {
  providers: [
    {
      capability: "image.color.pick",
      methods: {
        async pick(ctx: unknown, input: ColorPickRequest): Promise<ColorPickResult> {
          return pickImageColors(ctx as Parameters<typeof pickImageColors>[0], input);
        },
      },
    },
  ],
};

export default moduleDefinition;
