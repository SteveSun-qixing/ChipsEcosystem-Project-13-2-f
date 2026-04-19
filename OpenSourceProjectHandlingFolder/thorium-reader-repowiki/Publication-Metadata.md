# Publication Metadata

> **Relevant source files**
> * [src/common/models/dialog.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts)

## Purpose and Scope

This document describes how publication metadata is displayed in Thorium Reader through publication info dialogs, publication cards, and accessibility information presentation. The system provides three different dialog types for displaying publication metadata depending on context: OPDS feeds, library view, and reader view. Each context has different metadata requirements and display capabilities.

For information about how publications are imported and metadata is extracted, see [Publication Management](/edrlab/thorium-reader/3.2-publication-management).

## Publication Info Dialog Types

Thorium Reader defines three distinct publication info dialog types in the `DialogType` interface, each tailored for specific contexts and use cases.

### Dialog Type Hierarchy

```mermaid
flowchart TD

DIALOG_BASE["DialogType"]
PUB_OPDS["PublicationInfoOpds"]
PUB_LIB["PublicationInfoLib"]
PUB_READER["PublicationInfoReader"]
IPUB_STATE["IPubInfoState"]
PUB_FIELD["publication?: TPublication"]
COVER_FIELD["coverZoom?: boolean"]
IPUB_READER["IPubInfoStateReader"]
FOCUS_FIELD["focusWhereAmI: boolean"]
PDF_PAGES["pdfPlayerNumberOfPages"]
DIVINA_PAGES["divinaNumberOfPages"]
READING_LOC["readerReadingLocation"]
LINK_HANDLER["handleLinkUrl"]

DIALOG_BASE --> PUB_OPDS
DIALOG_BASE --> PUB_LIB
DIALOG_BASE --> PUB_READER
PUB_OPDS --> IPUB_STATE
PUB_LIB --> IPUB_STATE
PUB_READER --> IPUB_READER
IPUB_READER --> IPUB_STATE

subgraph subGraph3 ["Extended Reader State"]
    IPUB_READER
    FOCUS_FIELD
    PDF_PAGES
    DIVINA_PAGES
    READING_LOC
    LINK_HANDLER
    IPUB_READER --> FOCUS_FIELD
    IPUB_READER --> PDF_PAGES
    IPUB_READER --> DIVINA_PAGES
    IPUB_READER --> READING_LOC
    IPUB_READER --> LINK_HANDLER
end

subgraph subGraph2 ["Base State"]
    IPUB_STATE
    PUB_FIELD
    COVER_FIELD
    IPUB_STATE --> PUB_FIELD
    IPUB_STATE --> COVER_FIELD
end

subgraph subGraph1 ["Publication Info Dialogs"]
    PUB_OPDS
    PUB_LIB
    PUB_READER
end

subgraph subGraph0 ["DialogType Interface"]
    DIALOG_BASE
end
```

Sources: [src/common/models/dialog.ts L15-L26](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts#L15-L26)

 [src/common/models/dialog.ts L51-L84](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts#L51-L84)

### Core Metadata Display Fields

The following table shows the metadata fields displayed in publication info dialogs:

| Metadata Field | Display Context | Description |
| --- | --- | --- |
| `publication` | All dialogs | Core publication object containing metadata |
| `coverZoom` | All dialogs | Whether cover image is displayed in zoom mode |
| `focusWhereAmI` | Reader only | Focus accessibility feature for location |
| `pdfPlayerNumberOfPages` | Reader only | Total pages for PDF publications |
| `divinaNumberOfPages` | Reader only | Total pages for visual narratives |
| `readerReadingLocation` | Reader only | Current reading position as `MiniLocatorExtended` |
| `handleLinkUrl` | Reader only | Function to handle URL navigation from metadata |

## Dialog Context and State Management

Each publication info dialog type serves a specific context within the application, with different state requirements and capabilities.

### Dialog Context Flow

```mermaid
flowchart TD

OPDS_FEED["OPDS Feed Browser"]
OPDS_PUB["OPDS Publication"]
OPDS_DIALOG["PublicationInfoOpds Dialog"]
LIB_CATALOG["Library Catalog"]
LIB_PUB["Local Publication"]
LIB_DIALOG["PublicationInfoLib Dialog"]
READER_UI["Reader Interface"]
ACTIVE_PUB["Active Publication"]
READER_DIALOG["PublicationInfoReader Dialog"]
IPUB_STATE["IPubInfoState"]
IPUB_READER_STATE["IPubInfoStateReader"]

OPDS_DIALOG --> IPUB_STATE
LIB_DIALOG --> IPUB_STATE
READER_DIALOG --> IPUB_READER_STATE

subgraph subGraph3 ["Dialog State"]
    IPUB_STATE
    IPUB_READER_STATE
    IPUB_READER_STATE --> IPUB_STATE
end

subgraph subGraph2 ["Reader Context"]
    READER_UI
    ACTIVE_PUB
    READER_DIALOG
    READER_UI --> ACTIVE_PUB
    ACTIVE_PUB --> READER_DIALOG
end

subgraph subGraph1 ["Library Context"]
    LIB_CATALOG
    LIB_PUB
    LIB_DIALOG
    LIB_CATALOG --> LIB_PUB
    LIB_PUB --> LIB_DIALOG
end

subgraph subGraph0 ["OPDS Context"]
    OPDS_FEED
    OPDS_PUB
    OPDS_DIALOG
    OPDS_FEED --> OPDS_PUB
    OPDS_PUB --> OPDS_DIALOG
end
```

Sources: [src/common/models/dialog.ts L33-L49](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts#L33-L49)

 [src/common/models/dialog.ts L57-L59](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts#L57-L59)

### Reader-Specific Metadata Features

The `PublicationInfoReader` dialog includes additional contextual information not available in library or OPDS contexts:

* **Reading Progress**: Current location via `readerReadingLocation` as `MiniLocatorExtended`
* **Format-Specific Pages**: Separate page counts for PDF (`pdfPlayerNumberOfPages`) and Divina (`divinaNumberOfPages`) publications
* **Accessibility Navigation**: `focusWhereAmI` boolean for screen reader navigation
* **Link Handling**: `handleLinkUrl` function for processing URLs within publication metadata
* **Continuous Reading**: `divinaContinousEqualTrue` flag for visual narrative reading mode

## Publication Cards vs Detailed Dialogs

Publication metadata is displayed at different levels of detail depending on the UI context. Publication cards show summary information while dialogs provide comprehensive metadata.

### Metadata Display Hierarchy

```mermaid
flowchart TD

TPUB["TPublication"]
OPDS_VIEW["IOpdsPublicationView"]
PUB_VIEW["PublicationView"]
CARD["Publication Card"]
INFO_DIALOG["Publication Info Dialog"]
ACCESSIBILITY_PANEL["Accessibility Panel"]
BASIC["Title, Author, Cover"]
EXTENDED["Description, Publisher, Languages"]
A11Y["Accessibility Metadata"]
CONTEXT["Context-Specific Fields"]

TPUB --> CARD
TPUB --> INFO_DIALOG
OPDS_VIEW --> CARD
OPDS_VIEW --> INFO_DIALOG
PUB_VIEW --> INFO_DIALOG
CARD --> BASIC
INFO_DIALOG --> BASIC
INFO_DIALOG --> EXTENDED
INFO_DIALOG --> A11Y
INFO_DIALOG --> CONTEXT
ACCESSIBILITY_PANEL --> A11Y

subgraph subGraph2 ["Metadata Fields"]
    BASIC
    EXTENDED
    A11Y
    CONTEXT
end

subgraph subGraph1 ["Display Components"]
    CARD
    INFO_DIALOG
    ACCESSIBILITY_PANEL
end

subgraph subGraph0 ["Publication Metadata Sources"]
    TPUB
    OPDS_VIEW
    PUB_VIEW
end
```

Sources: [src/common/models/dialog.ts L15-L26](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts#L15-L26)

 [src/common/views/opds.ts L29-L74](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/views/opds.ts#L29-L74)

### Card Display vs Dialog Display

| Component | Fields Shown | Purpose |
| --- | --- | --- |
| Publication Card | Title, author, cover thumbnail | Quick identification in catalog view |
| Publication Info Dialog | Full metadata, description, accessibility | Detailed information before opening |
| Reader Info Dialog | All metadata + reading context | In-reading reference and navigation |

### OPDS vs Library Publication Display

OPDS publications and library publications have different metadata structures that affect how information is displayed in dialogs:

```mermaid
flowchart TD

OPDS_TITLE["documentTitle"]
OPDS_AUTHORS["authorsLangString[]"]
OPDS_DESC["description"]
OPDS_COVER["cover.thumbnailUrl"]
OPDS_A11Y["a11y_accessMode"]
LIB_TITLE["title"]
LIB_AUTHORS["authors[]"]
LIB_DESC["description"]
LIB_COVER["cover.coverUrl"]
LIB_DURATION["duration"]
DIALOG_TITLE["Title Field"]
DIALOG_AUTHORS["Authors List"]
DIALOG_DESC["Description Text"]
DIALOG_COVER["Cover Image"]
DIALOG_META["Additional Metadata"]

OPDS_TITLE --> DIALOG_TITLE
LIB_TITLE --> DIALOG_TITLE
OPDS_AUTHORS --> DIALOG_AUTHORS
LIB_AUTHORS --> DIALOG_AUTHORS
OPDS_DESC --> DIALOG_DESC
LIB_DESC --> DIALOG_DESC
OPDS_COVER --> DIALOG_COVER
LIB_COVER --> DIALOG_COVER
OPDS_A11Y --> DIALOG_META
LIB_DURATION --> DIALOG_META

subgraph subGraph2 ["Unified Dialog Display"]
    DIALOG_TITLE
    DIALOG_AUTHORS
    DIALOG_DESC
    DIALOG_COVER
    DIALOG_META
end

subgraph subGraph1 ["Library Publication Metadata"]
    LIB_TITLE
    LIB_AUTHORS
    LIB_DESC
    LIB_COVER
    LIB_DURATION
end

subgraph subGraph0 ["OPDS Publication Metadata"]
    OPDS_TITLE
    OPDS_AUTHORS
    OPDS_DESC
    OPDS_COVER
    OPDS_A11Y
end
```

Sources: [src/common/views/opds.ts L29-L74](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/views/opds.ts#L29-L74)

 [src/common/models/dialog.ts L57-L59](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts#L57-L59)

## File Import Dialog Integration

Publication metadata is also displayed during file import processes, where users can preview publication information before adding files to their library.

### File Import Dialog Structure

```mermaid
flowchart TD

FILES["IFileImport[]"]
IMPORT_DIALOG["FileImport Dialog"]
PREVIEW["Publication Preview"]
FILE_NAME["name: string"]
FILE_PATH["path: string"]
METADATA_EXTRACT["Metadata Extraction"]
TITLE_PREVIEW["Title Preview"]
AUTHOR_PREVIEW["Author Preview"]
COVER_PREVIEW["Cover Preview"]
FORMAT_INFO["Format Information"]

FILES --> FILE_NAME
FILES --> FILE_PATH
METADATA_EXTRACT --> TITLE_PREVIEW
METADATA_EXTRACT --> AUTHOR_PREVIEW
METADATA_EXTRACT --> COVER_PREVIEW
METADATA_EXTRACT --> FORMAT_INFO

subgraph subGraph2 ["Preview Display"]
    TITLE_PREVIEW
    AUTHOR_PREVIEW
    COVER_PREVIEW
    FORMAT_INFO
end

subgraph subGraph1 ["Import File Structure"]
    FILE_NAME
    FILE_PATH
    METADATA_EXTRACT
    FILE_PATH --> METADATA_EXTRACT
end

subgraph subGraph0 ["File Import Process"]
    FILES
    IMPORT_DIALOG
    PREVIEW
    FILES --> IMPORT_DIALOG
    IMPORT_DIALOG --> PREVIEW
end
```

Sources: [src/common/models/dialog.ts L28-L31](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts#L28-L31)

 [src/common/models/dialog.ts L54-L56](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts#L54-L56)

## Accessibility Metadata Display

Thorium Reader provides comprehensive accessibility metadata display in publication info dialogs, supporting both modern and legacy accessibility metadata structures.

### Accessibility Fields in OPDS Publications

The accessibility metadata fields are prefixed with `a11y_` in the `IOpdsPublicationView` interface:

| Field | Description | Display Context |
| --- | --- | --- |
| `a11y_accessMode` | Primary content perception modes | All dialog types |
| `a11y_accessibilityFeature` | Accessibility enhancement features | All dialog types |
| `a11y_accessibilityHazard` | Potential accessibility hazards | All dialog types |
| `a11y_accessModeSufficient` | Sufficient access mode combinations | All dialog types |
| `a11y_accessibilitySummary` | Human-readable accessibility description | All dialog types |
| `a11y_certifiedBy` | Certification organization | OPDS dialogs only |
| `a11y_certifierCredential` | Certifier credentials | OPDS dialogs only |
| `a11y_certifierReport` | Link to certification report | OPDS dialogs only |
| `a11y_conformsTo` | Standards compliance statement | OPDS dialogs only |

### Reader-Specific Accessibility Features

The `PublicationInfoReader` dialog includes additional accessibility context through the `focusWhereAmI` field, which enables screen reader users to quickly understand their current location within the publication structure.

```mermaid
flowchart TD

READER_STATE["IPubInfoStateReader"]
FOCUS_WHERE["focusWhereAmI: boolean"]
READING_LOC["readerReadingLocation"]
MINI_LOCATOR["MiniLocatorExtended"]
SCREEN_READER["Screen Reader Support"]
POSITION_ANNOUNCE["Position Announcement"]
CONTEXT_INFO["Contextual Information"]

FOCUS_WHERE --> SCREEN_READER
MINI_LOCATOR --> POSITION_ANNOUNCE

subgraph subGraph1 ["Accessibility Navigation"]
    SCREEN_READER
    POSITION_ANNOUNCE
    CONTEXT_INFO
    SCREEN_READER --> CONTEXT_INFO
    POSITION_ANNOUNCE --> CONTEXT_INFO
end

subgraph subGraph0 ["Reader Accessibility Context"]
    READER_STATE
    FOCUS_WHERE
    READING_LOC
    MINI_LOCATOR
    READER_STATE --> FOCUS_WHERE
    READER_STATE --> READING_LOC
    READING_LOC --> MINI_LOCATOR
end
```

Sources: [src/common/models/dialog.ts L19-L26](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/dialog.ts#L19-L26)

 [src/common/views/opds.ts L63-L74](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/views/opds.ts#L63-L74)

## Metadata Integration with User Interface

Metadata is displayed in various parts of the Thorium Reader interface:

```mermaid
flowchart TD

MD["Publication Metadata"]
Library["Library Catalog View"]
PubInfo["Publication Info Dialog"]
Reader["Reader View"]
Search["Search Interface"]
CatalogGrid["CatalogGridView"]
InfoPanel["Publication Details Panel"]
ReaderHeader["Reader Header"]
Results["Search Results"]

MD --> Library
MD --> PubInfo
MD --> Reader
MD --> Search
Library --> CatalogGrid
PubInfo --> InfoPanel
Reader --> ReaderHeader
Search --> Results

subgraph subGraph1 ["User Interface Components"]
    Library
    PubInfo
    Reader
    Search
end

subgraph subGraph0 ["Metadata Sources"]
    MD
end
```

Sources:
[src/renderer/library/components/catalog/Catalog.tsx L63-L77](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/catalog/Catalog.tsx#L63-L77)

[src/renderer/library/components/opds/Browser.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/opds/Browser.tsx)

## Conclusion

Publication metadata is a core component of Thorium Reader, powering much of the user experience. The metadata is extracted during publication import, converted to standardized internal formats, and used for display, search, and accessibility features. The flexible metadata handling allows Thorium to work with both EPUB publications and OPDS catalogs while maintaining a consistent user experience.