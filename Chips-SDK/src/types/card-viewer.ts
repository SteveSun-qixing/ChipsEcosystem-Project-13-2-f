export type CardViewerDocumentKind = "card" | "box";

export type CardViewerSource =
  | {
      kind: "local-file";
      documentKind: CardViewerDocumentKind;
      filePath: string;
    }
  | {
      kind: "community-card";
      cardId: string;
      title: string;
      createdAt?: string;
      documentUrl: string;
      canonicalUrl?: string;
    }
  | {
      kind: "community-box";
      boxId: string;
      title: string;
      createdAt?: string;
      documentUrl: string;
      canonicalUrl?: string;
    }
  | {
      kind: "remote-card-file";
      url: string;
      title?: string;
      createdAt?: string;
    };
