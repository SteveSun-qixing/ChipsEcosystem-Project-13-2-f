import {
  downloadCommunityCard,
  openRemoteCommunityCard,
  uploadCommunityCard,
} from "./publisher";
import type {
  CommunityCardPublishContext,
  CommunityCardTransferDownloadRequest,
  CommunityCardTransferDownloadResult,
  CommunityCardTransferOpenRemoteRequest,
  CommunityCardTransferOpenRemoteResult,
  CommunityCardTransferUploadRequest,
  CommunityCardTransferUploadResult,
} from "./types";

export type {
  CommunityCardTransferDownloadRequest,
  CommunityCardTransferDownloadResult,
  CommunityCardTransferOpenRemoteRequest,
  CommunityCardTransferOpenRemoteResult,
  CommunityCardTransferUploadRequest,
  CommunityCardTransferUploadResult,
} from "./types";

const moduleDefinition = {
  providers: [
    {
      capability: "community.card.transfer",
      methods: {
        async upload(
          ctx: CommunityCardPublishContext,
          input: CommunityCardTransferUploadRequest,
        ): Promise<CommunityCardTransferUploadResult> {
          return uploadCommunityCard(ctx, input);
        },
        async download(
          ctx: CommunityCardPublishContext,
          input: CommunityCardTransferDownloadRequest,
        ): Promise<CommunityCardTransferDownloadResult> {
          return downloadCommunityCard(ctx, input);
        },
        async openRemote(
          ctx: CommunityCardPublishContext,
          input: CommunityCardTransferOpenRemoteRequest,
        ): Promise<CommunityCardTransferOpenRemoteResult> {
          return openRemoteCommunityCard(ctx, input);
        },
      },
    },
  ],
};

export default moduleDefinition;
