import { publishCommunityCard } from "./publisher";
import type { CommunityCardPublishContext, CommunityCardPublishRequest, CommunityCardPublishResult } from "./types";

export type { CommunityCardPublishRequest, CommunityCardPublishResult } from "./types";

const moduleDefinition = {
  providers: [
    {
      capability: "community.card.publish",
      methods: {
        async publish(
          ctx: CommunityCardPublishContext,
          input: CommunityCardPublishRequest,
        ): Promise<CommunityCardPublishResult> {
          return publishCommunityCard(ctx, input);
        },
      },
    },
  ],
};

export default moduleDefinition;
