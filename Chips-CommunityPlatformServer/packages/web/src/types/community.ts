export type CommunityWorkType = 'card' | 'box';

export interface CommunityWorkItem {
  id: string;
  type: CommunityWorkType;
  title: string;
  coverUrl: string | null;
  coverRatio: string | null;
  href: string;
  createdAt: string;
}

export function getCommunityWorkSelectionKey(item: Pick<CommunityWorkItem, 'type' | 'id'>): string {
  return `${item.type}:${item.id}`;
}

export type UploadQueueStatus = 'queued' | 'uploading' | 'processing' | 'success' | 'error';

export interface UploadQueueItem {
  localId: string;
  file: File;
  type: CommunityWorkType;
  status: UploadQueueStatus;
  progress: number;
  remoteId?: string;
  resultHref?: string;
  errorMessage?: string;
  detailMessage?: string;
}
