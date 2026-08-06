import {
  downloadCommunityCard,
  openRemoteCommunityBox,
  openRemoteCommunityCard,
  uploadCommunityBox,
  uploadCommunityCard,
} from "./publisher";
import type {
  CommunityCardPublishContext,
  CommunityCardTransferBoxUploadRequest,
  CommunityCardTransferBoxUploadResult,
  CommunityCardTransferDownloadRequest,
  CommunityCardTransferDownloadResult,
  CommunityCardTransferOpenRemoteRequest,
  CommunityCardTransferOpenRemoteResult,
  CommunityCardTransferOpenRemoteBoxRequest,
  CommunityCardTransferOpenRemoteBoxResult,
  CommunityCardTransferUploadRequest,
  CommunityCardTransferUploadResult,
} from "./types";

export type {
  CommunityCardTransferBoxUploadRequest,
  CommunityCardTransferBoxUploadResult,
  CommunityCardTransferDownloadRequest,
  CommunityCardTransferDownloadResult,
  CommunityCardTransferOpenRemoteRequest,
  CommunityCardTransferOpenRemoteResult,
  CommunityCardTransferOpenRemoteBoxRequest,
  CommunityCardTransferOpenRemoteBoxResult,
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
        async openRemoteBox(
          ctx: CommunityCardPublishContext,
          input: CommunityCardTransferOpenRemoteBoxRequest,
        ): Promise<CommunityCardTransferOpenRemoteBoxResult> {
          return openRemoteCommunityBox(ctx, input);
        },
        async uploadBox(
          ctx: CommunityCardPublishContext,
          input: CommunityCardTransferBoxUploadRequest,
        ): Promise<CommunityCardTransferBoxUploadResult> {
          return uploadCommunityBox(ctx, input);
        },
      },
    },
  ],
};

export default moduleDefinition;
