# Keyboard Shortcuts

> **Relevant source files**
> * [src/common/keyboard.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/keyboard.ts)
> * [src/common/redux/actions/keyboard/setShortcuts.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/actions/keyboard/setShortcuts.ts)
> * [src/common/redux/reducers/keyboard.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/reducers/keyboard.ts)
> * [src/common/redux/states/keyboard.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/keyboard.ts)
> * [src/main/keyboard.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/keyboard.ts)
> * [src/renderer/assets/icons/windows-icon.svg](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/assets/icons/windows-icon.svg)
> * [src/renderer/common/hooks/useKeyboardShortcut.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/hooks/useKeyboardShortcut.ts)
> * [src/renderer/common/hooks/useSyncExternalStore.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/hooks/useSyncExternalStore.ts)
> * [src/renderer/common/keyboard.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/keyboard.ts)
> * [src/renderer/library/components/settings/KeyboardSettings.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx)
> * [src/typings/keyboard.d.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/keyboard.d.ts)

## Purpose and Scope

This document covers Thorium Reader's keyboard shortcut system, including shortcut definitions, event handling, customization capabilities, and persistence mechanisms. The system provides comprehensive keyboard navigation and control across all application areas including the reader, library, and OPDS catalogs.

For information about general UI components and settings management, see [Settings UI](/edrlab/thorium-reader/8.4-settings-ui).

## Architecture Overview

The keyboard shortcut system consists of several interconnected components spanning the main and renderer processes:

```mermaid
flowchart TD

DEFAULTS["defaultKeyboardShortcuts<br>Default Shortcuts Map"]
TYPES["TKeyboardShortcut Types<br>Interface Definitions"]
SCOPE["Scope System<br>reader|catalogs|bookshelf"]
MAIN_KB["keyboardShortcuts Service<br>File Management"]
USER_FILE["user_.json<br>User Customizations"]
DEFAULT_FILE["defaults.json<br>Generated Defaults"]
EVENT_HANDLER["keyDownUpEventHandler<br>Event Processing"]
REGISTER["registerKeyboardListener<br>Shortcut Registration"]
SETTINGS_UI["KeyboardSettings.tsx<br>Customization Interface"]
REDUX_STATE["keyboard Redux State<br>Current Shortcuts"]
ACTIONS["keyboardActions<br>setShortcuts, reloadShortcuts"]

DEFAULTS --> REDUX_STATE
MAIN_KB --> ACTIONS
SETTINGS_UI --> ACTIONS
REDUX_STATE --> SETTINGS_UI
REDUX_STATE --> EVENT_HANDLER
SCOPE --> EVENT_HANDLER
TYPES --> EVENT_HANDLER
TYPES --> SETTINGS_UI

subgraph subGraph3 ["State Management"]
    REDUX_STATE
    ACTIONS
    ACTIONS --> REDUX_STATE
end

subgraph subGraph2 ["Renderer Process"]
    EVENT_HANDLER
    REGISTER
    SETTINGS_UI
    EVENT_HANDLER --> REGISTER
end

subgraph subGraph1 ["Main Process"]
    MAIN_KB
    USER_FILE
    DEFAULT_FILE
    MAIN_KB --> USER_FILE
    MAIN_KB --> DEFAULT_FILE
end

subgraph subGraph0 ["Common Definitions"]
    DEFAULTS
    TYPES
    SCOPE
end
```

