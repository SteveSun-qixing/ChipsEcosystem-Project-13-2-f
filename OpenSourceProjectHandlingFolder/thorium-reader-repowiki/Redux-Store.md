# Redux Store

> **Relevant source files**
> * [src/main/redux/actions/publication/addPublication.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/actions/publication/addPublication.ts)
> * [src/main/redux/middleware/persistence.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts)
> * [src/main/redux/sagas/patch.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/patch.ts)
> * [src/main/redux/sagas/persist.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/persist.ts)
> * [src/main/redux/store/memory.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts)
> * [src/typings/lunr.d.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/lunr.d.ts)

This document details the Redux store implementation in Thorium Reader, which serves as the central state management system for the entire application across both the main Electron process and renderer processes. The Redux store coordinates state across processes, manages state persistence to disk, and provides recovery mechanisms for application state.

For information about asynchronous operations with Redux Sagas, see [Redux Sagas](/edrlab/thorium-reader/6.2-redux-sagas). For state persistence details, see [State Persistence](/edrlab/thorium-reader/6.3-state-persistence). For information about inter-process communication, see [Inter-Process Communication](/edrlab/thorium-reader/6.4-inter-process-communication).

## Overview

Thorium Reader implements a Redux-based state management system that handles the complex requirements of an Electron application with multiple windows. The store is initialized in the main process through `initStore()` and synchronized with renderer processes through custom middleware.

### Redux Store Architecture

```mermaid
flowchart TD

initStore["initStore()"]
createStore["legacy_createStore"]
rootReducer["rootReducer"]
preloadedState["preloadedState: PersistRootState"]
middleware["applyMiddleware()"]
reduxSyncMiddleware["reduxSyncMiddleware"]
sagaMiddleware["createSagaMiddleware()"]
reduxPersistMiddleware["reduxPersistMiddleware"]
stateFilePath["stateFilePath<br>(state.json)"]
patchFilePath["patchFilePath<br>(patch.json)"]
runtimeStateFilePath["runtimeStateFilePath<br>(runtime-state.json)"]
memoryLoggerFilename["memoryLoggerFilename<br>(memory.log)"]
createPatch["createPatch()<br>RFC6902"]
patchChannel["patchChannel"]
persistSaga["persist.saga()"]
needToPersistPatch["needToPersistPatch()"]
BrowserWindow["BrowserWindow.webContents"]
LibraryRenderer["Library Renderer"]
ReaderRenderer["Reader Renderer"]
sagaMiddlewareRun["sagaMiddleware.run(rootSaga)"]

initStore --> createStore
reduxPersistMiddleware --> createPatch
reduxSyncMiddleware --> BrowserWindow
initStore --> sagaMiddlewareRun
stateFilePath --> preloadedState
patchFilePath --> preloadedState
runtimeStateFilePath --> preloadedState

subgraph subGraph4 ["IPC Synchronization"]
    BrowserWindow
    LibraryRenderer
    ReaderRenderer
    BrowserWindow --> LibraryRenderer
    BrowserWindow --> ReaderRenderer
end

subgraph subGraph3 ["Persistence System"]
    createPatch
    patchChannel
    persistSaga
    needToPersistPatch
    createPatch --> patchChannel
    patchChannel --> persistSaga
    persistSaga --> needToPersistPatch
end

subgraph subGraph2 ["State Files"]
    stateFilePath
    patchFilePath
    runtimeStateFilePath
    memoryLoggerFilename
end

subgraph subGraph1 ["Redux Store Components"]
    createStore
    rootReducer
    preloadedState
    createStore --> rootReducer
    createStore --> preloadedState
    createStore --> middleware

subgraph subGraph0 ["Middleware Stack"]
    middleware
    reduxSyncMiddleware
    sagaMiddleware
    reduxPersistMiddleware
    middleware --> reduxSyncMiddleware
    middleware --> sagaMiddleware
    middleware --> reduxPersistMiddleware
end
end
```

