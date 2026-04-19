# Search Functionality

> **Relevant source files**
> * [src/renderer/reader/components/ReaderMenuSearch.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderMenuSearch.tsx)
> * [src/renderer/reader/components/picker/SearchFormPicker.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/picker/SearchFormPicker.tsx)
> * [src/renderer/reader/pdf/common/eventBus.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/pdf/common/eventBus.ts)
> * [src/renderer/reader/redux/sagas/highlight/handler.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/highlight/handler.ts)
> * [src/renderer/reader/redux/sagas/highlight/mounter.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/highlight/mounter.ts)
> * [src/renderer/reader/redux/sagas/search.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts)

This document covers the in-publication search system that allows users to search for text within EPUB and PDF documents. The search functionality includes text input, result highlighting, pagination, and navigation between search matches.

For information about library-level publication search and filtering, see [Publication Display](/edrlab/thorium-reader/3.1-publication-display).

## Architecture Overview

The search system follows a Redux-Saga pattern with separate handling for EPUB and PDF content types. Search results are integrated with the highlighting system to provide visual feedback.

```mermaid
flowchart TD

SFP["SearchFormPicker"]
RMS["ReaderMenuSearch"]
LS["LoaderSearch"]
SST["SearchState"]
RSA["readerLocalActionSearch"]
SS["search.ts saga"]
SF["search() function"]
RC["Resource Cache"]
HH["Highlight Handler"]
HM["Highlight Mounter"]
HR["Highlight Renderer"]
EB["EventBus"]
PDF["PDF.js Search"]

SFP --> RSA
RSA --> SS
SS --> RSA
SST --> RMS
SS --> HH
SFP --> EB

subgraph subGraph4 ["PDF Integration"]
    EB
    PDF
    EB --> PDF
end

subgraph subGraph3 ["Highlight Integration"]
    HH
    HM
    HR
    HH --> HM
    HM --> HR
end

subgraph subGraph2 ["Search Processing"]
    SS
    SF
    RC
    SS --> SF
    SF --> RC
end

subgraph subGraph1 ["Redux Layer"]
    SST
    RSA
    RSA --> SST
end

subgraph subGraph0 ["Search UI Components"]
    SFP
    RMS
    LS
end
```

