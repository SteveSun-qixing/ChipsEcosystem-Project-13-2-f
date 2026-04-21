import type { BookSourceDescriptor } from "../../utils/book-reader";
import type { EpubArchive } from "./archive";

export interface EpubMetadata {
  title: string;
  creator?: string;
  language?: string;
  identifier?: string;
  publisher?: string;
  description?: string;
}

export interface EpubManifestItem {
  id: string;
  href: string;
  path: string;
  mediaType: string;
  properties: string[];
}

export interface EpubSection {
  id: string;
  href: string;
  path: string;
  title: string;
  linear: boolean;
}

export interface EpubNavigationItem {
  id: string;
  label: string;
  href: string;
  path: string;
  fragment?: string;
  sectionIndex?: number;
  children: EpubNavigationItem[];
}

export interface EpubLink {
  id: string;
  href: string;
  path: string;
  title?: string;
  mediaType?: string;
  rels: string[];
  properties: string[];
  fragment?: string;
  children: EpubLink[];
}

export interface EpubPublication {
  readingOrder: EpubLink[];
  resources: EpubLink[];
  toc: EpubLink[];
  cover?: EpubLink;
  nav?: EpubLink;
  linksByPath: Map<string, EpubLink>;
}

export interface EpubBook {
  source: BookSourceDescriptor;
  metadata: EpubMetadata;
  archive: EpubArchive;
  publication: EpubPublication;
  packagePath: string;
  manifest: Map<string, EpubManifestItem>;
  manifestByPath: Map<string, EpubManifestItem>;
  sections: EpubSection[];
  navigation: EpubNavigationItem[];
  coverPath?: string;
  coverMediaType?: string;
  coverImageUri?: string;
}

export interface EpubThemePalette {
  surface: string;
  text: string;
  mutedText: string;
  primary: string;
  border: string;
  accentSurface: string;
}

export interface RenderedSectionDocument {
  title: string;
  sectionPath: string;
  html: string;
}
