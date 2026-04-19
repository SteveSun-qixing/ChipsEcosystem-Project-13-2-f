# State Persistence

> **Relevant source files**
> * [src/main/redux/actions/publication/addPublication.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/actions/publication/addPublication.ts)
> * [src/main/redux/middleware/persistence.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts)
> * [src/main/redux/sagas/patch.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/patch.ts)
> * [src/main/redux/sagas/persist.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/persist.ts)
> * [src/main/redux/store/memory.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts)
> * [src/typings/lunr.d.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/lunr.d.ts)

The state persistence system in Thorium Reader provides reliable storage and recovery of application state across sessions. It uses a combination of full state snapshots, incremental patches based on RFC6902, and multi-level recovery mechanisms to ensure data integrity and prevent state corruption.

For information about the Redux store structure and initialization, see [Redux Store](/edrlab/thorium-reader/6.1-redux-store). For details about Redux sagas and asynchronous operations, see [Redux Sagas](/edrlab/thorium-reader/6.2-redux-sagas).

## Architecture Overview

The persistence system operates on three main components: full state snapshots, incremental patches, and recovery mechanisms. The system uses RFC6902 JSON patches to track state changes incrementally, with periodic full state dumps and multiple recovery strategies to handle corruption.

```mermaid
flowchart TD

STATE_FILE["stateFilePath<br>state.json"]
RUNTIME_STATE["runtimeStateFilePath<br>runtime-state.json"]
PATCH_FILE["patchFilePath<br>patches.json"]
BACKUP_FILE["backupStateFilePathFn()<br>backup files"]
PERSIST_MW["reduxPersistMiddleware<br>Action Interceptor"]
PATCH_CREATE["createPatch()<br>RFC6902 Differ"]
PATCH_CHANNEL["patchChannel<br>Operation Buffer"]
PERSIST_SAGA["needToPersistPatch()<br>Debounced Writer"]
FINAL_SAGA["needToPersistFinalState()<br>Full State Writer"]
PATCH_SAGA["saga()<br>Debounce Controller"]
INIT_STORE["initStore()<br>State Loader"]
RECOVERY_STATE["recoveryReduxState()<br>Patch Applicator"]
CHECK_STATE["checkReduxState()<br>Validator"]
TEST_FN["test()<br>State Structure Validator"]

PATCH_CHANNEL --> PERSIST_SAGA
PERSIST_SAGA --> PATCH_FILE
FINAL_SAGA --> STATE_FILE
INIT_STORE --> STATE_FILE
INIT_STORE --> RUNTIME_STATE
INIT_STORE --> PATCH_FILE
RECOVERY_STATE --> PATCH_FILE
RECOVERY_STATE --> RUNTIME_STATE
PERSIST_SAGA --> BACKUP_FILE

subgraph subGraph3 ["Recovery System"]
    INIT_STORE
    RECOVERY_STATE
    CHECK_STATE
    TEST_FN
    CHECK_STATE --> INIT_STORE
    TEST_FN --> INIT_STORE
end

subgraph subGraph2 ["Persistence Sagas"]
    PERSIST_SAGA
    FINAL_SAGA
    PATCH_SAGA
    PATCH_SAGA --> PERSIST_SAGA
end

subgraph subGraph1 ["Redux Middleware"]
    PERSIST_MW
    PATCH_CREATE
    PATCH_CHANNEL
    PERSIST_MW --> PATCH_CREATE
    PATCH_CREATE --> PATCH_CHANNEL
end

subgraph subGraph0 ["State Files"]
    STATE_FILE
    RUNTIME_STATE
    PATCH_FILE
    BACKUP_FILE
end
```