Sources: [src/main/redux/store/memory.ts L99-L474](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L99-L474)

 [src/main/redux/middleware/persistence.ts L18-L92](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts#L18-L92)

 [src/main/redux/middleware/sync.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/sync.ts)

</old_str>

<old_str>

## State Structure and Persistence

The Redux state follows a strict separation between runtime state (`RootState`) and persistable state (`PersistRootState`). State persistence uses RFC6902 JSON patches for efficient incremental updates.

### State Architecture

```mermaid
flowchart TD

persistTheme["theme"]
persistWin["win"]
persistPublication["publication.db<br>publication.lastReadingQueue<br>publication.readingFinishedQueue"]
persistReader["reader"]
persistSession["session"]
persistI18n["i18n"]
persistOpds["opds"]
persistVersion["version"]
persistWizard["wizard"]
persistSettings["settings"]
persistCreator["creator"]
persistNoteExport["noteExport"]
catalog["catalog: OpdsFeedDocument[]"]
lastReadingQueue["lastReadingQueue: TPQueueState"]
readingFinishedQueue["readingFinishedQueue: TPQueueState"]
db["db: IDictPublicationState"]
readerRegistry["reader: IDictWinRegistryReaderState"]
library["library: IWinSessionLibraryState"]
readerSession["reader: IDictWinSessionReaderState"]
defaultConfig["defaultConfig: ReaderConfig"]
disableRTLFlip["disableRTLFlip: IDisableRTLFLip"]
versionUpdate["versionUpdate?: ICommonVersionUpdate"]
theme["theme: ThemeState"]
session["session: ISessionState"]
streamer["streamer: StreamerState"]
i18n["i18n: I18NState"]
app["app: AppState"]
mode["mode: ReaderMode"]
lcp["lcp: ILCPState"]
keyboard["keyboard: IKeyboardState"]
version["version: string"]
wizard["wizard: IWizardState"]
settings["settings: ISettingsState"]
creator["creator: ICreator"]
noteExport["noteExport: INoteExportState"]
RootState["RootState"]
PersistRootState["PersistRootState"]

RootState --> PersistRootState

subgraph subGraph7 ["PersistRootState (Persisted)"]
    persistTheme
    persistWin
    persistPublication
    persistReader
    persistSession
    persistI18n
    persistOpds
    persistVersion
    persistWizard
    persistSettings
    persistCreator
    persistNoteExport
end

subgraph subGraph6 ["RootState Interface"]
    versionUpdate
    theme
    session
    streamer
    i18n
    app
    mode
    lcp
    keyboard
    version
    wizard
    settings
    creator
    noteExport

subgraph subGraph5 ["opds: IOPDSState"]
    catalog
end

subgraph subGraph4 ["publication: IPublicationState"]
    lastReadingQueue
    readingFinishedQueue
    db
end

subgraph subGraph3 ["win: IWinState"]

subgraph subGraph2 ["registry: IWinRegistryState"]
    readerRegistry
end

subgraph subGraph1 ["session: IWinSessionState"]
    library
    readerSession
end
end

subgraph subGraph0 ["reader: IReaderState"]
    defaultConfig
    disableRTLFlip
end
end
```

### State Persistence Mechanism

The persistence system creates a filtered version of the state that excludes runtime-only data:

```javascript
// From reduxPersistMiddlewareconst persistPrevState: PersistRootState = {    theme: prevState.theme,    win: prevState.win,    reader: prevState.reader,    i18n: prevState.i18n,    session: prevState.session,    publication: {        db: prevState.publication.db,        lastReadingQueue: prevState.publication.lastReadingQueue,        readingFinishedQueue: prevState.publication.readingFinishedQueue,    },    opds: prevState.opds,    version: prevState.version,    wizard: prevState.wizard,    settings: prevState.settings,    creator: prevState.creator,    noteExport: prevState.noteExport,};
```

### State Migration and Data Transformation

The `initStore()` function includes extensive migration logic for backwards compatibility:

| Migration | Purpose | Data Transformation |
| --- | --- | --- |
| **LocatorExtended cleanup** | Remove memory-heavy properties | Removes `followingElementIDs`, converts `rangeInfo` to `caretInfo` |
| **Bookmark to Note migration** | Consolidate annotation systems | Converts `bookmark[]` to `note[]` with `EDrawType.bookmark` |
| **Annotation to Note migration** | Consolidate annotation systems | Converts `annotation[]` to `note[]` with draw type mapping |
| **Color normalization** | Ensure color consistency | Applies `NOTE_DEFAULT_COLOR_OBJ` to bookmarks without colors |
| **Creator URN migration** | Add URN identifiers | Generates `urn:uuid:${id}` for creator objects |

Sources: [src/main/redux/store/memory.ts L247-L447](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L247-L447)

 [src/main/redux/middleware/persistence.ts L29-L67](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts#L29-L67)

 [src/main/redux/states/index.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/states/index.ts)

</old_str>
<new_str>

### Four-Level State Recovery System

The `initStore()` function implements a sophisticated four-level recovery system to handle state corruption gracefully. Each level provides increasing fallback options to ensure application stability.

| Recovery Level | Method | Description | Data Loss Risk |
| --- | --- | --- | --- |
| **Level 1** | `checkReduxState()` + `recoveryReduxState()` | Runtime state + patches validated against current state | None |
| **Level 2** | `test()` on loaded state | Use potentially corrupted `state.json` if basic validation passes | Minimal |
| **Level 3** | `recoveryReduxState()` only | Apply patches to runtime state without validation | Low |
| **Level 4** | `runtimeState()` only | Use previous runtime snapshot without patches | **High** |

### State Recovery Flow

```mermaid
flowchart TD

initStore["initStore()"]
readStateFile["fsp.readFile(stateFilePath)"]
parseJSON["JSON.parse(jsonStr)"]
testState["test(json)"]
loadedState["reduxState = json"]
tryRecovery["Try Recovery System"]
level1["Recovery Level 1/4"]
runtimeState["await runtimeState()"]
recoveryReduxState["await recoveryReduxState()"]
checkReduxState["await checkReduxState()"]
recoveryLevel1Success["RECOVERY WORKS lvl 1/4"]
level2["Recovery Level 2/4"]
testReduxState["test(reduxState)"]
recoveryLevel2Success["RECOVERY WORKS lvl 2/4"]
level3["Recovery Level 3/4"]
runtimeStateFirst["await runtimeState()"]
testRuntimeFirst["test(stateRawFirst)"]
recoveryReduxState2["await recoveryReduxState()"]
testRecovered["test(stateRaw)"]
recoveryLevel3Success["RECOVERY WORKS lvl 3/4"]
level4["Recovery Level 4/4"]
runtimeStateSecond["await runtimeState()"]
testRuntimeSecond["test(stateRawFirst)"]
recoveryLevel4Success["RECOVERY WORKS 4/4<br>⚠️ Data loss possible"]
recoveryFailed["RECOVERY FAILED<br>State not erased for security"]
createBackup["backupStateFilePathFn()"]
writeRuntimeState["fsp.writeFile(runtimeStateFilePath)"]
clearPatchFile["fsp.writeFile(patchFilePath, '')"]
setupMiddleware["Setup middleware and create store"]

initStore --> readStateFile
readStateFile --> parseJSON
parseJSON --> testState
testState --> loadedState
testState --> tryRecovery
readStateFile --> tryRecovery
tryRecovery --> level1
level1 --> runtimeState
runtimeState --> recoveryReduxState
recoveryReduxState --> checkReduxState
checkReduxState --> recoveryLevel1Success
checkReduxState --> level2
level2 --> testReduxState
testReduxState --> recoveryLevel2Success
testReduxState --> level3
level3 --> runtimeStateFirst
runtimeStateFirst --> testRuntimeFirst
testRuntimeFirst --> recoveryReduxState2
recoveryReduxState2 --> testRecovered
testRecovered --> recoveryLevel3Success
testRecovered --> level4
level4 --> runtimeStateSecond
runtimeStateSecond --> testRuntimeSecond
testRuntimeSecond --> recoveryLevel4Success
testRuntimeSecond --> recoveryFailed
loadedState --> createBackup
recoveryLevel1Success --> createBackup
recoveryLevel2Success --> createBackup
recoveryLevel3Success --> createBackup
recoveryLevel4Success --> createBackup
recoveryFailed --> createBackup
createBackup --> writeRuntimeState
writeRuntimeState --> clearPatchFile
clearPatchFile --> setupMiddleware
```

Sources: [src/main/redux/store/memory.ts L106-L214](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L106-L214)

 [src/main/redux/store/memory.ts L45-L96](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L45-L96)

</old_str>

<old_str>

### Persistence Middleware Implementation

The `reduxPersistMiddleware` uses RFC6902 JSON patches to efficiently track and persist state changes. It operates between action dispatches to capture before/after state snapshots.

```mermaid
sequenceDiagram
  participant Redux Action
  participant reduxPersistMiddleware
  participant next() middleware
  participant createPatch()
  participant patchChannel
  participant Redux Store

  Redux Action->>reduxPersistMiddleware: "Incoming action"
  reduxPersistMiddleware->>reduxPersistMiddleware: "store.getState() → prevState"
  reduxPersistMiddleware->>next() middleware: "Pass action to next middleware"
  next() middleware-->>reduxPersistMiddleware: "Return value"
  reduxPersistMiddleware->>reduxPersistMiddleware: "store.getState() → nextState"
  reduxPersistMiddleware->>reduxPersistMiddleware: "Extract PersistRootState from both states"
  reduxPersistMiddleware->>createPatch(): "createPatch(persistPrevState, persistNextState)"
  createPatch()-->>reduxPersistMiddleware: "Operation[] (RFC6902 patches)"
  loop ["For each operation"]
    reduxPersistMiddleware->>patchChannel: "patchChannel.put(operation)"
    reduxPersistMiddleware->>Redux Store: "dispatch(winActions.persistRequest.build(ops))"
  end
  reduxPersistMiddleware-->>Redux Action: "Return original return value"
```

### RFC6902 Patch Generation

The middleware creates JSON patches by comparing `persistPrevState` and `persistNextState`:

```javascript
const persistPrevState: PersistRootState = {    theme: prevState.theme,    win: prevState.win,    reader: prevState.reader,    // ... other persist-eligible state slices}; const persistNextState: PersistRootState = {    theme: nextState.theme,    win: nextState.win,     reader: nextState.reader,    // ... other persist-eligible state slices}; const ops = createPatch(persistPrevState, persistNextState);if (ops?.length) {    for (const o of ops) {        patchChannel.put(o);    }    store.dispatch(winActions.persistRequest.build(ops));}
```

Sources: [src/main/redux/middleware/persistence.ts L18-L92](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts#L18-L92)

 [src/main/redux/sagas/patch.ts L11](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/patch.ts#L11-L11)

</old_str>
<new_str>

### Middleware Configuration

The Redux store is configured with three core middleware components in a specific order:

| Order | Middleware | File | Purpose |
| --- | --- | --- | --- |
| 1 | `reduxSyncMiddleware` | `middleware/sync.ts` | Synchronizes actions to renderer processes via IPC |
| 2 | `sagaMiddleware` | `redux-saga` | Handles async operations and side effects |
| 3 | `reduxPersistMiddleware` | `middleware/persistence.ts` | Creates RFC6902 patches for state persistence |

### Middleware Stack Configuration

```mermaid
flowchart TD

applyMiddleware["applyMiddleware()"]
reduxSyncMiddleware["reduxSyncMiddleware<br>(Order: 1)"]
sagaMiddleware["createSagaMiddleware()<br>(Order: 2)"]
reduxPersistMiddleware["reduxPersistMiddleware<br>(Order: 3)"]
IS_DEV["TH__IS_DEV"]
remoteReduxDevTools["remote-redux-devtools<br>composeWithDevTools()"]
port["port: REDUX_REMOTE_DEVTOOLS_PORT<br>(7770)"]
mware["mware (production)"]
devMiddleware["middleware (development)"]
legacy_createStore["legacy_createStore()"]
rootReducer["rootReducer"]
preloadedState["preloadedState: Partial"]
middleware["middleware"]
sagaMiddlewareRun["sagaMiddleware.run()"]
rootSaga["rootSaga"]
store["Redux Store"]
returnStore["return [store, sagaMiddleware]"]

applyMiddleware --> reduxSyncMiddleware
applyMiddleware --> sagaMiddleware
applyMiddleware --> reduxPersistMiddleware
IS_DEV --> mware
remoteReduxDevTools --> devMiddleware
legacy_createStore --> store
store --> sagaMiddlewareRun
store --> returnStore

subgraph subGraph2 ["Saga Initialization"]
    sagaMiddlewareRun
    rootSaga
    sagaMiddlewareRun --> rootSaga
end

subgraph subGraph1 ["Store Creation"]
    mware
    devMiddleware
    legacy_createStore
    rootReducer
    preloadedState
    middleware
    legacy_createStore --> rootReducer
    legacy_createStore --> preloadedState
    legacy_createStore --> middleware
    middleware --> mware
    middleware --> devMiddleware
end

subgraph subGraph0 ["Development Mode"]
    IS_DEV
    remoteReduxDevTools
    port
    IS_DEV --> remoteReduxDevTools
    remoteReduxDevTools --> port
end
```

The middleware setup occurs after state recovery and migration logic:

```javascript
const sagaMiddleware = createSagaMiddleware();const mware = applyMiddleware(    reduxSyncMiddleware,    sagaMiddleware,     reduxPersistMiddleware,); const middleware = __TH__IS_DEV__ ?     require("remote-redux-devtools").composeWithDevTools({        port: REDUX_REMOTE_DEVTOOLS_PORT,    })(mware) : mware; const store = createStore(    rootReducer,    preloadedState as {},    middleware,); sagaMiddleware.run(rootSaga);
```

Sources: [src/main/redux/store/memory.ts L449-L472](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L449-L472)

## Store Initialization

The Redux store is initialized in the main process through the `initStore()` function, which handles state loading, recovery, and middleware setup.

### State Loading and Recovery

The store initialization process attempts to load the previous application state from disk with multiple fallback mechanisms:

1. Load the state from `state.json`
2. If that fails, try reconstructing the state from `runtime-state.json` plus patches from `patch.json`
3. If that fails, try using just the runtime state
4. If all recovery attempts fail, start with a fresh state

This multi-layered approach provides resilience against state corruption.

```mermaid
flowchart TD

Start["initStore()"]
LoadState["Attempt to load state<br>from state.json"]
StateLoaded["State loaded<br>successfully?"]
ValidateState["Validate state against<br>runtime state"]
TryRecovery["Try recovery from<br>runtime state + patches"]
ValidationSuccess["Validation<br>successful?"]
UseState["Use loaded state"]
RecoverySuccess["Recovery<br>successful?"]
UseRecoveredState["Use recovered state"]
TryRuntimeState["Try using just<br>runtime state"]
RuntimeStateSuccess["Runtime state<br>usable?"]
UseRuntimeState["Use runtime state"]
BackupState["Backup current state<br>and continue"]
InitializeStore["Initialize store with<br>preloaded state"]
SetupMiddleware["Setup Redux middleware"]
CreateStore["Create Redux store"]
StartSagas["Start root saga"]
End["Return store"]

Start --> LoadState
LoadState --> StateLoaded
StateLoaded --> ValidateState
StateLoaded --> TryRecovery
ValidateState --> ValidationSuccess
ValidationSuccess --> UseState
ValidationSuccess --> TryRecovery
TryRecovery --> RecoverySuccess
RecoverySuccess --> UseRecoveredState
RecoverySuccess --> TryRuntimeState
TryRuntimeState --> RuntimeStateSuccess
RuntimeStateSuccess --> UseRuntimeState
RuntimeStateSuccess --> BackupState
UseState --> InitializeStore
UseRecoveredState --> InitializeStore
UseRuntimeState --> InitializeStore
BackupState --> InitializeStore
InitializeStore --> SetupMiddleware
SetupMiddleware --> CreateStore
CreateStore --> StartSagas
StartSagas --> End
```

Sources: [src/main/redux/store/memory.ts L99-L474](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L99-L474)

### Middleware Configuration

The store is configured with three middleware components:

1. **Redux Sync Middleware**: Synchronizes actions between main and renderer processes
2. **Redux Saga Middleware**: Handles asynchronous operations
3. **Redux Persist Middleware**: Manages state persistence to disk

In development mode, the store also includes Redux DevTools integration.

```javascript
// Store middleware setup (simplified)const sagaMiddleware = createSagaMiddleware();const mware = applyMiddleware(    reduxSyncMiddleware,    sagaMiddleware,    reduxPersistMiddleware,);const middleware = IS_DEV ?     require("remote-redux-devtools").composeWithDevTools({ port: REDUX_REMOTE_DEVTOOLS_PORT })(mware)     : mware; const store = createStore(    rootReducer,    preloadedState as {},    middleware,); sagaMiddleware.run(rootSaga);
```

Sources: [src/main/redux/store/memory.ts L450-L473](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L450-L473)

## State Persistence System

The Redux store uses a dual-persistence system combining complete state snapshots with incremental RFC6902 patches. This provides both efficiency and recovery capabilities.

### Persistence Architecture

```mermaid
flowchart TD

reduxPersistMiddleware["reduxPersistMiddleware"]
createPatch["createPatch(prevState, nextState)"]
rfc6902Operations["Operation[] (RFC6902)"]
patchChannel["patchChannel.put(operation)"]
persistRequest["winActions.persistRequest.build()"]
debounce["debounce(DEBOUNCE_TIME, persistRequest.ID)"]
needToPersistPatch["needToPersistPatch()"]
appShutdown["App Shutdown"]
needToPersistFinalState["needToPersistFinalState()"]
flushTyped["flush(patchChannel)"]
appendFile["fsp.appendFile(patchFilePath)"]
persistStateToFs["persistStateToFs()"]
writeFile["fsp.writeFile(stateFilePath)"]
stateFilePath["stateFilePath<br>(state.json)<br>Complete state snapshot"]
patchFilePath["patchFilePath<br>(patch.json)<br>Incremental RFC6902 patches"]
runtimeStateFilePath["runtimeStateFilePath<br>(runtime-state.json)<br>Runtime backup"]

persistRequest --> debounce
needToPersistPatch --> flushTyped
needToPersistFinalState --> persistStateToFs
appendFile --> patchFilePath
writeFile --> stateFilePath
writeFile --> runtimeStateFilePath

subgraph subGraph3 ["Persistence Files"]
    stateFilePath
    patchFilePath
    runtimeStateFilePath
end

subgraph subGraph2 ["File System Operations"]
    flushTyped
    appendFile
    persistStateToFs
    writeFile
    flushTyped --> appendFile
    persistStateToFs --> writeFile
end

subgraph subGraph1 ["Saga System"]
    debounce
    needToPersistPatch
    appShutdown
    needToPersistFinalState
    debounce --> needToPersistPatch
    appShutdown --> needToPersistFinalState
    needToPersistFinalState --> needToPersistPatch
end

subgraph subGraph0 ["Persistence Trigger"]
    reduxPersistMiddleware
    createPatch
    rfc6902Operations
    patchChannel
    persistRequest
    reduxPersistMiddleware --> createPatch
    createPatch --> rfc6902Operations
    rfc6902Operations --> patchChannel
    rfc6902Operations --> persistRequest
end
```

### Persistence Timing and Debouncing

| Event | Function | Timing | File Operations |
| --- | --- | --- | --- |
| **State Changes** | `reduxPersistMiddleware` | Immediate | Creates patches → `patchChannel` |
| **Patch Flush** | `needToPersistPatch()` | Debounced 3min | Appends to `patch.json` |
| **Full State Save** | `needToPersistFinalState()` | App shutdown | Writes complete `state.json` |

The debouncing mechanism prevents excessive I/O operations:

```javascript
const DEBOUNCE_TIME = 3 * 60 * 1000; // 3 minutes export function saga() {    return debounce(        DEBOUNCE_TIME,        winActions.persistRequest.ID,        needToPersistPatch,    );}
```

### Patch File Format

The `patch.json` file stores RFC6902 operations as a comma-separated list:

```javascript
export function* needToPersistPatch() {    const ops = yield* flushTyped(patchChannel);        let data = "";    let i = 0;    while (i < ops.length) {        data += JSON.stringify(ops[i]) + ",\n";        ++i;    }        if (data) {        yield call(() => fsp.appendFile(patchFilePath, data, { encoding: "utf8" }));    }}
```

During recovery, the patch file is processed by adding array brackets:

```javascript
const patchFileStr = "[" + patchFileStrRaw.slice(0, -2) + "]"; // remove the last commaconst patch = await tryCatch(() => JSON.parse(patchFileStr), "");const errors = applyPatch(runtimeState, patch);
```

Sources: [src/main/redux/sagas/persist.ts L19-L93](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/persist.ts#L19-L93)

 [src/main/redux/middleware/persistence.ts L69-L89](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts#L69-L89)

 [src/main/redux/store/memory.ts L63-L86](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L63-L86)

## Root Reducer

The root reducer combines multiple domain-specific reducers to form the complete state tree:

```mermaid
flowchart TD

catalog["catalog"]
lastReadingQueue["lastReadingQueue"]
readingFinishedQueue["readingFinishedQueue"]
db["db"]
reader2["reader"]
defaultConfig["defaultConfig"]
disableRTLFlip["disableRTLFlip"]
library["library"]
versionUpdate["versionUpdate"]
theme["theme"]
streamer["streamer"]
i18n["i18n"]
app["app"]
mode["mode"]
lcp["lcp"]
keyboard["keyboard"]
version["version"]
wizard["wizard"]
settings["settings"]
creator["creator"]
noteExport["noteExport"]

subgraph rootReducer ["rootReducer"]
    versionUpdate
    theme
    streamer
    i18n
    app
    mode
    lcp
    keyboard
    version
    wizard
    settings
    creator
    noteExport

subgraph opds ["opds"]
    catalog
end

subgraph publication ["publication"]
    lastReadingQueue
    readingFinishedQueue
    db
end

subgraph win ["win"]

subgraph registry ["registry"]
    reader2
end

subgraph session ["session"]
    library

subgraph reader ["reader"]
    defaultConfig
    disableRTLFlip
end
end
end
end
```

The root reducer is created using Redux's `combineReducers` function, which creates a nested structure of reducers that mirrors the state tree structure.

Sources: [src/main/redux/reducers/index.ts L36-L110](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/reducers/index.ts#L36-L110)

## Redux Middleware

### Sync Middleware

The sync middleware synchronizes actions between the main process and renderer processes. It determines which actions should be synchronized based on a predefined list of synchronizable action types.

```mermaid
sequenceDiagram
  participant Dispatch Action
  participant Sync Middleware
  participant Next Middleware
  participant Renderer Processes

  Dispatch Action->>Sync Middleware: action
  loop [Is not sender window?]
    Sync Middleware->>Sync Middleware: Check SYNCHRONIZABLE_ACTIONS
    Sync Middleware->>Sync Middleware: Get browser windows from state
    Sync Middleware->>Sync Middleware: Serialize action
    Sync Middleware->>Renderer Processes: Send action via IPC
  end
  Sync Middleware->>Next Middleware: Pass action to next middleware
```

The sync middleware maintains a list of actions that should be synchronized (`SYNCHRONIZABLE_ACTIONS`), including actions related to API results, dialogs, reader configuration, LCP handling, and more.

Sources: [src/main/redux/middleware/sync.ts L28-L92](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/sync.ts#L28-L92)

 [src/main/redux/middleware/sync.ts L94-L210](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/sync.ts#L94-L210)

### Persistence Middleware

The persistence middleware tracks state changes and creates patches that are later persisted to disk. It selects the parts of the state to persist and uses the RFC6902 JSON Patch format to efficiently track changes.

```mermaid
sequenceDiagram
  participant Action
  participant Persistence Middleware
  participant Next Middleware
  participant Patch Channel
  participant Redux Store

  Action->>Persistence Middleware: action
  Persistence Middleware->>Persistence Middleware: Get previous state
  Persistence Middleware->>Next Middleware: Pass action
  Next Middleware-->>Persistence Middleware: Return value
  Persistence Middleware->>Persistence Middleware: Get next state
  Persistence Middleware->>Persistence Middleware: Extract persistable state
  Persistence Middleware->>Persistence Middleware: Create patch
  loop [Has changes?]
    Persistence Middleware->>Patch Channel: Put patches
    Persistence Middleware->>Redux Store: Dispatch persistRequest action
  end
  Persistence Middleware-->>Action: Return value
```

Sources: [src/main/redux/middleware/persistence.ts L18-L92](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts#L18-L92)

## Sagas

The Redux Saga middleware is used to handle side effects and asynchronous operations. The root saga initializes the application and coordinates various subsystems.

### Root Saga

The root saga coordinates the initialization and operation of various subsystems:

```mermaid
flowchart TD

RootSaga["rootSaga()"]
WaitForInit["Wait for appActions.initRequest"]
I18NSaga["i18n.saga()"]
ParallelInit["Initialize in parallel"]
AppInit["appSaga.init"]
KeyboardInit["keyboardShortcuts.init"]
AppExit["appSaga.exit()"]
SubsystemSagas["Initialize subsystem sagas"]
APISaga["api.saga()"]
StreamerSaga["streamer.saga()"]
KeyboardSaga["keyboard.saga()"]
ReaderSaga["win.reader.saga()"]
LibrarySaga["win.library.saga()"]
SessionReaderSaga["win.session.reader.saga()"]
SessionLibrarySaga["win.session.library.saga()"]
IPCSaga["ipc.saga()"]
ReaderMainSaga["reader.saga()"]
PersistSaga["persist.saga()"]
AuthSaga["auth.saga()"]
LCPSaga["lcp.saga()"]
AnnotationSaga["annotation.saga()"]
CatalogSaga["catalog.saga()"]
SetKeyboardShortcuts["Set keyboard shortcuts"]
OpenLibrary["Open library window"]
CollectTelemetry["Collect and send telemetry"]
AppInitSuccess["Dispatch appActions.initSuccess"]
WaitLibraryOpen["Wait for library window to open"]
CheckVersionUpdate["Check for app version updates"]
EventsSaga["events.saga()"]

RootSaga --> WaitForInit
WaitForInit --> I18NSaga
I18NSaga --> ParallelInit
ParallelInit --> AppInit
ParallelInit --> KeyboardInit
ParallelInit --> AppExit
AppExit --> SubsystemSagas
SubsystemSagas --> APISaga
SubsystemSagas --> StreamerSaga
SubsystemSagas --> KeyboardSaga
SubsystemSagas --> ReaderSaga
SubsystemSagas --> LibrarySaga
SubsystemSagas --> SessionReaderSaga
SubsystemSagas --> SessionLibrarySaga
SubsystemSagas --> IPCSaga
SubsystemSagas --> ReaderMainSaga
SubsystemSagas --> PersistSaga
SubsystemSagas --> AuthSaga
SubsystemSagas --> LCPSaga
SubsystemSagas --> AnnotationSaga
SubsystemSagas --> CatalogSaga
SubsystemSagas --> SetKeyboardShortcuts
SetKeyboardShortcuts --> OpenLibrary
OpenLibrary --> CollectTelemetry
CollectTelemetry --> AppInitSuccess
AppInitSuccess --> WaitLibraryOpen
WaitLibraryOpen --> CheckVersionUpdate
CheckVersionUpdate --> EventsSaga
```

Sources: [src/main/redux/sagas/index.ts L48-L166](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/index.ts#L48-L166)

## State Persistence

The Redux store's state is persisted to disk through a combination of the persistence middleware and dedicated sagas.

### Persistence Flow

The persistence process works as follows:

1. The persistence middleware tracks state changes and creates patches
2. Patches are sent to a channel and periodically flushed to disk
3. The complete state is also periodically saved to disk
4. During application initialization, the persisted state is loaded and used to initialize the store

```mermaid
flowchart TD

ReduxStore["Redux Store"]
PersistMiddleware["Persistence Middleware"]
PatchChannel["Patch Channel"]
PersistSaga["Persist Saga"]
NeedToPersistPatch["needToPersistPatch()"]
PatchFile["patch.json"]
AppShutdown["App Shutdown"]
NeedToPersistFinalState["needToPersistFinalState()"]
FullState["Full State Object"]
StateFile["state.json"]

ReduxStore --> PersistMiddleware
PersistMiddleware --> PatchChannel
PersistMiddleware --> PersistSaga
PersistSaga --> NeedToPersistPatch
NeedToPersistPatch --> PatchChannel
NeedToPersistPatch --> PatchFile
AppShutdown --> NeedToPersistFinalState
NeedToPersistFinalState --> FullState
NeedToPersistFinalState --> StateFile
NeedToPersistFinalState --> NeedToPersistPatch
```

The persistence system uses three main files:

1. **state.json**: Contains the complete persisted state
2. **patch.json**: Contains incremental changes to the state
3. **runtime-state.json**: Contains the runtime state for recovery purposes

Sources: [src/main/redux/middleware/persistence.ts L18-L92](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts#L18-L92)

 [src/main/redux/sagas/persist.ts L26-L93](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/persist.ts#L26-L93)

## Inter-Process Communication with Redux

Thorium Reader uses Redux as the basis for inter-process communication between the main Electron process and renderer processes.

### Synchronizing Actions

When an action is dispatched in the main process, the sync middleware determines if it should be synchronized with renderer processes:

```mermaid
sequenceDiagram
  participant Main Process
  participant Sync Middleware
  participant Library Window
  participant Reader Windows

  Main Process->>Sync Middleware: Dispatch action
  loop [Not originated from
    Sync Middleware->>Sync Middleware: Identify target windows
    Sync Middleware->>Library Window: Send action via IPC
    Sync Middleware->>Reader Windows: Send action via IPC
  end
```

Sources: [src/main/redux/middleware/sync.ts L94-L210](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/sync.ts#L94-L210)

## Conclusion

The Redux Store in Thorium Reader provides a robust central state management system that coordinates state across the main process and multiple renderer processes. It includes mechanisms for state persistence, synchronization, and recovery, ensuring that the application state remains consistent and resilient.

The store architecture follows Electron's process model while adapting Redux patterns to the needs of a cross-platform desktop application. The combination of Redux, middleware, and sagas provides a maintainable and predictable way to manage the complex state requirements of an EPUB reader application.