**Sources:** [src/renderer/reader/components/picker/SearchFormPicker.tsx L167-L175](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/picker/SearchFormPicker.tsx#L167-L175)

 [src/renderer/reader/redux/sagas/search.ts L83-L101](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts#L83-L101)

 [src/renderer/reader/components/ReaderMenuSearch.tsx L524-L534](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderMenuSearch.tsx#L524-L534)

## Search Workflow

The search process involves multiple stages from user input to result highlighting and navigation.

```mermaid
sequenceDiagram
  participant User
  participant SearchFormPicker
  participant searchRequest
  participant search
  participant searchFound
  participant ReaderMenuSearch
  participant highlightHandler

  User->>SearchFormPicker: Enter search text
  SearchFormPicker->>searchRequest: readerLocalActionSearch.request
  searchRequest->>search: search(text, resourceCache)
  search-->>searchRequest: ISearchResult[]
  searchRequest->>searchFound: readerLocalActionSearch.found
  searchFound->>highlightHandler: push highlights
  searchFound->>ReaderMenuSearch: Update foundArray
  User->>ReaderMenuSearch: Click result
  ReaderMenuSearch->>highlightHandler: focus search result
```

**Sources:** [src/renderer/reader/redux/sagas/search.ts L83-L141](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts#L83-L141)

 [src/renderer/reader/components/ReaderMenuSearch.tsx L418-L448](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderMenuSearch.tsx#L418-L448)

## Search UI Components

### SearchFormPicker Component

The `SearchFormPicker` component provides the search input interface with keyboard shortcut support and loading states.

| Property | Type | Purpose |
| --- | --- | --- |
| `inputValue` | `string` | Current search text input |
| `isPdf` | `boolean` | Determines PDF vs EPUB search handling |
| `load` | `boolean` | Controls loading spinner display |

Key methods:

* `search()` - Handles form submission and dispatches search request
* `onKeyboardFocusSearch()` - Keyboard shortcut handler for search focus
* `focusoutSearch()` - Maintains focus on search input

**Sources:** [src/renderer/reader/components/picker/SearchFormPicker.tsx L50-L178](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/picker/SearchFormPicker.tsx#L50-L178)

### ReaderMenuSearch Component

The `ReaderMenuSearch` component displays paginated search results with navigation controls.

```mermaid
flowchart TD

NMP["nMatchPage: number"]
FA["foundArray: ISearchResult[]"]
RO["readingOrder: Link[]"]
MPP["MAX_MATCHES_PER_PAGE = 10"]
PC["Page Calculation"]
PN["Page Navigation"]
RSL["renderSearchLinks()"]
HL["Highlight Links"]
MM["Memoization"]

FA --> RSL
NMP --> PC
PC --> RSL
RO --> RSL

subgraph subGraph2 ["Result Rendering"]
    RSL
    HL
    MM
    RSL --> HL
    RSL --> MM
end

subgraph subGraph1 ["Pagination Logic"]
    MPP
    PC
    PN
end

subgraph subGraph0 ["ReaderMenuSearch State"]
    NMP
    FA
    RO
end
```

Key features:

* Pagination with 10 results per page (`MAX_MATCHES_PER_PAGE`)
* Memoized result rendering for performance
* Integration with table of contents for result grouping
* Debounced click handling to prevent double-clicks

**Sources:** [src/renderer/reader/components/ReaderMenuSearch.tsx L49-L542](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderMenuSearch.tsx#L49-L542)

## Search Processing

### Search Request Saga

The `searchRequest` saga coordinates the search process across cached document resources.

```mermaid
flowchart TD

SR["searchRequest(action)"]
CS["clearSearch()"]
GRC["getResourceCacheAll()"]
SM["searchMap creation"]
PRS["Parallel search execution"]
FR["flatten(results)"]
SF["searchFound action"]
CSC["COLOR_SEARCH: {r:190,g:233,b:34}"]
CSCF["COLOR_SEARCH_FOCUS: {r:241,g:79,b:237}"]

SR --> CS
CS --> GRC
GRC --> SM
SM --> PRS
PRS --> FR
FR --> SF
SF --> CSC
SF --> CSCF

subgraph subGraph0 ["Search Colors"]
    CSC
    CSCF
end
```

The search process:

1. Clears existing search highlights
2. Retrieves all cached document resources
3. Executes search across all resources in parallel
4. Flattens and dispatches results

**Sources:** [src/renderer/reader/redux/sagas/search.ts L83-L101](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts#L83-L101)

 [src/renderer/reader/redux/sagas/search.ts L48-L57](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts#L48-L57)

### Search Result Conversion

Search results are converted to highlight handler states for visual presentation.

```
interface ISearchResult {    uuid: string;    href: string;    cleanBefore: string;    cleanText: string;    cleanAfter: string;    rangeInfo: IRangeInfo;}
```

The `converterSearchResultToHighlightHandlerState` function transforms search results into highlight definitions with:

* UUID for unique identification
* Color coding (normal vs focused)
* Range information for precise positioning
* Text context for display

**Sources:** [src/renderer/reader/redux/sagas/search.ts L103-L126](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts#L103-L126)

 [src/common/redux/states/renderer/search.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/renderer/search.ts)

## Result Highlighting and Navigation

### Search Focus Management

The search focus system allows navigation between search results with visual highlighting.

```mermaid
flowchart TD

SF["searchFocus(action)"]
GFA["Get foundArray"]
FI["Find old/new items"]
CC["Same focus?"]
RL["Restore location"]
UH["Update highlights"]
POP["Pop old highlights"]
PUSH["Push new highlights"]
NAV["Navigate to location"]
HLD["handleLinkLocatorDebounced()"]

SF --> GFA
GFA --> FI
FI --> CC
CC --> RL
CC --> UH
UH --> POP
POP --> PUSH
PUSH --> NAV
RL --> NAV
NAV --> HLD
```

Key functions:

* `searchFocus()` - Manages focus transitions between results
* `searchFocusPreviousOrNext()` - Cycles through results with wraparound
* `createLocatorLink()` - Creates navigation locators from search results

**Sources:** [src/renderer/reader/redux/sagas/search.ts L143-L202](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts#L143-L202)

 [src/renderer/reader/redux/sagas/search.ts L238-L265](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts#L238-L265)

### Highlight Integration

Search results integrate with the highlight system through the handler and mounter sagas.

| Component | Purpose |
| --- | --- |
| `highlightClick` | Handles clicks on search result highlights |
| `mountHighlight` | Mounts search highlights in WebView |
| `unmountHighlight` | Removes search highlights when clearing |

The search highlights use the "search" group identifier and are automatically managed during search operations.

**Sources:** [src/renderer/reader/redux/sagas/search.ts L228-L236](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts#L228-L236)

 [src/renderer/reader/redux/sagas/highlight/handler.ts L137-L224](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/highlight/handler.ts#L137-L224)

## PDF Search Integration

PDF documents use a separate search mechanism through the event bus system.

```mermaid
flowchart TD

SFP["SearchFormPicker"]
PDF["isPdf?"]
EPUB["EPUB Search Saga"]
EB["EventBus dispatch"]
PDFJS["PDF.js Search"]
SUB["subscribe(key, fn)"]
DIS["dispatch(key, ...args)"]
REM["remove(fn, key?)"]

SFP --> PDF
PDF --> EPUB
PDF --> EB
EB --> PDFJS
EB --> DIS
PDFJS --> SUB

subgraph subGraph0 ["Event Bus"]
    SUB
    DIS
    REM
end
```

The PDF search flow:

1. `SearchFormPicker` detects PDF mode via `isPdf` prop
2. Dispatches "search" event through `createOrGetPdfEventBus()`
3. PDF.js handles the search internally
4. Results are managed separately from EPUB search system

**Sources:** [src/renderer/reader/components/picker/SearchFormPicker.tsx L169-L174](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/picker/SearchFormPicker.tsx#L169-L174)

 [src/renderer/reader/pdf/common/eventBus.ts L14-L85](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/pdf/common/eventBus.ts#L14-L85)

## Search State Management

The search state is managed through Redux with the following structure:

```
interface SearchState {    textSearch?: string;    foundArray?: ISearchResult[];    newFocusUUId?: string;    oldFocusUUId?: string;}
```

Search actions include:

* `readerLocalActionSearch.request` - Initiates search
* `readerLocalActionSearch.found` - Stores results
* `readerLocalActionSearch.focus` - Manages result focus
* `readerLocalActionSearch.next/previous` - Navigation actions
* `readerLocalActionSearch.enable/cancel` - Lifecycle management

**Sources:** [src/renderer/reader/redux/sagas/search.ts L26-L27](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/search.ts#L26-L27)

 [src/common/redux/states/renderer/search.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/renderer/search.ts)