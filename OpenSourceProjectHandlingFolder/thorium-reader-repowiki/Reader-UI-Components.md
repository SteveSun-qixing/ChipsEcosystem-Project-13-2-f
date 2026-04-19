# Reader UI Components

> **Relevant source files**
> * [src/common/models/reader.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/reader.ts)
> * [src/common/redux/states/reader.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/reader.ts)
> * [src/renderer/assets/styles/components/annotations.scss](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/assets/styles/components/annotations.scss)
> * [src/renderer/assets/styles/components/popoverDialog.scss](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/assets/styles/components/popoverDialog.scss)
> * [src/renderer/reader/components/Reader.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/Reader.tsx)
> * [src/renderer/reader/components/ReaderFooter.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderFooter.tsx)
> * [src/renderer/reader/components/ReaderHeader.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderHeader.tsx)
> * [src/renderer/reader/components/ReaderMenu.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderMenu.tsx)
> * [src/renderer/reader/components/ReaderSettings.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx)
> * [src/renderer/reader/components/header/voiceSelection.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/voiceSelection.tsx)
> * [src/renderer/reader/components/options-values.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/options-values.ts)
> * [src/renderer/reader/redux/sagas/readerConfig.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/readerConfig.ts)
> * [src/typings/react.d.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/react.d.ts)

This document describes the UI components used in the reading view of Thorium Reader. These components manage the display of publications, provide navigation controls, reading settings, and access to features like annotations and bookmarks. This page focuses specifically on the UI components and their interactions, not the underlying publication rendering engine.

For information about reader window management, see [Reader Window Management](/edrlab/thorium-reader/2.2-reader-window-management). For annotation functionality, see [Annotations and Bookmarks](/edrlab/thorium-reader/2.3-annotations-and-bookmarks).

## Reader Component Architecture

The reading interface is composed of multiple React components that work together to provide the complete reading experience.

```mermaid
flowchart TD

ReaderMenu["ReaderMenu.tsx<br>Navigation & Features"]
Reader["Reader.tsx<br>Main Container Component"]
ReaderHeader["ReaderHeader.tsx<br>Navigation & Controls"]
ReaderFooter["ReaderFooter.tsx<br>Location & Navigation"]
ReaderSettings["ReaderSettings.tsx<br>Reading Preferences"]
HeaderSearch["HeaderSearch.tsx<br>Search Interface"]
BookmarkButton["BookmarkButton.tsx<br>Bookmark Toggle"]
VoiceSelection["VoiceSelection.tsx<br>TTS Voice Controls"]
PublicationInfo["PublicationInfo<br>Publication Metadata"]
ThemeSettings["Theme Selection"]
FontSettings["Font Family & Size"]
SpacingSettings["Text Spacing Controls"]
LayoutSettings["Display Layout Options"]
AudioSettings["TTS & Media Overlay Settings"]
TableOfContents["TOC Navigation"]
BookmarksList["Bookmarks Management"]
AnnotationsList["Annotations Management"]
SearchResults["Search Results"]

subgraph subGraph3 ["Reader UI Component Hierarchy"]
    Reader
    ReaderFooter
    Reader --> ReaderHeader
    Reader --> ReaderFooter
    Reader --> ReaderSettings
    Reader --> ReaderMenu

subgraph subGraph2 ["Menu Panels"]
    ReaderMenu
    TableOfContents
    BookmarksList
    AnnotationsList
    SearchResults
    ReaderMenu --> TableOfContents
    ReaderMenu --> BookmarksList
    ReaderMenu --> AnnotationsList
    ReaderMenu --> SearchResults
end

subgraph subGraph1 ["Settings Panels"]
    ReaderSettings
    ThemeSettings
    FontSettings
    SpacingSettings
    LayoutSettings
    AudioSettings
    ReaderSettings --> ThemeSettings
    ReaderSettings --> FontSettings
    ReaderSettings --> SpacingSettings
    ReaderSettings --> LayoutSettings
    ReaderSettings --> AudioSettings
end

subgraph subGraph0 ["Header Features"]
    ReaderHeader
    HeaderSearch
    BookmarkButton
    VoiceSelection
    PublicationInfo
    ReaderHeader --> HeaderSearch
    ReaderHeader --> BookmarkButton
    ReaderHeader --> VoiceSelection
    ReaderHeader --> PublicationInfo
end
end
```

