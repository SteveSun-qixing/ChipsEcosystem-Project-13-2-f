# Overview

> **Relevant source files**
> * [.nvmrc](https://github.com/edrlab/thorium-reader/blob/02b67755/.nvmrc)
> * [README.md](https://github.com/edrlab/thorium-reader/blob/02b67755/README.md?plain=1)
> * [scripts/package-ci-patch.js](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/package-ci-patch.js)

## Purpose and Scope

This document provides a high-level overview of Thorium Reader, an open-source EPUB and audiobook reading application built on Electron. It covers the application's architecture, core technologies, and major system components. For detailed information about specific subsystems, see the [Application Architecture](/edrlab/thorium-reader/1.1-application-architecture), [Build & Deployment](/edrlab/thorium-reader/1.2-build-and-deployment), [Reader System](/edrlab/thorium-reader/2-reader-system), [Library System](/edrlab/thorium-reader/3-library-system), [State Management](/edrlab/thorium-reader/6-state-management), and [Internationalization](/edrlab/thorium-reader/7-internationalization) pages.

## Application Overview

Thorium Reader is a cross-platform desktop application that enables users to read EPUB publications, audiobooks, and PDF files. It provides accessibility features for visually impaired users, supports DRM-protected content via LCP (Licensed Content Protection), and integrates with OPDS (Open Publication Distribution System) catalogs for content discovery.

**Key Features:**

* Multi-format support (EPUB, audiobook, PDF)
* Accessibility compliance (NVDA, JAWS, Narrator)
* LCP DRM support for protected content
* OPDS catalog integration
* Internationalization support for 28+ languages
* Annotation and bookmark management
* Text-to-speech and media overlay support

Sources: [README.md L1-L52](https://github.com/edrlab/thorium-reader/blob/02b67755/README.md?plain=1#L1-L52)

## Architecture Overview

Thorium Reader follows a multi-process Electron architecture with three main components:

```mermaid
flowchart TD

MP["main process<br>(Node.js backend)"]
DI["dependency injection<br>src/main/di.ts"]
API["17 API endpoints<br>src/main/redux/sagas/api"]
LW["library window<br>(Chromium renderer)"]
LC["library controller<br>Redux + Saga"]
LV["library view<br>React components"]
RW["reader window(s)<br>(Chromium renderer)"]
RC["reader controller<br>Redux + Saga"]
RV["reader view<br>React components"]

MP --> LW
MP --> RW

subgraph subGraph2 ["Reader Renderer(s)"]
    RW
    RC
    RV
    RC --> RV
end

subgraph subGraph1 ["Library Renderer"]
    LW
    LC
    LV
    LC --> LV
end

subgraph subGraph0 ["Main Process"]
    MP
    DI
    API
    MP --> DI
    DI --> API
end
```

**Process Architecture**

* **Main Process**: Node.js backend handling file system operations, publication management, and API endpoints
* **Library Renderer**: Publication management interface with grid/list views and import functionality
* **Reader Renderer(s)**: Reading interface with navigation, settings, and annotation features

Sources: [README.md L135-L151](https://github.com/edrlab/thorium-reader/blob/02b67755/README.md?plain=1#L135-L151)

## Core Technologies

| Technology | Purpose | Key Components |
| --- | --- | --- |
| **Electron** | Cross-platform desktop framework | Main process, renderer processes, IPC |
| **TypeScript** | Type-safe JavaScript development | All source code with strict typing |
| **React** | UI component library | Class components with Redux integration |
| **Redux** | State management | Centralized application state |
| **Redux-Saga** | Side effect management | Async operations and application logic |
| **i18next** | Internationalization | 28+ language translations |
| **Webpack** | Module bundling | Separate configs for main/renderer processes |

Sources: [README.md L61-L69](https://github.com/edrlab/thorium-reader/blob/02b67755/README.md?plain=1#L61-L69)

## System Components

The application is organized into several major subsystems:

```mermaid
flowchart TD

PUB["Publication Service<br>src/main/services/publication"]
LCP["LCP Manager<br>Licensed Content Protection"]
OPDS["OPDS Service<br>Catalog integration"]
STREAM["Streamer Service<br>Content serving"]
STORE["Redux Store<br>Application state"]
SAGA["Root Saga<br>src/main/redux/sagas"]
PERSIST["State Persistence<br>RFC6902 patches"]
R2["R2 Readium<br>Publication parsing"]
IMPORT["Import Pipeline<br>File system operations"]
SEARCH["Search Engine<br>Full-text indexing"]
LIBRARY["Library Interface<br>Publication management"]
READER["Reader Interface<br>Reading experience"]
DIALOGS["Dialog System<br>Modal interfaces"]

PUB --> IMPORT
STREAM --> R2
SAGA --> PUB
SAGA --> LCP
SAGA --> OPDS
IMPORT --> STORE
STORE --> LIBRARY
STORE --> READER

subgraph subGraph3 ["UI Components"]
    LIBRARY
    READER
    DIALOGS
    LIBRARY --> DIALOGS
    READER --> DIALOGS
end

subgraph subGraph2 ["Content Processing"]
    R2
    IMPORT
    SEARCH
    R2 --> SEARCH
end

subgraph subGraph1 ["State Management"]
    STORE
    SAGA
    PERSIST
    STORE --> SAGA
    SAGA --> PERSIST
end

subgraph subGraph0 ["Core Services"]
    PUB
    LCP
    OPDS
    STREAM
    LCP --> PUB
    OPDS --> PUB
end
```

Sources: [README.md L174-L198](https://github.com/edrlab/thorium-reader/blob/02b67755/README.md?plain=1#L174-L198)

## API Architecture

The application uses an RPC-style API system for communication between processes:

**API Categories:**

* **Library APIs**: Publication management (get, delete, findAll, search, import)
* **OPDS APIs**: Feed management (getFeed, addFeed, deleteFeed, browse)
* **Browser APIs**: HTTP browsing and OPDS parsing
* **Publication APIs**: Metadata operations and file system operations

The API system encapsulates Redux actions and reducers, providing a structured interface for inter-process communication through Electron's IPC mechanism.

Sources: [README.md L160-L198](https://github.com/edrlab/thorium-reader/blob/02b67755/README.md?plain=1#L160-L198)

## State Management Architecture

```mermaid
flowchart TD

AUTH["auth actions<br>OPDS authentication"]
CATALOG["catalog actions<br>Library state"]
DIALOG["dialog actions<br>Modal management"]
READER_A["reader actions<br>Reading state"]
LCP_A["lcp actions<br>License management"]
MAIN_R["main reducers<br>Backend state"]
LIB_R["library reducers<br>UI state"]
READ_R["reader reducers<br>Reading state"]
API_S["api sagas<br>RPC handling"]
PUB_S["publication sagas<br>File operations"]
LCP_S["lcp sagas<br>License operations"]
READER_S["reader sagas<br>Window management"]

AUTH --> MAIN_R
CATALOG --> LIB_R
DIALOG --> LIB_R
READER_A --> READ_R
LCP_A --> MAIN_R
MAIN_R --> API_S
LIB_R --> PUB_S
READ_R --> READER_S

subgraph Sagas ["Sagas"]
    API_S
    PUB_S
    LCP_S
    READER_S
    API_S --> LCP_S
end

subgraph Reducers ["Reducers"]
    MAIN_R
    LIB_R
    READ_R
end

subgraph Actions ["Actions"]
    AUTH
    CATALOG
    DIALOG
    READER_A
    LCP_A
end
```

The Redux architecture spans all processes with synchronized state through IPC middleware, enabling consistent application behavior across the main process and multiple renderer windows.

Sources: [README.md L200-L259](https://github.com/edrlab/thorium-reader/blob/02b67755/README.md?plain=1#L200-L259)

## Build and Development

**Development Commands:**

* `npm run start:dev` - Development mode with hot reload
* `npm run start:dev:quick` - Skip TypeScript checks for faster startup
* `npm start` - Production mode

**Build Targets:**

* `npm run package:win` - Windows installer
* `npm run package:mac` - macOS installer
* `npm run package:linux` - Linux installer

The build system uses separate Webpack configurations for different processes and supports cross-platform compilation with native module handling.

Sources: [README.md L72-L91](https://github.com/edrlab/thorium-reader/blob/02b67755/README.md?plain=1#L72-L91)