export type CardViewerDocumentKind = "card" | "box";

export interface CardViewerCoverSourceFields {
  coverUrl?: string;
  coverFragmentUrl?: string;
  coverRenderMode?: "fragment-shadow" | "iframe";
  coverRatio?: string;
}

export type CardViewerSource =
  | {
      kind: "local-file";
      documentKind: CardViewerDocumentKind;
      filePath: string;
    }
  | ({
      kind: "community-card";
      cardId: string;
      title: string;
      createdAt?: string;
      documentUrl: string;
      canonicalUrl?: string;
    } & CardViewerCoverSourceFields)
  | ({
      kind: "community-box";
      boxId: string;
      title: string;
      createdAt?: string;
      documentUrl: string;
      canonicalUrl?: string;
    } & CardViewerCoverSourceFields)
  | {
      kind: "remote-card-file";
      url: string;
      title?: string;
      createdAt?: string;
    };
