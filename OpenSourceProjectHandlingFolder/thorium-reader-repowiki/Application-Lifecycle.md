# Application Lifecycle

> **Relevant source files**
> * [scripts/afterPack.js](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/afterPack.js)
> * [scripts/go-ts-checker-webpack-plugin.js](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/go-ts-checker-webpack-plugin.js)
> * [src/main/pdf/extract.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/pdf/extract.ts)
> * [src/main/redux/sagas/api/publication/export.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/api/publication/export.ts)
> * [src/main/redux/sagas/app.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts)
> * [src/main/redux/sagas/win/browserWindow/createLibraryWindow.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/browserWindow/createLibraryWindow.ts)
> * [src/main/redux/sagas/win/browserWindow/createReaderWindow.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/browserWindow/createReaderWindow.ts)
> * [src/main/redux/sagas/win/library.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/library.ts)
> * [src/main/streamer/streamerNoHttp.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/streamer/streamerNoHttp.ts)
> * [src/preprocessor-directives.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/preprocessor-directives.ts)
> * [src/renderer/reader/pdf/driver.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/pdf/driver.ts)
> * [tsconfig-cli.json](https://github.com/edrlab/thorium-reader/blob/02b67755/tsconfig-cli.json)
> * [tsconfig.json](https://github.com/edrlab/thorium-reader/blob/02b67755/tsconfig.json)
> * [typings.d.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/typings.d.ts)
> * [webpack.config-preprocessor-directives.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config-preprocessor-directives.js)
> * [webpack.config.js](https://github.com/edrlab/thorium-reader/blob/02b67755/webpack.config.js)

This document explains the complete lifecycle of the Thorium Reader application, from initialization through normal operation to shutdown. It covers application startup processes, protocol handler registration, window management, accessibility support, and graceful shutdown procedures.

For information about the overall application architecture, see [Application Architecture](/edrlab/thorium-reader/1.1-application-architecture). For details about state management during the lifecycle, see [Redux Sagas](/edrlab/thorium-reader/6.2-redux-sagas).

## Application Initialization

The application initialization process is orchestrated by the `init()` function in the main process, which handles critical setup tasks before the application becomes ready for user interaction.

```mermaid
flowchart TD

START["Application Start"]
APP_READY["app.whenReady()"]
SETUP_ID["app.setAppUserModelId()"]
PROTO_HANDLERS["Register Protocol Handlers"]
DEV_TOOLS["Setup Dev Tools (dev mode)"]
CUSTOM_PROTO["Register Custom Protocols"]
DB_ABSORB["Absorb Database Data"]
I18N_INIT["Initialize i18n Locale"]
READY["Application Ready"]
OPDS_PROTO["opds://"]
THORIUM_PROTO["thorium://"]
FILEX_HANDLER["filex:// handler"]
STORE_HANDLER["store:// handler"]
PDF_HANDLER["pdfjs-extract:// handler"]
DEVICE_ID["deviceIdManager.absorbDBToJson()"]
LCP_DATA["lcpManager.absorbDBToJson()"]
COOKIE_JAR["absorbDBToJsonCookieJar()"]
OPDS_AUTH["absorbDBToJsonOpdsAuth()"]

START --> APP_READY
APP_READY --> SETUP_ID
SETUP_ID --> PROTO_HANDLERS
PROTO_HANDLERS --> DEV_TOOLS
DEV_TOOLS --> CUSTOM_PROTO
CUSTOM_PROTO --> DB_ABSORB
DB_ABSORB --> I18N_INIT
I18N_INIT --> READY
PROTO_HANDLERS --> OPDS_PROTO
PROTO_HANDLERS --> THORIUM_PROTO
CUSTOM_PROTO --> FILEX_HANDLER
CUSTOM_PROTO --> STORE_HANDLER
CUSTOM_PROTO --> PDF_HANDLER
DB_ABSORB --> DEVICE_ID
DB_ABSORB --> LCP_DATA
DB_ABSORB --> COOKIE_JAR
DB_ABSORB --> OPDS_AUTH
```

Sources: [src/main/redux/sagas/app.ts L41-L279](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts#L41-L279)

### Protocol Handler Registration

The application registers as the default handler for specific URL schemes to enable deep linking functionality. The registration process differs between development and production modes.

| Protocol Scheme | Purpose | Handler Function |
| --- | --- | --- |
| `opds://` | OPDS catalog links | Built-in Electron handler |
| `thorium://` | Thorium-specific deep links | Built-in Electron handler |
| `filex://` | Local file access | `protocolHandler_FILEX` |
| `store://` | Publication storage access | `protocolHandler_Store` |
| `pdfjs-extract://` | PDF content extraction | `protocolHandler_PDF` |

The protocol handlers are registered using Electron's `protocol.handle()` API:

Sources: [src/main/redux/sagas/app.ts L45-L68](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts#L45-L68)

 [src/main/redux/sagas/app.ts L131-L217](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts#L131-L217)

### Database Initialization

During startup, the application absorbs persistent data from various database sources to restore application state:

```mermaid
flowchart TD

INIT["init()"]
DEVICE["deviceIdManager.absorbDBToJson()"]
LCP["lcpManager.absorbDBToJson()"]
COOKIES["absorbDBToJsonCookieJar()"]
OPDS_AUTH["absorbDBToJsonOpdsAuth()"]
DI_DEVICE["Device ID Manager"]
DI_LCP["LCP Manager"]
FETCH_PERSISTENCE["Fetch Cookie Persistence"]
HTTP_AUTH["HTTP Authentication"]

INIT --> DEVICE
INIT --> LCP
INIT --> COOKIES
INIT --> OPDS_AUTH
DEVICE --> DI_DEVICE
LCP --> DI_LCP
COOKIES --> FETCH_PERSISTENCE
OPDS_AUTH --> HTTP_AUTH
```

Sources: [src/main/redux/sagas/app.ts L220-L236](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts#L220-L236)

## Window Lifecycle Management

The application manages multiple window types through dedicated creation and lifecycle sagas. Each window type has specific initialization requirements and lifecycle events.

### Library Window Creation

The library window serves as the main application interface for publication management:

```mermaid
flowchart TD

CREATE_REQ["winActions.library.openRequest"]
CREATE_WIN["createLibraryWindow()"]
NEW_BROWSER["new BrowserWindow()"]
WEB_PREFS["Configure webPreferences"]
REGISTER["winActions.session.registerLibrary"]
LOAD_URL["loadURL(rendererBaseUrl)"]
DID_FINISH["did-finish-load event"]
SUCCESS["winActions.library.openSucess"]
SET_MENU["setMenu(libWindow, false)"]

CREATE_REQ --> CREATE_WIN
CREATE_WIN --> NEW_BROWSER
NEW_BROWSER --> WEB_PREFS
WEB_PREFS --> REGISTER
REGISTER --> LOAD_URL
LOAD_URL --> DID_FINISH
DID_FINISH --> SUCCESS
SUCCESS --> SET_MENU
```

Sources: [src/main/redux/sagas/win/browserWindow/createLibraryWindow.ts L38-L179](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/browserWindow/createLibraryWindow.ts#L38-L179)

### Reader Window Creation

Reader windows are created for individual publication reading sessions:

```mermaid
flowchart TD

OPEN_REQ["winActions.reader.openRequest"]
CREATE_READER["createReaderWindow()"]
NEW_WIN["new BrowserWindow()"]
GET_PUB["getPublication()"]
REGISTER_READER["winActions.session.registerReader"]
SAVE_DI["saveReaderWindowInDi()"]
TRACK["trackBrowserWindow()"]
LOAD_URL["loadURL(readerUrl)"]
READER_SUCCESS["winActions.reader.openSucess"]

OPEN_REQ --> CREATE_READER
CREATE_READER --> NEW_WIN
NEW_WIN --> GET_PUB
GET_PUB --> REGISTER_READER
REGISTER_READER --> SAVE_DI
SAVE_DI --> TRACK
TRACK --> LOAD_URL
LOAD_URL --> READER_SUCCESS
```

Sources: [src/main/redux/sagas/win/browserWindow/createReaderWindow.ts L33-L151](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/browserWindow/createReaderWindow.ts#L33-L151)

## Accessibility Support

The application provides comprehensive accessibility support through system integration and event handling:

```mermaid
flowchart TD

ACC_EVENT["accessibility-support-changed"]
GET_WINDOWS["Get All Windows"]
LIB_WIN["Library Window"]
READER_WINS["Reader Windows"]
SEND_LIB["webContents.send()"]
SEND_READERS["webContents.send()"]
IPC_QUERY["accessibility-support-query"]
QUERY_STATE["app.accessibilitySupportEnabled"]
SEND_RESPONSE["sender.send()"]

ACC_EVENT --> GET_WINDOWS
GET_WINDOWS --> LIB_WIN
GET_WINDOWS --> READER_WINS
LIB_WIN --> SEND_LIB
READER_WINS --> SEND_READERS
IPC_QUERY --> QUERY_STATE
QUERY_STATE --> SEND_RESPONSE
```

The accessibility system handles two main events:

* `accessibility-support-changed`: Broadcasts accessibility state changes to all windows
* `accessibility-support-query`: Responds to accessibility support queries from renderers

Sources: [src/main/redux/sagas/app.ts L81-L125](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts#L81-L125)

## Application Shutdown

The shutdown process ensures data persistence and clean resource disposal through a coordinated sequence of operations:

```mermaid
flowchart TD

BEFORE_QUIT["before-quit event"]
PREVENT["e.preventDefault()"]
CLOSE_LIB["closeLibWinAndExit()"]
WIN_CLOSED["window-all-closed event"]
CLOSE_PROCESS["closeProcess()"]
CLEAR_SESSIONS["clearSessions()"]
PERSIST_COOKIES["fetchCookieJarPersistence()"]
PERSIST_STATE["needToPersistFinalState()"]
STOP_STREAMER["streamerActions.stopRequest"]
TIMEOUT["30s timeout race"]
EXIT_NOW["app.exit(0)"]

BEFORE_QUIT --> PREVENT
PREVENT --> CLOSE_LIB
CLOSE_LIB --> WIN_CLOSED
WIN_CLOSED --> CLOSE_PROCESS
CLOSE_PROCESS --> CLEAR_SESSIONS
CLOSE_PROCESS --> PERSIST_COOKIES
CLOSE_PROCESS --> PERSIST_STATE
CLOSE_PROCESS --> STOP_STREAMER
CLEAR_SESSIONS --> TIMEOUT
PERSIST_COOKIES --> TIMEOUT
PERSIST_STATE --> TIMEOUT
STOP_STREAMER --> TIMEOUT
TIMEOUT --> EXIT_NOW
```

### Shutdown Sequence

The shutdown process follows a strict sequence to ensure data integrity:

1. **Event Prevention**: The `before-quit` event is prevented to allow controlled shutdown
2. **Window Closure**: Library and reader windows are closed appropriately
3. **Resource Cleanup**: Sessions, cookies, and state are persisted
4. **Service Shutdown**: The streamer service is gracefully stopped
5. **Force Exit**: A 30-second timeout ensures the process terminates

Sources: [src/main/redux/sagas/app.ts L340-L464](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts#L340-L464)

 [src/main/redux/sagas/app.ts L281-L338](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts#L281-L338)

### Session Management During Shutdown

The application handles session persistence differently based on user preferences:

```mermaid
flowchart TD

CLOSE_EVENT["Library Window Close"]
CHECK_READERS["Check Reader Windows"]
SESSION_ENABLED["Session Save Enabled?"]
DESTROY_READERS["reader.destroy()"]
CLOSE_READERS["reader.close()"]
DESTROY_LIB["library.destroy()"]
WAIT_CLOSE["Wait for Readers to Close"]
DESTROY_LIB_DELAYED["library.destroy() (delayed)"]

CLOSE_EVENT --> CHECK_READERS
CHECK_READERS --> SESSION_ENABLED
SESSION_ENABLED --> DESTROY_READERS
SESSION_ENABLED --> CLOSE_READERS
DESTROY_READERS --> DESTROY_LIB
CLOSE_READERS --> WAIT_CLOSE
WAIT_CLOSE --> DESTROY_LIB_DELAYED
```

Sources: [src/main/redux/sagas/win/library.ts L191-L293](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/library.ts#L191-L293)

## PDF Renderer Lifecycle

The PDF renderer has a specialized lifecycle for handling PDF documents through a dedicated webview:

```mermaid
flowchart TD

PDF_MOUNT["pdfMount()"]
CREATE_WEBVIEW["document.createElement('webview')"]
SET_ATTRS["Set webview attributes"]
SET_PRELOAD["Set preload script"]
SET_SRC["Set PDF viewer URL"]
APPEND["publicationViewport.append()"]
DID_FINISH["did-finish-load event"]
START_EVENT["eventBus.dispatch('start')"]

PDF_MOUNT --> CREATE_WEBVIEW
CREATE_WEBVIEW --> SET_ATTRS
SET_ATTRS --> SET_PRELOAD
SET_PRELOAD --> SET_SRC
SET_SRC --> APPEND
APPEND --> DID_FINISH
DID_FINISH --> START_EVENT
```

The PDF renderer uses a custom event bus system for communication between the main renderer and the PDF webview.

Sources: [src/renderer/reader/pdf/driver.ts L75-L165](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/reader/pdf/driver.ts#L75-L165)

## Development vs Production Differences

The application lifecycle varies between development and production environments:

| Aspect | Development | Production |
| --- | --- | --- |
| Protocol Registration | Uses `electronPath` and `appPath` parameters | Direct registration without parameters |
| DevTools | Automatic installation of React/Redux DevTools | DevTools disabled |
| URL Loading | HTTP servers for hot reload | `filex://` protocol for local files |
| Debug Output | Extensive logging enabled | Minimal logging |

Sources: [src/main/redux/sagas/app.ts L49-L68](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/app.ts#L49-L68)

 [src/main/redux/sagas/win/browserWindow/createLibraryWindow.ts L84-L95](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/win/browserWindow/createLibraryWindow.ts#L84-L95)