Sources: [src/main/redux/store/memory.ts L1-L474](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L1-L474)

 [src/main/redux/middleware/persistence.ts L1-L93](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts#L1-L93)

 [src/main/redux/sagas/persist.ts L1-L94](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/persist.ts#L1-L94)

## State File Structure

The persistence system manages multiple files to ensure data integrity and enable recovery from various failure scenarios.

| File Purpose | File Path Variable | Description |
| --- | --- | --- |
| Main State | `stateFilePath` | Complete application state snapshot |
| Runtime State | `runtimeStateFilePath` | Previous session state for patch application |
| Patch Operations | `patchFilePath` | RFC6902 operations for incremental updates |
| Backup Files | `backupStateFilePathFn()` | Emergency recovery copies |

The `PersistRootState` interface defines which parts of the application state are persisted:

```javascript
const persistNextState: PersistRootState = {    theme: nextState.theme,    win: nextState.win,    reader: nextState.reader,    i18n: nextState.i18n,    session: nextState.session,    publication: {        db: nextState.publication.db,        lastReadingQueue: nextState.publication.lastReadingQueue,        readingFinishedQueue: nextState.publication.readingFinishedQueue,    },    opds: nextState.opds,    version: nextState.version,    wizard: nextState.wizard,    settings: nextState.settings,    creator: nextState.creator,    noteExport: nextState.noteExport,};
```

Sources: [src/main/redux/middleware/persistence.ts L49-L67](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts#L49-L67)

 [src/main/di L12-L13](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/di#L12-L13)

## RFC6902 Patch System

The middleware intercepts every Redux action and creates RFC6902 patches representing the difference between previous and next state. These patches are buffered and periodically flushed to disk.

```mermaid
flowchart TD

REDUX_ACTION["Redux Action<br>Dispatched"]
PREV_STATE["Previous State<br>Snapshot"]
NEXT_STATE["Next State<br>After Reducer"]
CREATE_PATCH["createPatch()<br>RFC6902 Differ"]
PATCH_OPS["Patch Operations<br>Array"]
PATCH_CHANNEL_BUF["patchChannel<br>Expanding Buffer"]
PERSIST_REQUEST["winActions.persistRequest<br>Trigger Action"]

REDUX_ACTION --> PREV_STATE
REDUX_ACTION --> NEXT_STATE
PREV_STATE --> CREATE_PATCH
NEXT_STATE --> CREATE_PATCH
CREATE_PATCH --> PATCH_OPS
PATCH_OPS --> PATCH_CHANNEL_BUF
PATCH_OPS --> PERSIST_REQUEST
```

The `reduxPersistMiddleware` operates as follows:

1. Captures state before action processing
2. Allows action to proceed through reducers
3. Captures state after action processing
4. Creates RFC6902 patch between states using `createPatch()`
5. Puts operations into `patchChannel` buffer
6. Dispatches `winActions.persistRequest` to trigger persistence

Sources: [src/main/redux/middleware/persistence.ts L18-L92](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/middleware/persistence.ts#L18-L92)

 [src/main/redux/sagas/patch.ts L11](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/patch.ts#L11-L11)

## Debounced Persistence

The persistence system uses a debounced approach to avoid excessive disk I/O while ensuring data safety. The `DEBOUNCE_TIME` is set to 3 minutes.

```mermaid
flowchart TD

PATCH_CHANNEL_INPUT["patchChannel.put()<br>Operation Input"]
EXPANDING_BUFFER["buffers.expanding(1000)<br>Channel Buffer"]
FLUSH_TRIGGER["flushTyped(patchChannel)<br>Buffer Drain"]
PERSIST_REQUEST["winActions.persistRequest.ID<br>Trigger Action"]
DEBOUNCE_SAGA["debounce(DEBOUNCE_TIME)<br>3 Minute Delay"]
PATCH_PERSIST["needToPersistPatch()<br>Write Operations"]
PATCH_FILE_APPEND["fsp.appendFile(patchFilePath)<br>Incremental Write"]
STATE_FILE_WRITE["fsp.writeFile(stateFilePath)<br>Full State Write"]

PATCH_PERSIST --> FLUSH_TRIGGER
FLUSH_TRIGGER --> PATCH_FILE_APPEND
PATCH_PERSIST --> STATE_FILE_WRITE

subgraph subGraph2 ["File Operations"]
    PATCH_FILE_APPEND
    STATE_FILE_WRITE
end

subgraph subGraph1 ["Debounce Control"]
    PERSIST_REQUEST
    DEBOUNCE_SAGA
    PATCH_PERSIST
    PERSIST_REQUEST --> DEBOUNCE_SAGA
    DEBOUNCE_SAGA --> PATCH_PERSIST
end

subgraph subGraph0 ["Patch Buffer Management"]
    PATCH_CHANNEL_INPUT
    EXPANDING_BUFFER
    FLUSH_TRIGGER
    PATCH_CHANNEL_INPUT --> EXPANDING_BUFFER
    FLUSH_TRIGGER --> EXPANDING_BUFFER
end
```

Sources: [src/main/redux/sagas/persist.ts L19](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/persist.ts#L19-L19)

 [src/main/redux/sagas/persist.ts L87-L93](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/persist.ts#L87-L93)

 [src/main/redux/sagas/patch.ts L8-L11](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/patch.ts#L8-L11)

## Multi-Level Recovery System

The `initStore()` function implements a 4-level recovery system to handle various corruption scenarios:

```mermaid
flowchart TD

LOAD_STATE["Load state.json<br>Primary State File"]
RUNTIME_LOAD["Load runtimeStateFilePath<br>Previous Session State"]
PATCH_APPLY["recoveryReduxState()<br>Apply Patches"]
VERIFY_STATE["checkReduxState()<br>Validate Result"]
USE_PRIMARY["Use state.json<br>Ignore Patch Errors"]
TEST_PRIMARY["test(reduxState)<br>Structure Validation"]
FORCE_PATCH["Force Patch Application<br>Skip Verification"]
TEST_PATCHED["test(patchedState)<br>Structure Check"]
USE_RUNTIME["Use Runtime State Only<br>Data Loss Warning"]
TEST_RUNTIME["test(runtimeState)<br>Final Validation"]
BACKUP_CREATE["Create Backup File<br>backupStateFilePathFn()"]
STORE_CREATE["Create Redux Store<br>With Recovered State"]

LOAD_STATE --> RUNTIME_LOAD
VERIFY_STATE --> TEST_PRIMARY
TEST_PRIMARY --> FORCE_PATCH
TEST_PATCHED --> USE_RUNTIME
VERIFY_STATE --> BACKUP_CREATE
TEST_PRIMARY --> BACKUP_CREATE
TEST_PATCHED --> BACKUP_CREATE
TEST_RUNTIME --> BACKUP_CREATE
BACKUP_CREATE --> STORE_CREATE

subgraph subGraph3 ["Recovery Level 4"]
    USE_RUNTIME
    TEST_RUNTIME
    USE_RUNTIME --> TEST_RUNTIME
end

subgraph subGraph2 ["Recovery Level 3"]
    FORCE_PATCH
    TEST_PATCHED
    FORCE_PATCH --> TEST_PATCHED
end

subgraph subGraph1 ["Recovery Level 2"]
    USE_PRIMARY
    TEST_PRIMARY
end

subgraph subGraph0 ["Recovery Level 1"]
    RUNTIME_LOAD
    PATCH_APPLY
    VERIFY_STATE
    RUNTIME_LOAD --> PATCH_APPLY
    PATCH_APPLY --> VERIFY_STATE
end
```

Recovery levels and their purposes:

1. **Level 1**: `runtimeState + patches = currentState` with verification
2. **Level 2**: Use `state.json` directly when patches fail verification
3. **Level 3**: Force patch application without verification
4. **Level 4**: Use runtime state only (potential data loss)

Sources: [src/main/redux/store/memory.ts L98-L214](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L98-L214)

 [src/main/redux/store/memory.ts L131-L180](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L131-L180)

## State Migration System

The initialization process includes extensive migration logic to handle format changes between Thorium versions, particularly the migration from separate bookmark and annotation systems to a unified note system.

```mermaid
flowchart TD

CHECK_BOOKMARK["Check (state.reduxState as any).bookmark<br>Legacy Bookmark Format"]
CHECK_ANNOTATION["Check (state.reduxState as any).annotation<br>Legacy Annotation Format"]
CHECK_COUNT["Check bookmarkTotalCount<br>Legacy Counter"]
CREATE_NOTE_ARRAY["Initialize state.reduxState.note = []<br>New Note Array"]
MIGRATE_BOOKMARKS["Transform Bookmarks to Notes<br>EDrawType.bookmark"]
MIGRATE_ANNOTATIONS["Transform Annotations to Notes<br>EDrawType mapping"]
UPDATE_COUNT["Update noteTotalCount.state<br>New Counter System"]
CLEAN_FOLLOWING["Remove followingElementIDs<br>LocatorExtended Optimization"]
MIGRATE_RANGE["Convert rangeInfo to caretInfo<br>Location Format Update"]
MINIMIZE_LOCATOR["minimizeLocatorExtended()<br>Memory Optimization"]

CHECK_BOOKMARK --> CREATE_NOTE_ARRAY
CHECK_ANNOTATION --> CREATE_NOTE_ARRAY
CHECK_COUNT --> UPDATE_COUNT
MIGRATE_BOOKMARKS --> CLEAN_FOLLOWING
MIGRATE_ANNOTATIONS --> CLEAN_FOLLOWING

subgraph subGraph2 ["Locator Cleanup"]
    CLEAN_FOLLOWING
    MIGRATE_RANGE
    MINIMIZE_LOCATOR
    CLEAN_FOLLOWING --> MIGRATE_RANGE
    MIGRATE_RANGE --> MINIMIZE_LOCATOR
end

subgraph subGraph1 ["Note Migration Process"]
    CREATE_NOTE_ARRAY
    MIGRATE_BOOKMARKS
    MIGRATE_ANNOTATIONS
    UPDATE_COUNT
    CREATE_NOTE_ARRAY --> MIGRATE_BOOKMARKS
    CREATE_NOTE_ARRAY --> MIGRATE_ANNOTATIONS
end

subgraph subGraph0 ["Legacy State Detection"]
    CHECK_BOOKMARK
    CHECK_ANNOTATION
    CHECK_COUNT
end
```

Key migration operations:

* **Bookmark to Note**: Converts legacy bookmark format to unified note system with `EDrawType.bookmark`
* **Annotation to Note**: Migrates annotations with proper draw type mapping
* **Locator Optimization**: Removes `followingElementIDs` and converts `rangeInfo` to `caretInfo`
* **Counter Migration**: Updates from `bookmarkTotalCount` to `noteTotalCount`

Sources: [src/main/redux/store/memory.ts L247-L448](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L247-L448)

 [src/main/redux/store/memory.ts L366-L427](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L366-L427)

## Error Handling and Logging

The persistence system includes comprehensive error handling and debug logging to aid in troubleshooting state corruption issues.

```mermaid
flowchart TD

DEBUG_STDOUT["debugStdout<br>Console Output"]
DEBUG_FILE["appendFileSync(memoryLoggerFilename)<br>File Logging"]
TIMESTAMP["Date.now()<br>Timestamped Logs"]
PATCH_ERROR["Patch Application Error<br>RangeError: Maximum call stack"]
STATE_CORRUPTION["State Corruption<br>deepStrictEqual Failure"]
JSON_PARSE_ERROR["JSON Parse Error<br>Invalid File Format"]
FILE_READ_ERROR["File Read Error<br>Missing Files"]
BACKUP_CREATION["Backup File Creation<br>Data Preservation"]
FALLBACK_STATE["Fallback to Previous Level<br>Graceful Degradation"]
FRESH_START["Fresh State Initialization<br>Last Resort"]

PATCH_ERROR --> BACKUP_CREATION
STATE_CORRUPTION --> FALLBACK_STATE
JSON_PARSE_ERROR --> FALLBACK_STATE
FILE_READ_ERROR --> FRESH_START

subgraph subGraph2 ["Recovery Actions"]
    BACKUP_CREATION
    FALLBACK_STATE
    FRESH_START
end

subgraph subGraph1 ["Error Scenarios"]
    PATCH_ERROR
    STATE_CORRUPTION
    JSON_PARSE_ERROR
    FILE_READ_ERROR
end

subgraph subGraph0 ["Debug System"]
    DEBUG_STDOUT
    DEBUG_FILE
    TIMESTAMP
    DEBUG_STDOUT --> DEBUG_FILE
    TIMESTAMP --> DEBUG_FILE
end
```

Error handling strategies:

* **Patch Errors**: Caught and logged, fallback to next recovery level
* **State Validation**: Uses `deepStrictEqual()` for strict state comparison
* **File Operations**: Wrapped in `tryCatch()` helpers with fallback values
* **Debug Logging**: Timestamped logs to both console and file system

Sources: [src/main/redux/store/memory.ts L35-L43](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L35-L43)

 [src/main/redux/store/memory.ts L76-L81](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L76-L81)

 [src/main/redux/store/memory.ts L132-L192](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/store/memory.ts#L132-L192)