Sources: [src/common/keyboard.ts L1-L595](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/keyboard.ts#L1-L595)

 [src/main/keyboard.ts L1-L238](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/keyboard.ts#L1-L238)

 [src/renderer/common/keyboard.ts L1-L302](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/keyboard.ts#L1-L302)

 [src/renderer/library/components/settings/KeyboardSettings.tsx L1-L1167](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L1-L1167)

## Shortcut Definition System

### Default Shortcuts Structure

All keyboard shortcuts are defined with a comprehensive type system and default mappings:

```mermaid
flowchart TD

BASE_SHORTCUT["TKeyboardShortcut<br>{key, alt?, control?, shift?, meta?}"]
FULL_SHORTCUT["TKeyboardShortcutFull<br>+ scope: TKeyboardShortcutScopeZone[]"]
SHORTCUT_MAP["TKeyboardShortcutsMap<br>Record<TKeyboardShortcutId, TKeyboardShortcut>"]
READER_SCOPE["reader<br>Reading Interface"]
CATALOG_SCOPE["catalogs<br>OPDS Browsing"]
BOOKSHELF_SCOPE["bookshelf<br>Library Management"]
NAVIGATION_SHORTCUTS["Navigation Shortcuts<br>NavigatePreviousPage, etc."]
FOCUS_SHORTCUTS["Focus Shortcuts<br>FocusToolbar, FocusMain, etc."]
READER_SHORTCUTS["Reader Shortcuts<br>ToggleBookmark, CloseReader, etc."]
AUDIO_SHORTCUTS["Audio Shortcuts<br>AudioPlayPause, AudioNext, etc."]

READER_SCOPE --> FULL_SHORTCUT
CATALOG_SCOPE --> FULL_SHORTCUT
BOOKSHELF_SCOPE --> FULL_SHORTCUT
NAVIGATION_SHORTCUTS --> SHORTCUT_MAP
FOCUS_SHORTCUTS --> SHORTCUT_MAP
READER_SHORTCUTS --> SHORTCUT_MAP
AUDIO_SHORTCUTS --> SHORTCUT_MAP

subgraph subGraph2 ["Default Definitions"]
    NAVIGATION_SHORTCUTS
    FOCUS_SHORTCUTS
    READER_SHORTCUTS
    AUDIO_SHORTCUTS
end

subgraph subGraph1 ["Scope Zones"]
    READER_SCOPE
    CATALOG_SCOPE
    BOOKSHELF_SCOPE
end

subgraph subGraph0 ["Type System"]
    BASE_SHORTCUT
    FULL_SHORTCUT
    SHORTCUT_MAP
    BASE_SHORTCUT --> FULL_SHORTCUT
    FULL_SHORTCUT --> SHORTCUT_MAP
end
```

The default shortcuts are defined in `_defaults_` object with full type safety and include categories such as:

| Category | Examples | Scope |
| --- | --- | --- |
| Navigation | `NavigatePreviousPage` (ArrowLeft), `NavigateNextPage` (ArrowRight) | reader |
| Focus Management | `FocusToolbar` (Ctrl+T), `FocusMain` (Ctrl+F10) | all scopes |
| Reader Controls | `ToggleBookmark` (Ctrl+B), `CloseReader` (Ctrl+W) | reader |
| Audio/Media | `AudioPlayPause` (Ctrl+2), `AudioNext` (Ctrl+3) | reader |
| Search | `FocusSearch` (Ctrl+F), `SearchNext` (F3) | multiple |

Sources: [src/common/keyboard.ts L33-L525](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/keyboard.ts#L33-L525)

 [src/common/keyboard.ts L14-L31](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/keyboard.ts#L14-L31)

### Shortcut Matching Logic

The system uses precise key code matching rather than logical key interpretation:

```mermaid
flowchart TD

KEYBOARD_EVENT["IKeyboardEvent<br>{altKey, ctrlKey, metaKey, shiftKey, code}"]
SHORTCUT_DEF["TKeyboardShortcut<br>{key, alt?, control?, shift?, meta?}"]
MATCH_FUNC["keyboardShortcutMatch()"]
CODE_MATCH["Match e.code === ks.key<br>Physical Key Position"]
MODIFIER_MATCH["Match All Modifiers<br>alt, control, shift, meta"]
RESULT["Boolean Match Result"]

KEYBOARD_EVENT --> MATCH_FUNC
SHORTCUT_DEF --> MATCH_FUNC
MATCH_FUNC --> CODE_MATCH
MATCH_FUNC --> MODIFIER_MATCH
CODE_MATCH --> RESULT
MODIFIER_MATCH --> RESULT
```

Sources: [src/common/keyboard.ts L550-L562](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/keyboard.ts#L550-L562)

 [src/common/keyboard.ts L533-L541](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/keyboard.ts#L533-L541)

## Event Handling and Registration

### Keyboard Event Processing

The renderer process handles keyboard events through a sophisticated filtering and routing system:

```mermaid
flowchart TD

DOM_KEYDOWN["DOM keydown Events"]
DOM_KEYUP["DOM keyup Events"]
IPC_EVENTS["IPC Window Focus/Blur"]
ELEMENT_CHECK["Element Blacklist Check<br>INPUT, TEXTAREA, contenteditable"]
MODIFIER_TRACKING["Modifier State Tracking<br>_keyModifierShift, etc."]
SHORTCUT_MATCHING["Shortcut Matching Loop<br>_keyboardShortcutPairings"]
REGISTER_API["registerKeyboardListener()<br>Add Shortcut Handler"]
UNREGISTER_API["unregisterKeyboardListener()<br>Remove Handler"]
PAIRING_STORE["_keyboardShortcutPairings[]<br>Active Registrations"]

DOM_KEYDOWN --> ELEMENT_CHECK
DOM_KEYUP --> ELEMENT_CHECK
IPC_EVENTS --> MODIFIER_TRACKING
SHORTCUT_MATCHING --> PAIRING_STORE

subgraph subGraph2 ["Registration System"]
    REGISTER_API
    UNREGISTER_API
    PAIRING_STORE
    REGISTER_API --> PAIRING_STORE
    UNREGISTER_API --> PAIRING_STORE
end

subgraph subGraph1 ["Event Processing"]
    ELEMENT_CHECK
    MODIFIER_TRACKING
    SHORTCUT_MATCHING
    ELEMENT_CHECK --> MODIFIER_TRACKING
    MODIFIER_TRACKING --> SHORTCUT_MATCHING
end

subgraph subGraph0 ["Event Sources"]
    DOM_KEYDOWN
    DOM_KEYUP
    IPC_EVENTS
end
```

The system maintains reliable modifier key state tracking because DOM events can be unreliable, especially on Windows with complex modifier combinations.

Sources: [src/renderer/common/keyboard.ts L65-L149](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/keyboard.ts#L65-L149)

 [src/renderer/common/keyboard.ts L266-L301](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/keyboard.ts#L266-L301)

 [src/renderer/common/keyboard.ts L172-L259](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/keyboard.ts#L172-L259)

### Element Blacklisting

Keyboard shortcuts are automatically disabled for interactive elements to prevent conflicts:

| Element Type | Blacklist Conditions |
| --- | --- |
| `INPUT` | `type="search"`, `type="text"`, `type="password"` |
| `INPUT` (range) | Arrow keys only |
| `INPUT` (radio) | Arrow keys only |
| `INPUT` (checkbox) | Enter/Return/Space only |
| `INPUT` (file) | Enter/Return/Space only |
| `TEXTAREA` | All shortcuts |
| `contenteditable="true"` | All shortcuts |

Sources: [src/renderer/common/keyboard.ts L77-L88](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/keyboard.ts#L77-L88)

## Customization and Persistence

### File-Based Storage

The main process manages keyboard shortcut persistence through a dedicated file system:

```mermaid
flowchart TD

USER_DATA["userData/keyboardShortcuts/"]
DEFAULTS_JSON["defaults.json<br>Generated at Launch"]
USER_JSON["user_.json<br>User Customizations"]
OLD_USER["user.json<br>Legacy (Removed)"]
INIT["init()<br>Setup Directories"]
LOAD_USER["loadUser()<br>Read user_.json"]
SAVE_USER["saveUser()<br>Write Changes Only"]
LOAD_DEFAULTS["loadDefaults()<br>Reset to Defaults"]
SHOW_FOLDER["showFolder()<br>Open in File Manager"]
CLONE_DEFAULTS["cloneDefaults()<br>Remove Scope Info"]
FILTER_CHANGES["Save Only Differences<br>vs defaultKeyboardShortcuts"]
VALIDATE_JSON["Validate Structure<br>Filter Invalid Keys"]

INIT --> USER_DATA
INIT --> DEFAULTS_JSON
INIT --> USER_JSON
LOAD_USER --> USER_JSON
SAVE_USER --> USER_JSON
LOAD_DEFAULTS --> CLONE_DEFAULTS
SAVE_USER --> FILTER_CHANGES
LOAD_USER --> VALIDATE_JSON

subgraph subGraph2 ["Data Processing"]
    CLONE_DEFAULTS
    FILTER_CHANGES
    VALIDATE_JSON
    CLONE_DEFAULTS --> FILTER_CHANGES
end

subgraph subGraph1 ["Main Process API"]
    INIT
    LOAD_USER
    SAVE_USER
    LOAD_DEFAULTS
    SHOW_FOLDER
end

subgraph subGraph0 ["File System Structure"]
    USER_DATA
    DEFAULTS_JSON
    USER_JSON
    OLD_USER
end
```

The system only saves differences from defaults to keep user files minimal and maintainable.

Sources: [src/main/keyboard.ts L58-L89](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/keyboard.ts#L58-L89)

 [src/main/keyboard.ts L136-L149](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/keyboard.ts#L136-L149)

 [src/main/keyboard.ts L150-L179](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/keyboard.ts#L150-L179)

### Loading and Validation

User customizations undergo strict validation during loading:

| Validation Step | Purpose |
| --- | --- |
| File existence check | Handle missing user file gracefully |
| JSON parsing | Catch malformed JSON |
| ID filtering | Remove unrecognized shortcut names |
| Object validation | Ensure proper structure |
| Key validation | Require valid `key` property |
| Type coercion | Normalize boolean modifiers |

Sources: [src/main/keyboard.ts L91-L135](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/keyboard.ts#L91-L135)

## Settings UI

### Customization Interface

The `KeyboardSettings` component provides a comprehensive interface for shortcut customization:

```mermaid
flowchart TD

SEARCH_INPUT["Search Input<br>Filter Shortcuts"]
SHORTCUT_LIST["Shortcut List<br>Filterable Display"]
EDIT_INTERFACE["Edit Interface<br>Key Capture UI"]
ACTION_BUTTONS["Action Buttons<br>Save/Cancel"]
ADVANCED_MENU["Advanced Menu<br>Reset/Export Options"]
COMPONENT_STATE["Component State<br>editKeyboardShortcutId, etc."]
KEYBOARD_SINK["Keyboard Sink<br>_keyboardSinkIsActive"]
LAYOUT_MAP["Layout Map<br>Physical Key Labels"]
CLICK_EDIT["Click Edit Button"]
CAPTURE_KEYS["Capture Keyboard Input"]
VALIDATE_COMBO["Validate Key Combination"]
SAVE_CHANGES["Save to Redux State"]

CLICK_EDIT --> KEYBOARD_SINK
KEYBOARD_SINK --> CAPTURE_KEYS
COMPONENT_STATE --> EDIT_INTERFACE
LAYOUT_MAP --> SHORTCUT_LIST

subgraph subGraph2 ["Edit Flow"]
    CLICK_EDIT
    CAPTURE_KEYS
    VALIDATE_COMBO
    SAVE_CHANGES
    CAPTURE_KEYS --> VALIDATE_COMBO
    VALIDATE_COMBO --> SAVE_CHANGES
end

subgraph subGraph1 ["State Management"]
    COMPONENT_STATE
    KEYBOARD_SINK
    LAYOUT_MAP
end

subgraph subGraph0 ["UI Components"]
    SEARCH_INPUT
    SHORTCUT_LIST
    EDIT_INTERFACE
    ACTION_BUTTONS
    ADVANCED_MENU
    SEARCH_INPUT --> SHORTCUT_LIST
    SHORTCUT_LIST --> EDIT_INTERFACE
    EDIT_INTERFACE --> ACTION_BUTTONS
end
```

### Keyboard Layout Detection

The interface uses the Web Keyboard API to display platform-appropriate key labels:

```javascript
// From KeyboardSettings.tsx lines 206-227const layoutMapAPI = await navigator.keyboard?.getLayoutMap();const newMap = new Map<string, string>();for (const code of KEY_CODES) {    const label = layoutMapAPI.get(code as KeyMapCode) ?? code;    newMap.set(code, label);}
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L202-L227](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L202-L227)

 [src/renderer/library/components/settings/KeyboardSettings.tsx L139-L643](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L139-L643)

### Duplicate Detection

The UI automatically detects and highlights conflicting shortcuts:

| Detection Logic | Implementation |
| --- | --- |
| Scope overlap check | Compare `defaultKeyboardShortcuts[].scope` arrays |
| Key combination match | Use `keyboardShortcutMatches()` function |
| Visual indication | Red border for duplicated shortcuts |
| Cross-scope conflicts | Only flag overlapping scopes |

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L522-L527](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L522-L527)

## State Management Integration

### Redux Architecture

Keyboard shortcuts integrate with the application's Redux state management:

```mermaid
flowchart TD

SET_SHORTCUTS["setShortcuts<br>{shortcuts, save}"]
RELOAD_SHORTCUTS["reloadShortcuts<br>{defaults}"]
SHOW_SHORTCUTS["showShortcuts<br>{show}"]
KEYBOARD_STATE["IKeyboardState<br>{shortcuts: TKeyboardShortcutsMap}"]
INITIAL_STATE["initialState<br>defaultKeyboardShortcuts"]
SAGA_HANDLER["Keyboard Sagas<br>File Operations"]
MAIN_BRIDGE["IPC to Main Process<br>keyboardShortcuts Service"]

SET_SHORTCUTS --> KEYBOARD_STATE
RELOAD_SHORTCUTS --> SAGA_HANDLER
SHOW_SHORTCUTS --> SAGA_HANDLER
MAIN_BRIDGE --> SET_SHORTCUTS

subgraph subGraph2 ["Saga Processing"]
    SAGA_HANDLER
    MAIN_BRIDGE
    SAGA_HANDLER --> MAIN_BRIDGE
end

subgraph subGraph1 ["State Structure"]
    KEYBOARD_STATE
    INITIAL_STATE
    INITIAL_STATE --> KEYBOARD_STATE
end

subgraph Actions ["Actions"]
    SET_SHORTCUTS
    RELOAD_SHORTCUTS
    SHOW_SHORTCUTS
end
```

### Action Flow

The state management follows a clear action-saga pattern:

1. **UI Action**: User clicks save in settings UI
2. **Action Dispatch**: `setShortcuts.build(shortcuts, true)`
3. **Saga Processing**: Handle file persistence via main process
4. **State Update**: Reducer updates current shortcuts
5. **UI Sync**: Components re-render with new shortcuts

Sources: [src/common/redux/states/keyboard.ts L1-L13](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/keyboard.ts#L1-L13)

 [src/common/redux/reducers/keyboard.ts L1-L53](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/reducers/keyboard.ts#L1-L53)

 [src/common/redux/actions/keyboard/setShortcuts.ts L1-L30](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/actions/keyboard/setShortcuts.ts#L1-L30)