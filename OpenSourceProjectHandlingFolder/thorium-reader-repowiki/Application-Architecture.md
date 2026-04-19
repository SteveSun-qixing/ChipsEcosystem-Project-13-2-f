# Application Architecture

> **Relevant source files**
> * [package-lock.json](https://github.com/edrlab/thorium-reader/blob/02b67755/package-lock.json)
> * [package.json](https://github.com/edrlab/thorium-reader/blob/02b67755/package.json)
> * [scripts/webpack-loader-scope-checker.js](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/webpack-loader-scope-checker.js)
> * [src/main.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main.ts)
> * [src/main/di.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/di.ts)
> * [src/package.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/package.json)
> * [src/renderer/library/index_library.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/index_library.ts)
> * [src/renderer/library/redux/sagas/i18n.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/redux/sagas/i18n.ts)
> * [webpack.config.main.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.main.js)
> * [webpack.config.preload.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.preload.js)
> * [webpack.config.renderer-library.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.renderer-library.js)
> * [webpack.config.renderer-pdf.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.renderer-pdf.js)
> * [webpack.config.renderer-reader.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.renderer-reader.js)

This document provides a technical overview of the Thorium Reader application architecture, explaining the high-level structure of the Electron-based application, its processes, core dependencies, and how the various components interact. For information about specific subsystems, refer to their dedicated sections in the wiki, such as the Reader System in [2](/edrlab/thorium-reader/2-reader-system) or the Library System in [3](/edrlab/thorium-reader/3-library-system).

## Overview

Thorium Reader is built on the Electron framework, which provides a multi-process architecture with a clear separation between the main process and renderer processes. This application leverages modern JavaScript/TypeScript development patterns including dependency injection, Redux for state management, and React for UI rendering.

```mermaid
flowchart TD

Main["Main Process<br>(src/main.ts)"]
LibraryWindow["Library Window<br>(Publication Management)"]
ReaderWindow["Reader Window<br>(Publication Viewing)"]
Streamer["Publication Streamer"]
DI["Dependency Injection<br>(src/main/di.ts)"]
Redux["Redux Store"]
Services["Services<br>(LCP, OPDS, etc.)"]
Renderer["Renderer Processes"]

subgraph subGraph0 ["Electron Application"]
    Main
    LibraryWindow
    ReaderWindow
    Streamer
    DI
    Redux
    Services
    Renderer
    Main --> LibraryWindow
    Main --> ReaderWindow
    Main --> Streamer
    Main --> DI
    Main --> Redux
    Streamer --> ReaderWindow
    DI --> Services
    Redux --> LibraryWindow
    Redux --> ReaderWindow
end
```

Sources: [src/main.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main.ts)

 [src/main/di.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/di.ts)

 [webpack.config.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.js)

## Main Process Architecture

The main process serves as the central coordinator for the application. It initializes core systems, manages windows, and handles communication between different parts of the application.

### Application Entry Point

The application entry point is `src/main.ts`, which performs several key initialization tasks:

1. Sets up logging via the debug module
2. Initializes global converters for Readium libraries
3. Configures the LCP native plugin for DRM support
4. Sets up protocol handlers for content serving
5. Creates the Redux store via dependency injection
6. Starts the streamer service

```mermaid
flowchart TD

Entry["Entry Point<br>(src/main.ts)"]
GlobalConverters["Initialize Global Converters"]
LCP["Configure LCP"]
Protocols["Register Protocol Handlers"]
Store["Create Redux Store"]
CommandLine["Process Command Line Arguments"]

subgraph subGraph0 ["Main Process Initialization"]
    Entry
    GlobalConverters
    LCP
    Protocols
    Store
    CommandLine
    Entry --> GlobalConverters
    Entry --> LCP
    Entry --> Protocols
    Entry --> Store
    Entry --> CommandLine
end
```

Sources: [src/main.ts L49-L84](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main.ts#L49-L84)

 [webpack.config.main.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.main.js)

### Dependency Injection System

The application uses InversifyJS for dependency injection, configured in `src/main/di.ts`. This enables decoupled components and simplified testing. The DI container manages:

```mermaid
flowchart TD

DI["Container<br>(src/main/di.ts)"]
Repos["Repositories"]
PubRepo["Publication Repository"]
OpdsRepo["OPDS Feed Repository"]
Converters["Converters"]
PubConverter["Publication View Converter"]
OpdsConverter["OPDS Feed View Converter"]
Storage["Storage"]
PubStorage["Publication Storage"]
Services["Services"]
OpdsService["OPDS Service"]
LcpManager["LCP Manager"]
LsdManager["LSD Manager"]
DeviceManager["Device ID Manager"]
Windows["Window References"]
LibWin["Library Window"]
ReaderWins["Reader Windows Map"]
ReduxStore["Redux Store"]

subgraph subGraph0 ["Dependency Injection Container"]
    DI
    Repos
    PubRepo
    OpdsRepo
    Converters
    PubConverter
    OpdsConverter
    Storage
    PubStorage
    Services
    OpdsService
    LcpManager
    LsdManager
    DeviceManager
    Windows
    LibWin
    ReaderWins
    ReduxStore
    DI --> Repos
    Repos --> PubRepo
    Repos --> OpdsRepo
    DI --> Converters
    Converters --> PubConverter
    Converters --> OpdsConverter
    DI --> Storage
    Storage --> PubStorage
    DI --> Services
    Services --> OpdsService
    Services --> LcpManager
    Services --> LsdManager
    Services --> DeviceManager
    DI --> Windows
    Windows --> LibWin
    Windows --> ReaderWins
    DI --> ReduxStore
end
```

The container provides a `diMainGet` function that's used throughout the application to retrieve registered dependencies.

Sources: [src/main/di.ts L175-L346](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/di.ts#L175-L346)

 [src/main/di.ts L99-L137](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/di.ts#L99-L137)

### State Management

Thorium uses Redux for state management with Redux Saga for handling asynchronous operations. The main process maintains the primary Redux store, which is synchronized with renderer processes.

```mermaid
flowchart TD

Store["Redux Store<br>(src/main/redux/store/memory.ts)"]
Reducers["Reducers"]
Sagas["Sagas"]
AppSagas["App Lifecycle Sagas"]
WinSagas["Window Management Sagas"]
PubSagas["Publication Sagas"]
StreamerSagas["Streamer Sagas"]
AuthSagas["Authentication Sagas"]
IPC["IPC Middleware"]
RendererStores["Renderer Process Stores"]
Persist["State Persistence"]
StateFiles["State Files"]

subgraph subGraph0 ["Redux Architecture"]
    Store
    Reducers
    Sagas
    AppSagas
    WinSagas
    PubSagas
    StreamerSagas
    AuthSagas
    IPC
    RendererStores
    Persist
    StateFiles
    Store --> Reducers
    Store --> Sagas
    Sagas --> AppSagas
    Sagas --> WinSagas
    Sagas --> PubSagas
    Sagas --> StreamerSagas
    Sagas --> AuthSagas
    Store --> IPC
    IPC --> RendererStores
    Store --> Persist
    Persist --> StateFiles
end
```

Sources: [src/main/redux/sagas/app.ts L41-L265](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts#L41-L265)

 [src/main/redux/sagas/streamer.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/streamer.ts)

### Window Management

Windows are created and managed through Redux sagas, with references stored in the DI container:

```mermaid
flowchart TD

WinSagas["Window Sagas"]
CreateLib["Create Library Window Saga"]
CreateReader["Create Reader Window Saga"]
LibWin["Library Window<br>(BrowserWindow)"]
ReaderWin["Reader Window<br>(BrowserWindow)"]
DI["DI Container"]
Services["Services"]

subgraph subGraph0 ["Window Management"]
    WinSagas
    CreateLib
    CreateReader
    LibWin
    ReaderWin
    DI
    Services
    WinSagas --> CreateLib
    WinSagas --> CreateReader
    CreateLib --> LibWin
    CreateReader --> ReaderWin
    LibWin --> DI
    ReaderWin --> DI
    Services --> DI
    Services --> DI
end
```

Sources: [src/main/redux/sagas/win/browserWindow/createLibraryWindow.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/browserWindow/createLibraryWindow.ts)

 [src/main/redux/sagas/win/browserWindow/createReaderWindow.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/browserWindow/createReaderWindow.ts)

### Publication Streamer

The streamer service is responsible for serving publication content to reader windows. Thorium uses a custom protocol approach rather than an HTTP server:

```mermaid
flowchart TD

StreamerNoHttp["Streamer<br>(src/main/streamer/streamerNoHttp.ts)"]
ProtocolHandlers["Electron Protocol Handlers"]
StoreHandler["store:// Protocol"]
FilexHandler["filex:// Protocol"]
PDFHandler["pdfjs-extract:// Protocol"]
PubStorage["Publication Storage"]
ReaderWin["Reader Window"]

subgraph subGraph0 ["Streamer Architecture"]
    StreamerNoHttp
    ProtocolHandlers
    StoreHandler
    FilexHandler
    PDFHandler
    PubStorage
    ReaderWin
    StreamerNoHttp --> ProtocolHandlers
    ProtocolHandlers --> StoreHandler
    ProtocolHandlers --> FilexHandler
    ProtocolHandlers --> PDFHandler
    StoreHandler --> PubStorage
    StreamerNoHttp --> ReaderWin
end
```

The streamer provides several key functions:

* Serving publication content via custom protocols
* Injecting ReadiumCSS for styling EPUB publications
* Handling Media Overlays and MathML content
* Managing streamer sessions for multiple publications

Sources: [src/main/streamer/streamerNoHttp.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/streamer/streamerNoHttp.ts)

 [src/main/redux/sagas/streamer.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/streamer.ts)

## Renderer Processes

Thorium has three primary renderer processes, each with its own webpack configuration:

### Library Window

The library window is the main application interface showing the user's publication collection and allowing OPDS catalog browsing:

```mermaid
flowchart TD

LibraryEntry["Entry Point<br>(src/renderer/library/index_library.ts)"]
ReactApp["React Application"]
Redux["Redux Store"]
Pages["Pages"]
Catalog["Catalog View"]
Library["Library View"]
Settings["Settings"]
Components["UI Components"]
PublicationCard["Publication Card"]
OpdsNavigation["OPDS Navigation"]
Dialogs["Dialog System"]

subgraph subGraph0 ["Library Window Architecture"]
    LibraryEntry
    ReactApp
    Redux
    Pages
    Catalog
    Library
    Settings
    Components
    PublicationCard
    OpdsNavigation
    Dialogs
    LibraryEntry --> ReactApp
    ReactApp --> Redux
    ReactApp --> Pages
    Pages --> Catalog
    Pages --> Library
    Pages --> Settings
    ReactApp --> Components
    Components --> PublicationCard
    Components --> OpdsNavigation
    Components --> Dialogs
end
```

Sources: [src/renderer/library/index_library.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/index_library.ts)

 [webpack.config.renderer-library.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.renderer-library.js)

### Reader Window

The reader window displays publications using the Readium Navigator:

```mermaid
flowchart TD

ReaderEntry["Entry Point<br>(src/renderer/reader/index_reader.ts)"]
ReactApp["React Application"]
Redux["Redux Store"]
Reader["Reader Component<br>(src/renderer/reader/components/Reader.tsx)"]
ReaderHeader["Reader Header"]
ReaderFooter["Reader Footer"]
ReaderNav["Navigation Controls"]
R2Navigator["R2 Navigator"]
WebView["Publication WebView"]
ReadiumCSS["Readium CSS"]
TTS["Text-to-Speech"]

subgraph subGraph0 ["Reader Window Architecture"]
    ReaderEntry
    ReactApp
    Redux
    Reader
    ReaderHeader
    ReaderFooter
    ReaderNav
    R2Navigator
    WebView
    ReadiumCSS
    TTS
    ReaderEntry --> ReactApp
    ReactApp --> Redux
    ReactApp --> Reader
    Reader --> ReaderHeader
    Reader --> ReaderFooter
    Reader --> ReaderNav
    Reader --> R2Navigator
    R2Navigator --> WebView
    R2Navigator --> ReadiumCSS
    R2Navigator --> TTS
end
```

Sources: [src/renderer/reader/components/App.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/components/App.tsx)

 [webpack.config.renderer-reader.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.renderer-reader.js)

### PDF Viewer

The PDF viewer is a specialized reader for PDF documents:

```mermaid
flowchart TD

PDFDriver["PDF Driver<br>(src/renderer/reader/pdf/driver.ts)"]
WebView["WebView"]
PDFJS["PDF.js"]
EventBus["Event Bus"]
Controls["UI Controls"]

subgraph subGraph0 ["PDF Viewer Architecture"]
    PDFDriver
    WebView
    PDFJS
    EventBus
    Controls
    PDFDriver --> WebView
    WebView --> PDFJS
    PDFDriver --> EventBus
    EventBus --> WebView
    PDFDriver --> Controls
end
```

Sources: [src/renderer/reader/pdf/driver.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/pdf/driver.ts)

 [webpack.config.renderer-pdf.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.renderer-pdf.js)

## Publication Processing Pipeline

Publications follow a defined path from import to reading:

```mermaid
flowchart TD

FS["File System"]
OPDS["OPDS Catalogs"]
LCPL["LCP License Files"]
ImportSaga["Import Sagas"]
LcpManager["LCP Manager"]
PublicationStorage["Publication Storage"]
PublicationRepo["Publication Repository"]
LibraryView["Library View"]
ReaderView["Reader View"]
Streamer["Streamer"]

FS --> ImportSaga
OPDS --> ImportSaga
LCPL --> ImportSaga
PublicationRepo --> LibraryView
PublicationStorage --> Streamer

subgraph Display ["Display"]
    LibraryView
    ReaderView
    Streamer
    LibraryView --> Streamer
    Streamer --> ReaderView
end

subgraph Processing ["Processing"]
    ImportSaga
    LcpManager
    PublicationStorage
    PublicationRepo
    ImportSaga --> LcpManager
    ImportSaga --> PublicationStorage
    ImportSaga --> PublicationRepo
end

subgraph subGraph0 ["Import Sources"]
    FS
    OPDS
    LCPL
end
```

Sources: [src/main/redux/sagas/publication/openPublication.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/publication/openPublication.ts)

 [src/main/services/opds.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/opds.ts)

## Inter-Process Communication

Communication between the main process and renderer processes happens through Electron's IPC mechanism:

```mermaid
sequenceDiagram
  participant Library Window
  participant Main Process
  participant Reader Window

  Library Window->>Main Process: Redux Action (openPublication)
  Main Process->>Main Process: Process Publication
  Main Process->>Reader Window: Create Reader Window
  Reader Window->>Main Process: Request Publication Content
  Main Process->>Reader Window: Stream Publication Content
  Reader Window->>Main Process: Reading Progress Update
  Main Process->>Main Process: Update Global State
  Main Process->>Library Window: Sync State Changes
```

Redux actions are serialized and transmitted between processes, with appropriate sagas handling the actions.

Sources: [src/main/redux/sagas/win/library.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/library.ts)

 [src/common/utils/http.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/utils/http.ts)

## Build and Packaging

Thorium uses webpack for bundling and electron-builder for packaging:

```mermaid
flowchart TD

Webpack["Webpack"]
MainBundle["Main Process Bundle"]
LibraryBundle["Library Renderer Bundle"]
ReaderBundle["Reader Renderer Bundle"]
PDFBundle["PDF Renderer Bundle"]
PreloadBundle["Preload Script Bundle"]
Bundles["All Bundles"]
ElectronBuilder["Electron Builder"]
MacOS["macOS App"]
Windows["Windows App"]
Linux["Linux App"]

subgraph subGraph0 ["Build Process"]
    Webpack
    MainBundle
    LibraryBundle
    ReaderBundle
    PDFBundle
    PreloadBundle
    Bundles
    ElectronBuilder
    MacOS
    Windows
    Linux
    Webpack --> MainBundle
    Webpack --> LibraryBundle
    Webpack --> ReaderBundle
    Webpack --> PDFBundle
    Webpack --> PreloadBundle
    Bundles --> ElectronBuilder
    ElectronBuilder --> MacOS
    ElectronBuilder --> Windows
    ElectronBuilder --> Linux
end
```

Source code is split into multiple webpack configurations, one for each process, which are then combined for the final build.

Sources: [webpack.config.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.js)

 [scripts/afterPack.js](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/afterPack.js)

 [package.json L11-L89](https://github.com/edrlab/thorium-reader/blob/02b67755/package.json#L11-L89)

## Summary

Thorium Reader's architecture follows modern patterns for Electron applications:

1. **Process Separation**: Clear separation between main and renderer processes
2. **Dependency Injection**: Decoupled components managed by InversifyJS
3. **Redux State Management**: Consistent state handling with Redux and Redux Saga
4. **Custom Protocol Handling**: Direct publication serving without HTTP server
5. **Component-Based UI**: React components for modular interface design

This architecture enables the application to provide a responsive reading experience while handling various publication formats and DRM schemes.

Sources: [src/main.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main.ts)

 [src/main/di.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/di.ts)

 [src/common/streamerProtocol.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/streamerProtocol.ts)