Sources: [src/renderer/reader/components/Reader.tsx L48-L51](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/Reader.tsx#L48-L51)

 [src/renderer/reader/components/ReaderSettings.tsx L89-L115](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L89-L115)

## Component Data Flow

The components communicate with each other through Redux state and props passing:

```mermaid
flowchart TD

Reader["Reader.tsx"]
ReaderHeader["ReaderHeader.tsx"]
ReaderFooter["ReaderFooter.tsx"]
ReaderSettings["ReaderSettings.tsx"]
ReaderMenu["ReaderMenu.tsx"]
ReduxStore["Redux Store"]
Config["ReaderConfig State"]
Location["Reading Location"]
TTS["TTS State"]
MediaOverlays["Media Overlays State"]
MenuSettings["Menu/Settings Open State"]
R2Navigator["R2 Navigator JS"]
ReadiumCSS["Readium CSS"]
TTSEngine["TTS Engine"]
MOEngine["Media Overlays Engine"]
User["User<br>Interaction"]
Publication["Publication WebView"]

User --> Reader
User --> ReaderHeader
User --> ReaderFooter
User --> ReaderSettings
User --> ReaderMenu
Reader --> ReduxStore
ReaderHeader --> ReduxStore
ReaderFooter --> ReduxStore
ReaderSettings --> ReduxStore
ReaderMenu --> ReduxStore
Config --> ReadiumCSS
TTS --> TTSEngine
MediaOverlays --> MOEngine
Reader --> R2Navigator
R2Navigator --> Publication

subgraph subGraph3 ["Reading Engine"]
    R2Navigator
    ReadiumCSS
    TTSEngine
    MOEngine
end

subgraph subGraph2 ["State Management"]
    ReduxStore
    ReduxStore --> Config
    ReduxStore --> Location
    ReduxStore --> TTS
    ReduxStore --> MediaOverlays
    ReduxStore --> MenuSettings

subgraph subGraph1 ["Reader State"]
    Config
    Location
    TTS
    MediaOverlays
    MenuSettings
end
end

subgraph subGraph0 ["UI Components"]
    Reader
    ReaderHeader
    ReaderFooter
    ReaderSettings
    ReaderMenu
end
```

Sources: [src/renderer/reader/components/Reader.tsx L25-L30](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/Reader.tsx#L25-L30)

 [src/renderer/reader/redux/sagas/readerConfig.ts L29-L207](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/readerConfig.ts#L29-L207)

## Main Reader Component (Reader.tsx)

The `Reader.tsx` component is the main container that orchestrates the entire reading interface. It maintains the overall reader state and integrates all subcomponents.

Key responsibilities:

* Rendering the publication content (through R2 Navigator)
* Handling keyboard shortcuts and navigation
* Managing reading location tracking
* Controlling UI modes (fullscreen, zen mode)
* Coordinating TTS and media overlay playback

```mermaid
classDiagram
    class Reader {
        +state: IState
        +refs: React.RefObject<HTMLElement>
        +currentDivinaPlayer: any
        +handleReadingLocationChange()
        +goToLocator()
        +handleLinkClick()
        +navLeftOrRight_()
        +handleFullscreenClick()
        +handleTTSPlay/Pause/Stop/Resume()
        +handleMediaOverlaysPlay/Pause/Stop()
        +setZenModeAndFXLZoom()
        +loadPublicationIntoViewport()
    }
    class IState {
        +fxlZoomPercent: number
        +shortcutEnable: boolean
        +fullscreen: boolean
        +zenMode: boolean
        +currentLocation: MiniLocatorExtended
        +divinaReadingModeSupported: TdivinaReadingMode[]
        +divinaNumberOfPages: number
        +historyCanGoBack: boolean
        +historyCanGoForward: boolean
    }
```

The Reader component renders a main area with publication content and conditionally renders the header, footer, settings panel, and navigation menu components.

Sources: [src/renderer/reader/components/Reader.tsx L255-L413](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/Reader.tsx#L255-L413)

 [src/renderer/reader/components/Reader.tsx L421-L596](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/Reader.tsx#L421-L596)

 [src/renderer/reader/components/Reader.tsx L789-L805](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/Reader.tsx#L789-L805)

## Header Component (ReaderHeader.tsx)

The `ReaderHeader.tsx` component provides the top navigation bar with controls for reader functions.

### Structure and Layout

```mermaid
flowchart TD

LeftSection["Left Controls<br>(Navigation)"]
CenterSection["Center Controls<br>(Audio/TTS)"]
RightSection["Right Controls<br>(UI Options)"]
BackButton["Library Return<br>Button"]
InfoButton["Publication Info<br>Button"]
TTSControls["TTS/Media Controls<br>(Play/Pause/Stop)"]
PlaybackRate["Playback Rate<br>Selector"]
VoiceSelector["TTS Voice<br>Selector"]
TOCButton["Table of Contents<br>Button"]
AnnotationsButton["Annotations<br>Button"]
SettingsButton["Settings<br>Button"]
BookmarkButton["Bookmark<br>Button"]
FullscreenButton["Fullscreen<br>Button"]

LeftSection --> BackButton
LeftSection --> InfoButton
CenterSection --> TTSControls
CenterSection --> PlaybackRate
CenterSection --> VoiceSelector
RightSection --> TOCButton
RightSection --> AnnotationsButton
RightSection --> SettingsButton
RightSection --> BookmarkButton
RightSection --> FullscreenButton

subgraph subGraph3 ["Right Section"]
    TOCButton
    AnnotationsButton
    SettingsButton
    BookmarkButton
    FullscreenButton
end

subgraph subGraph2 ["Center Section"]
    TTSControls
    PlaybackRate
    VoiceSelector
end

subgraph subGraph1 ["Left Section"]
    BackButton
    InfoButton
end

subgraph ReaderHeader ["ReaderHeader"]
    LeftSection
    CenterSection
    RightSection
end
```

The header component adapts based on the publication type (EPUB, PDF, audiobook, Divina) and shows different controls accordingly.

Sources: [src/renderer/reader/components/ReaderHeader.tsx L175-L241](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderHeader.tsx#L175-L241)

 [src/renderer/reader/components/ReaderHeader.tsx L394-L537](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderHeader.tsx#L394-L537)

### Audio and TTS Controls

The header contains specialized controls for Text-to-Speech and Media Overlays:

* Audio buttons (play, pause, stop, previous, next)
* Playback rate selection
* Voice selection interface with language filtering
* Audio/TTS state indication through CSS

```mermaid
flowchart TD

UserClick["User clicks<br>Play button"]
CheckMO["Check if publication<br>has Media Overlays"]
UseTTS["Use TTS Engine"]
UseMO["Use Media Overlays"]
PlaybackState["Update playback state<br>PLAYING/PAUSED/STOPPED"]
UIUpdate["Update UI to show<br>active audio controls"]

subgraph subGraph0 ["Audio Controls State Flow"]
    UserClick
    CheckMO
    UseTTS
    UseMO
    PlaybackState
    UIUpdate
    UserClick --> CheckMO
    CheckMO --> UseTTS
    CheckMO --> UseMO
    UseTTS --> PlaybackState
    UseMO --> PlaybackState
    PlaybackState --> UIUpdate
end
```

Sources: [src/renderer/reader/components/ReaderHeader.tsx L563-L602](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderHeader.tsx#L563-L602)

 [src/renderer/reader/components/header/voiceSelection.tsx L31-L124](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/voiceSelection.tsx#L31-L124)

## Footer Component (ReaderFooter.tsx)

The `ReaderFooter.tsx` component displays the reading progress and provides navigation controls.

Key features:

* History navigation buttons (back/forward)
* Reading progress track with chapter markers
* Current location indicator
* Location information (page numbers, percentages)

```mermaid
flowchart TD

ChapterMarkers["Chapter Markers<br>(Clickable)"]
HistoryNav["History Navigation<br>(Back/Forward Buttons)"]
ProgressTrack["Reading Progress Track"]
CurrentPosition["Current Position<br>Indicator"]
LocationInfo["Location Information<br>(Page/Chapter Numbers)"]

subgraph ReaderFooter ["ReaderFooter"]
    HistoryNav
    ProgressTrack
    LocationInfo
    HistoryNav --> ProgressTrack
    ProgressTrack --> ChapterMarkers
    ProgressTrack --> CurrentPosition
    ProgressTrack --> LocationInfo

subgraph subGraph0 ["Progress Track Elements"]
    ChapterMarkers
    CurrentPosition
end
end
```

The footer adapts to different publication types:

* EPUB: Shows spine items as markers
* PDF: Shows page numbers
* Divina: Shows page positions based on Divina format

Sources: [src/renderer/reader/components/ReaderFooter.tsx L115-L140](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderFooter.tsx#L115-L140)

 [src/renderer/reader/components/ReaderFooter.tsx L189-L398](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderFooter.tsx#L189-L398)

## Settings Component (ReaderSettings.tsx)

The `ReaderSettings.tsx` component provides a comprehensive interface for customizing the reading experience.

### Settings Structure

```mermaid
flowchart TD

DisplayTab["Display Tab<br>(Theme & Layout)"]
TextTab["Text Tab<br>(Font & Size)"]
SpacingTab["Spacing Tab<br>(Margins & Spacing)"]
AudioTab["Audio Tab<br>(TTS & Media)"]
PDFTab["PDF Tab<br>(PDF-specific)"]
DivinaTab["Divina Tab<br>(Divina-specific)"]
ThemeOptions["Theme Options<br>(Neutral/Sepia/Night/Contrast)"]
PagedScrolled["Paged/Scrolled Mode"]
ColumnCount["Column Count"]
TextAlignment["Text Alignment"]
FontFamily["Font Family Selection"]
FontSize["Font Size Slider"]
Margins["Page Margins"]
WordSpacing["Word Spacing"]
LetterSpacing["Letter Spacing"]
ParaSpacing["Paragraph Spacing"]
LineHeight["Line Height"]

DisplayTab --> ThemeOptions
DisplayTab --> PagedScrolled
DisplayTab --> ColumnCount
DisplayTab --> TextAlignment
TextTab --> FontFamily
TextTab --> FontSize
SpacingTab --> Margins
SpacingTab --> WordSpacing
SpacingTab --> LetterSpacing
SpacingTab --> ParaSpacing
SpacingTab --> LineHeight

subgraph subGraph3 ["Spacing Settings (SpacingTab)"]
    Margins
    WordSpacing
    LetterSpacing
    ParaSpacing
    LineHeight
end

subgraph subGraph2 ["Text Settings (TextTab)"]
    FontFamily
    FontSize
end

subgraph subGraph1 ["Theme Settings (DisplayTab)"]
    ThemeOptions
    PagedScrolled
    ColumnCount
    TextAlignment
end

subgraph subGraph0 ["ReaderSettings Tabs"]
    DisplayTab
    TextTab
    SpacingTab
    AudioTab
    PDFTab
    DivinaTab
end
```

Sources: [src/renderer/reader/components/ReaderSettings.tsx L89-L115](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L89-L115)

 [src/renderer/reader/components/ReaderSettings.tsx L192-L232](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L192-L232)

 [src/renderer/reader/components/ReaderSettings.tsx L234-L293](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L234-L293)

 [src/renderer/reader/components/ReaderSettings.tsx L489-L547](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L489-L547)

### Settings State Management

The settings component uses React hooks to interact with the Redux store:

* `useReaderConfig`: Retrieves values from the reader configuration
* `useSaveReaderConfigDebounced`: Saves changes to the reader configuration with debouncing
* `usePublisherReaderConfig`: Gets publisher-specific settings
* `useSavePublisherReaderConfig`: Saves publisher-specific settings

Changes to settings trigger Redux actions that update the state and apply the changes through the reading engine.

```mermaid
flowchart TD

UserChange["User changes setting<br>(e.g., font size)"]
Hook["React Hook<br>(useSaveReaderConfigDebounced)"]
Action["Redux Action<br>(readerLocalActionSetConfig)"]
Saga["Redux Saga<br>(readerConfigChanged)"]
ReadiumCSS["Readium CSS Update<br>(computeReadiumCssJsonMessage)"]
WebView["WebView Rendering Update"]

subgraph subGraph0 ["Settings UI Interaction"]
    UserChange
    Hook
    Action
    Saga
    ReadiumCSS
    WebView
    UserChange --> Hook
    Hook --> Action
    Action --> Saga
    Saga --> ReadiumCSS
    ReadiumCSS --> WebView
end
```

Sources: [src/renderer/reader/redux/sagas/readerConfig.ts L29-L207](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/readerConfig.ts#L29-L207)

 [src/common/redux/states/reader.ts L14-L92](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/reader.ts#L14-L92)

## Configuration Models

The reader settings are controlled through several configuration models:

```mermaid
classDiagram
    class ReaderConfig {
        +align: string
        +colCount: string
        +font: string
        +fontSize: string
        +pageMargins: string
        +wordSpacing: string
        +letterSpacing: string
        +paraSpacing: string
        +lineHeight: string
        +theme: TTheme
        +paged: boolean
        +night: boolean
        +sepia: boolean
        +invert: boolean
        +enableMathJax: boolean
        +readerDockingMode: "full"|"left"|"right"
    }
    class ReaderConfigInitialState {
        +align: "auto"
        +colCount: "auto"
        +dark: false
        +invert: false
        +night: false
        +paged: true
        +readiumcss: true
        +sepia: false
        +theme: "neutral"
        +font: FONT_ID_DEFAULT
        +fontSize: "100%"
        +pageMargins: "1"
        +wordSpacing: "0"
        +letterSpacing: "0"
        +paraSpacing: "0"
        +lineHeight: "0"
    }
    ReaderConfig <|-- ReaderConfigInitialState : default values
```

Sources: [src/common/models/reader.ts L124-L133](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/reader.ts#L124-L133)

 [src/common/redux/states/reader.ts L42-L92](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/reader.ts#L42-L92)

## Reader UI Adaptability

The reader UI adapts to different publication types and reading modes:

1. **Publication Type Adaptation** * EPUB: Full set of controls and settings * PDF: PDF-specific zoom and layout controls * Audiobook: Audio controls focused * Divina: Special Divina navigation and display modes
2. **Reading Mode Adaptation** * Fixed layout vs. reflowable layout * Right-to-left vs. left-to-right reading * Paginated vs. scrolled view * Single column vs. multi-column layout
3. **Device Adaptation** * Responsive design for different screen sizes * Fullscreen and zen reading modes * Keyboard shortcut support
4. **Accessibility Features** * Text-to-speech capabilities * Media overlay support * Theme options for different contrast needs * Screen reader compatibility

Sources: [src/renderer/reader/components/Reader.tsx L739-L765](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/Reader.tsx#L739-L765)

 [src/renderer/reader/components/ReaderSettings.tsx L569-L625](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L569-L625)

## Component Integration Points

The reader UI components interact with several other systems:

1. **Navigation System** * History navigation (back/forward) * TOC navigation * Page navigation * Link handling
2. **Reading Engine (R2 Navigator)** * Content rendering * CSS styling application * Reading location tracking * Media playback
3. **State Management (Redux)** * Reader configuration state * UI state (open/closed panels) * Location state * Media state
4. **Internationalization** * UI translations via translator service

These integration points allow the UI components to provide a cohesive reading experience while maintaining separation of concerns.

Sources: [src/renderer/reader/components/Reader.tsx L130-L185](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/Reader.tsx#L130-L185)

 [src/renderer/reader/redux/sagas/readerConfig.ts L182-L207](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/readerConfig.ts#L182-L207)

## Summary

The Reader UI components in Thorium Reader form a comprehensive system for displaying and interacting with digital publications. The components are organized into a hierarchy with the main Reader component orchestrating subcomponents for the header, footer, settings, and navigation. The UI is highly adaptable to different publication types and reading preferences, providing extensive customization options through the settings interface. State management through Redux ensures consistent behavior across components and persistent settings between reading sessions.

Sources: [src/renderer/reader/components/Reader.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/Reader.tsx)

 [src/renderer/reader/components/ReaderHeader.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderHeader.tsx)

 [src/renderer/reader/components/ReaderFooter.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderFooter.tsx)

 [src/renderer/reader/components/ReaderSettings.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx)