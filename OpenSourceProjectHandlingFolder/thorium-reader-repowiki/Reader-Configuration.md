# Reader Configuration

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

This document covers the reader configuration system that manages user preferences for reading publications in Thorium Reader. The system handles settings for text display, layout, themes, audio/TTS, annotations, and publication-specific configurations for EPUB, PDF, and Divina formats.

For information about the reader UI components themselves, see [Reader UI Components](/edrlab/thorium-reader/2.1-reader-ui-components). For state management of reader configuration, see [State Management](/edrlab/thorium-reader/6-state-management).

## Configuration Data Model

The reader configuration system is built around the `ReaderConfig` interface, which combines multiple configuration domains into a unified structure.

```

```

**Core Configuration Categories:**

| Category | Purpose | Key Settings |
| --- | --- | --- |
| Text Settings | Typography and spacing | `font`, `fontSize`, `lineHeight`, `letterSpacing` |
| Display Settings | Visual presentation | `theme`, `paged`, `colCount`, `align` |
| TTS/Audio | Text-to-speech and media overlays | `ttsPlaybackRate`, `ttsVoices`, `mediaOverlaysPlaybackRate` |
| Annotations | Note-taking preferences | `annotation_defaultColor`, `annotation_defaultDrawType` |
| UI Layout | Interface organization | `readerDockingMode`, `readerMenuSection` |

Sources: [src/common/models/reader.ts L49-L151](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/reader.ts#L49-L151)

 [src/common/redux/states/reader.ts L43-L92](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/reader.ts#L43-L92)

## Settings UI Architecture

The reader settings are presented through a tabbed interface that adapts to different publication types and display modes.

```

```

**Tab Selection Logic:**

* Default tab is `"tab-display"` for standard publications
* PDF publications show `"tab-pdfZoom"` with zoom controls
* Divina (comics) publications show `"tab-divina"` with reading mode options

**Settings Persistence:**

* Publisher-specific settings are saved per publication using `useSavePublisherReaderConfigDebounced`
* Global settings are saved using `useSaveReaderConfigDebounced`
* Changes are debounced to prevent excessive updates during user interaction

Sources: [src/renderer/reader/components/ReaderSettings.tsx L88-L121](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L88-L121)

 [src/renderer/reader/components/ReaderSettings.tsx L234-L294](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L234-L294)

## Configuration Update Pipeline

The system uses a saga-based pipeline to process configuration changes and apply them to the reading experience.

```

```

**Configuration Processing Steps:**

1. **Docking Mode Handling** - Switches between modal and docked UI modes
2. **Audio Settings** - Updates TTS voices, playback rate, and media overlay preferences
3. **Visual Settings** - Applies CSS updates for typography, spacing, and themes
4. **Content Reload** - Triggers page reload for settings like MathJax that require re-rendering

**Key Saga Functions:**

* `readerConfigChanged` processes all configuration updates
* `alowCustomTriggered` handles publisher-specific configuration toggles
* Background saga monitors MathJax setting changes and triggers content reload

Sources: [src/renderer/reader/redux/sagas/readerConfig.ts L29-L207](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/readerConfig.ts#L29-L207)

 [src/renderer/reader/redux/sagas/readerConfig.ts L209-L221](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/redux/sagas/readerConfig.ts#L209-L221)

## Theme and Visual Configuration

The theme system provides 8 predefined color schemes with adaptive styling for different reading preferences.

**Available Themes:**

| Theme | Background | Text Color | Use Case |
| --- | --- | --- | --- |
| `neutral` | #fefefe | black | Default reading |
| `sepia` | #faf4e8 | black | Warm reading |
| `night` | #121212 | white | Dark mode |
| `paper` | #E9DDC8 | black | Paper-like texture |
| `contrast1` | #000000 | white | High contrast |
| `contrast2` | #000000 | yellow | High contrast with color |
| `contrast3` | #181842 | white | Blue-tinted dark |
| `contrast4` | #C5E7CD | black | Green-tinted light |

**Font Configuration:**

* Default font list from `FONT_LIST` with Japanese support via `FONT_LIST_WITH_JA`
* Custom font input with sanitization for security
* Font family preview in settings UI
* Publisher-specific font overrides supported

Sources: [src/renderer/reader/components/ReaderSettings.tsx L128-L177](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L128-L177)

 [src/renderer/reader/components/ReaderSettings.tsx L296-L405](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L296-L405)

## Audio and TTS Configuration

The system integrates with the `readium-speech` library to provide comprehensive text-to-speech configuration.

```

```

**TTS Settings:**

* Playback rate: 0.5x to 3x speed with 11 predefined options
* Voice selection grouped by language and region
* Sentence detection and overlay mode toggles
* Highlight styling for TTS pronunciation tracking

**Media Overlay Settings:**

* Synchronized audio playback rate
* Caption mode for accessibility
* Skippability controls for navigation elements
* Continuous play options

Sources: [src/renderer/reader/components/header/voiceSelection.tsx L29-L139](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/header/voiceSelection.tsx#L29-L139)

 [src/renderer/reader/components/ReaderHeader.tsx L428-L440](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderHeader.tsx#L428-L440)

## Publication-Specific Configurations

Different publication formats require specialized configuration options.

**PDF Configuration:**

* Scale modes: fit, percentage-based zoom
* View modes: single page, continuous scroll
* Column layout options
* Page navigation controls

**Divina (Comics) Configuration:**

* Reading modes: `single`, `double`, `scroll`, `guided`
* Sound control for multimedia content
* Page-based vs. continuous navigation
* Supported modes determined by publication metadata

**EPUB Configuration:**

* Fixed vs. reflowable layout handling
* RTL (Right-to-Left) text direction support
* Column count for multi-column layouts
* Math rendering with MathJax integration

**Common Adjustable Settings:**

* Page margins: 0 to 2rem in 8 steps
* Word spacing: 0 to 1rem in 10 steps
* Letter spacing: 0 to 0.5rem in 9 steps
* Paragraph spacing: 0 to 3rem in 8 steps
* Line height: 1 to 2 in 9 steps

Sources: [src/renderer/reader/components/options-values.ts L18-L98](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/options-values.ts#L18-L98)

 [src/renderer/reader/components/ReaderSettings.tsx L484-L537](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/ReaderSettings.tsx#L484-L537)