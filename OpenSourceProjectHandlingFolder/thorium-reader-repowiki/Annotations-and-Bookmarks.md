# Annotations and Bookmarks

> **Relevant source files**
> * [src/common/redux/states/bookmark.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/bookmark.ts)
> * [src/common/rgb.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/rgb.ts)
> * [src/renderer/assets/styles/components/bookmarks.scss](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/assets/styles/components/bookmarks.scss)
> * [src/renderer/assets/styles/components/bookmarks.scss.d.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/assets/styles/components/bookmarks.scss.d.ts)
> * [src/renderer/reader/components/AnnotationEdit.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx)
> * [src/renderer/reader/components/BookmarkEdit.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/BookmarkEdit.tsx)
> * [src/renderer/reader/components/header/BookmarkButton.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx)
> * [src/renderer/reader/index_reader.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/index_reader.ts)

This document covers the annotation and bookmark system in Thorium Reader, which allows users to highlight text, add notes, and create bookmarks while reading publications. The system supports multiple publication formats (EPUB, PDF, audiobooks) and provides a unified interface for managing user-generated content with features like color coding, tagging, and text comments.

For information about the reader interface components that display these annotations and bookmarks, see [Reader UI Components](/edrlab/thorium-reader/2.1-reader-ui-components).

## System Overview

The annotations and bookmarks system consists of two primary user-facing features that share common underlying infrastructure:

* **Annotations**: Text highlights with optional comments, supporting multiple draw types (solid background, underline, strikethrough, outline)
* **Bookmarks**: Location markers with optional names, colors, and tags

Both features use the same data model (`INoteState`) with different `group` values to distinguish between annotations and bookmarks.

```mermaid
flowchart TD

AB["AnnotationEdit"]
AE["Annotation Editor UI"]
BB["BookmarkButton"]
BE["BookmarkEdit"]
BF["Bookmark Editor UI"]
RS["Redux State"]
NS["note: INoteState[]"]
NTI["noteTagsIndex"]
RC["reader.config"]
AN["group: 'annotation'"]
BM["group: 'bookmark'"]
LE["MiniLocatorExtended"]
LC["locator position"]
CO["IColor"]
RGB["red/green/blue values"]
RA["readerActions"]
NAU["note.addUpdate"]
NR["note.remove"]
SA["Store"]
PS["Persistent Storage"]

NS --> AN
NS --> BM
AB --> RS
BB --> RS
RS --> RA

subgraph Persistence ["Persistence"]
    RA
    NAU
    NR
    SA
    PS
    RA --> NAU
    RA --> NR
    SA --> PS
    RA --> SA
end

subgraph subGraph2 ["Core Data"]
    AN
    BM
    LE
    LC
    CO
    RGB
    LE --> LC
    CO --> RGB
    LE --> AN
    LE --> BM
    CO --> AN
    CO --> BM
end

subgraph subGraph1 ["State Management"]
    RS
    NS
    NTI
    RC
    RS --> NS
    RS --> NTI
    RS --> RC
end

subgraph subGraph0 ["User Interface"]
    AB
    AE
    BB
    BE
    BF
    AB --> AE
    BB --> BE
    BE --> BF
end
```

Sources: [src/renderer/reader/components/AnnotationEdit.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx)

 [src/renderer/reader/components/header/BookmarkButton.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx)

 [src/renderer/reader/components/BookmarkEdit.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/BookmarkEdit.tsx)

 [src/common/redux/states/bookmark.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/bookmark.ts)

## Annotation System

### AnnotationEdit Component

The `AnnotationEdit` component provides a comprehensive interface for creating and editing text annotations. It supports multiple highlighting styles, color selection, and text comments.

| Feature | Implementation | Location |
| --- | --- | --- |
| Draw Types | `noteDrawType` array with 4 styles | [src/renderer/reader/components/AnnotationEdit.tsx L182-L203](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx#L182-L203) |
| Color Picker | `noteColorCodeToColorTranslatorKeySet` mapping | [src/renderer/reader/components/AnnotationEdit.tsx L162-L177](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx#L162-L177) |
| Text Input | Auto-resizing textarea with markdown support | [src/renderer/reader/components/AnnotationEdit.tsx L143-L154](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx#L143-L154) |
| Tag System | ComboBox with existing tags | [src/renderer/reader/components/AnnotationEdit.tsx L208-L234](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx#L208-L234) |

```mermaid
flowchart TD

SP["save: (color, comment, drawType, tags)"]
CP["cancel: ()"]
CLR["color: IColor"]
DT["drawType: TDrawType"]
CMT["comment: string"]
TGS["tags: string[]"]
TA["textarea#uuid_edit"]
CP_UI["Color Picker Radio Group"]
DT_UI["Draw Type Radio Group"]
TAG_UI["ComboBox Tag Selector"]
CS["colorSelected: useState"]
DTS["drawTypeSelected: useState"]
TG["tag: useState"]
AL["annotationLength: useState"]
PM["@github/paste-markdown"]
RCS["rgbToHex/hexToRgb"]
TI["noteTagsIndex from Redux"]

SP --> CS
CLR --> CS
DT --> DTS
CMT --> TA
TGS --> TG
CS --> CP_UI
DTS --> DT_UI
TG --> TAG_UI
AL --> TA
PM --> TA
RCS --> CS
TI --> TAG_UI

subgraph subGraph3 ["External Dependencies"]
    PM
    RCS
    TI
end

subgraph subGraph2 ["State Hooks"]
    CS
    DTS
    TG
    AL
end

subgraph subGraph1 ["UI Elements"]
    TA
    CP_UI
    DT_UI
    TAG_UI
end

subgraph subGraph0 ["AnnotationEdit Props"]
    SP
    CP
    CLR
    DT
    CMT
    TGS
end
```

Sources: [src/renderer/reader/components/AnnotationEdit.tsx L49-L283](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx#L49-L283)

 [src/common/rgb.ts L10-L28](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/rgb.ts#L10-L28)

### Draw Types and Colors

The annotation system supports four distinct visual styles:

```javascript
// Draw types defined in noteDrawTypeconst drawTypes = [    "solid_background",  // Highlight    "underline",        // Underline      "strikethrough",    // Strikethrough    "outline"           // Outline];
```

Colors are managed through a predefined palette in `noteColorCodeToColorTranslatorKeySet`, with conversion utilities handling the transformation between hex values and RGB objects.

Sources: [src/renderer/reader/components/AnnotationEdit.tsx L84-L89](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx#L84-L89)

 [src/common/redux/states/renderer/note.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/renderer/note.ts)

 [src/common/rgb.ts L10-L28](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/rgb.ts#L10-L28)

## Bookmark System

### BookmarkButton Component

The `BookmarkButton` component manages bookmark creation, deletion, and visibility detection. It adapts its behavior based on the publication type and current reading location.

```mermaid
flowchart TD

TB["toggleBookmark()"]
AB["addBookmark()"]
DB["deleteBookmark()"]
KS["Keyboard Shortcuts"]
CLICK["Button Click"]
LE["locatorExtended"]
VB["visibleBookmarks"]
BS["bookmarkSelected"]
BI["BookmarkIcon"]
ADD["EBookmarkIcon.ADD"]
DELETE["EBookmarkIcon.DELETE"]
NEUTRAL["EBookmarkIcon.NEUTRAL"]
PUB["r2Publication"]
EPUB["isEpubNavigator"]
PDF["isPdf"]
AUDIO["isAudiobook"]
LV["isLocatorVisible()"]
TIME["globalTime matching"]
HREF["href matching"]

EPUB --> VB
AUDIO --> VB
PDF --> VB
LV --> VB
TIME --> VB
HREF --> VB

subgraph subGraph1 ["Publication Type Handling"]
    PUB
    EPUB
    PDF
    AUDIO
    LV
    TIME
    HREF
    PUB --> EPUB
    PUB --> PDF
    PUB --> AUDIO
    EPUB --> LV
    AUDIO --> TIME
    PDF --> HREF
end

subgraph subGraph0 ["BookmarkButton Logic"]
    LE
    VB
    BS
    BI
    ADD
    DELETE
    NEUTRAL
    LE --> VB
    VB --> BS
    BS --> BI
    BI --> ADD
    BI --> DELETE
    BI --> NEUTRAL
    LE --> BS
end

subgraph Actions ["Actions"]
    TB
    AB
    DB
    KS
    CLICK
    TB --> AB
    TB --> DB
    KS --> TB
    CLICK --> TB
end
```

Sources: [src/renderer/reader/components/header/BookmarkButton.tsx L41-L134](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L41-L134)

 [src/renderer/reader/components/header/BookmarkButton.tsx L195-L261](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L195-L261)

### Visibility Detection

The system uses different strategies to determine bookmark visibility based on publication format:

| Format | Detection Method | Implementation |
| --- | --- | --- |
| EPUB | `isLocatorVisible()` API | [src/renderer/reader/components/header/BookmarkButton.tsx L332-L360](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L332-L360) |
| Audiobook | Time-based matching | [src/renderer/reader/components/header/BookmarkButton.tsx L122-L125](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L122-L125) |
| PDF/Divina | Simple href matching | [src/renderer/reader/components/header/BookmarkButton.tsx L127-L129](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L127-L129) |

### BookmarkEdit Component

The `BookmarkEdit` component provides a simpler interface compared to annotations, focusing on naming, color selection, and tagging.

```mermaid
flowchart TD

BLI["BookmarkLocatorInfo"]
TXT["Selected text display"]
TA["textarea"]
NAME["Bookmark name input"]
CP["Color Picker"]
COL["Color selection"]
CB["ComboBox"]
TAG["Tag selection"]
SAVE["Save Button"]
SC["save callback"]
CANCEL["Cancel Button"]
CC["cancel callback"]
HEX["hexToRgb conversion"]
TRIM["Text normalization"]
CONFIG["readerLocalActionSetConfig"]
DEFAULT["annotation_defaultColor"]

SC --> CONFIG
COL --> SC
TAG --> SC
NAME --> SC

subgraph Configuration ["Configuration"]
    CONFIG
    DEFAULT
    CONFIG --> DEFAULT
end

subgraph subGraph1 ["Form Actions"]
    SAVE
    SC
    CANCEL
    CC
    HEX
    TRIM
    SAVE --> SC
    CANCEL --> CC
    SC --> HEX
    SC --> TRIM
end

subgraph subGraph0 ["BookmarkEdit Interface"]
    BLI
    TXT
    TA
    NAME
    CP
    COL
    CB
    TAG
    BLI --> TXT
    TA --> NAME
    CP --> COL
    CB --> TAG
    BLI --> TA
    CP --> COL
    CB --> TAG
end
```

Sources: [src/renderer/reader/components/BookmarkEdit.tsx L54-L189](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/BookmarkEdit.tsx#L54-L189)

 [src/renderer/reader/components/BookmarkLocatorInfo.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/BookmarkLocatorInfo.tsx)

## Data Model

### INoteState Structure

Both annotations and bookmarks share the `INoteState` data structure:

```css
interface INoteState {    uuid: string;    textualValue?: string;        // Comment for annotations, name for bookmarks    created: number;              // Timestamp    modified?: number;           // Optional modification timestamp    index: number;               // Sequential index    locatorExtended: MiniLocatorExtended; // Position information    creator: INoteCreator;       // User information    color: IColor;              // RGB color object    drawType: TDrawType;        // Visual style    tags?: string[];            // Optional tags    group: "annotation" | "bookmark"; // Discriminator}
```

Sources: [src/common/redux/states/renderer/note.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/renderer/note.ts)

 [src/common/redux/states/bookmark.ts L15-L31](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/bookmark.ts#L15-L31)

### Locator System

Position information is stored in `MiniLocatorExtended` objects, which contain:

* `locator.href`: Resource identifier
* `locator.locations`: Position data including CSS selectors and ranges
* `selectionInfo`: Text selection details for annotations
* `audioPlaybackInfo`: Time-based position for audiobooks

Sources: [src/common/redux/states/locatorInitialState.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/locatorInitialState.ts)

 [src/renderer/reader/components/header/BookmarkButton.tsx L107-L134](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L107-L134)

## State Management Integration

### Redux Actions

The system uses centralized Redux actions for persistence:

| Action | Purpose | Implementation |
| --- | --- | --- |
| `readerActions.note.addUpdate.build()` | Create/update notes | [src/renderer/reader/components/header/BookmarkButton.tsx L190](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L190-L190) |
| `readerActions.note.remove.build()` | Delete notes | [src/renderer/reader/components/header/BookmarkButton.tsx L168](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L168-L168) |
| `readerLocalActionSetConfig.build()` | Save default colors | [src/renderer/reader/components/AnnotationEdit.tsx L113](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx#L113-L113) |

### Tag Indexing

The system maintains a `noteTagsIndex` in Redux state that tracks tag usage frequency:

```
interface TagIndex {    tag: string;    index: number;  // Usage count}
```

This index is built during reader initialization from all existing notes.

Sources: [src/renderer/reader/index_reader.ts L67-L86](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/index_reader.ts#L67-L86)

 [src/renderer/reader/components/AnnotationEdit.tsx L78-L79](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/AnnotationEdit.tsx#L78-L79)

## Keyboard Integration

Both systems support keyboard shortcuts through the global keyboard management system:

* `ToggleBookmark`: Quick bookmark toggle
* `AddBookmarkWithLabel`: Open bookmark editor

The shortcuts are registered using `registerKeyboardListener()` and automatically unregistered on component unmount.

Sources: [src/renderer/reader/components/header/BookmarkButton.tsx L274-L283](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L274-L283)

 [src/renderer/reader/components/header/BookmarkButton.tsx L298-L310](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/BookmarkButton.tsx#L298-L310)

## Styling System

The UI components use modular SCSS with CSS custom properties for theming:

* `bookmarks.scss`: Bookmark-specific styles
* `annotations.scss`: Annotation-specific styles
* `buttons.scss`: Shared button styles

Key styling patterns include responsive color pickers, auto-resizing textareas, and theme-aware color variables.

Sources: [src/renderer/assets/styles/components/bookmarks.scss](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/assets/styles/components/bookmarks.scss)

 [src/renderer/assets/styles/components/annotations.scss](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/assets/styles/components/annotations.scss)

 [src/renderer/assets/styles/components/buttons.scss](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/assets/styles/components/buttons.scss)