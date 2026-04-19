# Settings UI

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

This document covers the user interface components and systems for managing application settings, with primary focus on the keyboard shortcut configuration interface. The Settings UI provides users with the ability to view, edit, and manage their keyboard shortcuts through an interactive interface in the library renderer.

For information about the underlying keyboard shortcut state management and persistence, see [State Management](/edrlab/thorium-reader/6-state-management). For details about keyboard event handling and registration, see [Keyboard Shortcuts](/edrlab/thorium-reader/9-keyboard-shortcuts).

## Settings UI Architecture

The Settings UI system is built around the `KeyboardSettings` component, which provides a comprehensive interface for keyboard shortcut management. The system integrates with Redux state management for real-time updates and persistence.

```mermaid
flowchart TD

KS["KeyboardSettings<br>Component"]
AT["AdvancedTrigger<br>Component"]
SM["Search & Filter<br>Module"]
EM["Edit Mode<br>Handler"]
RS["Redux Store<br>keyboard.shortcuts"]
KA["keyboardActions<br>setShortcuts/reloadShortcuts"]
KR["keyboardReducer"]
KMS["keyboardShortcuts<br>Service"]
FS["File System<br>JSON Storage"]
KLM["navigator.keyboard<br>getLayoutMap()"]
DOM["DOM Events<br>keyup/keydown"]

KS --> RS
AT --> KA
EM --> KA
RS --> KMS
KS --> KLM
KS --> DOM

subgraph subGraph3 ["Browser APIs"]
    KLM
    DOM
end

subgraph subGraph2 ["Main Process Services"]
    KMS
    FS
    KMS --> FS
end

subgraph subGraph1 ["Redux State Management"]
    RS
    KA
    KR
    KA --> KR
    KR --> RS
end

subgraph subGraph0 ["Library Renderer Process"]
    KS
    AT
    SM
    EM
    KS --> AT
    KS --> SM
    KS --> EM
end
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L139-L643](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L139-L643)

 [src/common/redux/reducers/keyboard.ts L14-L52](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/reducers/keyboard.ts#L14-L52)

 [src/main/keyboard.ts L219-L237](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/keyboard.ts#L219-L237)

## Keyboard Settings Component Structure

The `KeyboardSettings` class component manages the complete keyboard shortcut configuration interface. It handles shortcut display, editing, validation, and user interaction.

### Core Component State

The component maintains several state properties for managing the editing workflow:

| State Property | Type | Purpose |
| --- | --- | --- |
| `displayKeyboardShortcuts` | boolean | Controls overall display visibility |
| `editKeyboardShortcutId` | `TKeyboardShortcutId \| undefined` | Currently edited shortcut ID |
| `editKeyboardShortcutData` | `TKeyboardShortcut \| undefined` | Temporary edit data |
| `searchItem` | `string \| undefined` | Search filter text |
| `selectLayoutMap` | `Map<string, string> \| null` | Keyboard layout mapping |

```mermaid
flowchart TD

ES["editKeyboardShortcutId<br>Currently Editing ID"]
ED["editKeyboardShortcutData<br>Temporary Edit Data"]
SI["searchItem<br>Search Filter"]
SLM["selectLayoutMap<br>Layout Mapping"]
SB["Search Box<br>Input Field"]
EI["Edit Interface<br>Key Capture"]
SV["Save Button<br>Confirm Edit"]
CN["Cancel Button<br>Discard Edit"]
FL["Filtered List<br>Search Results"]
HL["Highlighted Shortcuts<br>Duplicates/Active"]
TT["Tooltips<br>Descriptions"]

SB --> SI
EI --> ED
SV --> ES
CN --> ES
SI --> FL
ES --> HL
ED --> HL
SLM --> TT

subgraph subGraph2 ["Display Logic"]
    FL
    HL
    TT
end

subgraph subGraph1 ["User Interactions"]
    SB
    EI
    SV
    CN
end

subgraph subGraph0 ["KeyboardSettings Component State"]
    ES
    ED
    SI
    SLM
end
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L77-L84](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L77-L84)

 [src/renderer/library/components/settings/KeyboardSettings.tsx L144-L160](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L144-L160)

## Keyboard Shortcut Editing Workflow

The keyboard shortcut editing system provides an inline editing interface with real-time key capture and validation.

### Edit Mode Activation

When a user clicks the edit button for a shortcut, the component enters edit mode:

```mermaid
sequenceDiagram
  participant User
  participant KeyboardSettings
  participant DOM Events
  participant Component State

  User->>KeyboardSettings: Click edit button
  KeyboardSettings->>Component State: Set editKeyboardShortcutId
  KeyboardSettings->>Component State: Set editKeyboardShortcutData
  KeyboardSettings->>KeyboardSettings: Activate keyboard sink
  KeyboardSettings->>DOM Events: Listen for keyup events
  loop [Key Capture]
    DOM Events->>KeyboardSettings: keyup event
    KeyboardSettings->>KeyboardSettings: Process modifiers + key
    KeyboardSettings->>Component State: Update editKeyboardShortcutData
    KeyboardSettings->>KeyboardSettings: Display preview
  end
  User->>KeyboardSettings: Click save/cancel
  KeyboardSettings->>KeyboardSettings: Deactivate keyboard sink
  KeyboardSettings->>Component State: Clear edit state
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L645-L720](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L645-L720)

 [src/renderer/library/components/settings/KeyboardSettings.tsx L554-L568](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L554-L568)

### Key Capture and Processing

The component implements sophisticated key capture logic that handles modifier keys and prevents conflicts:

```mermaid
flowchart TD

KE["keyup Event<br>DOM KeyboardEvent"]
MOD["Modifier Detection<br>shift/ctrl/alt/meta"]
KC["Key Code<br>Physical Key"]
VAL["Validation<br>Conflict Check"]
MS["_keyModifierShift"]
MC["_keyModifierControl"]
MA["_keyModifierAlt"]
MM["_keyModifierMeta"]
KSD["TKeyboardShortcut<br>Data Structure"]
PV["Preview Display<br>Visual Feedback"]
DC["Duplicate Check<br>Conflict Detection"]

MOD --> MS
MOD --> MC
MOD --> MA
MOD --> MM
MS --> KSD
MC --> KSD
MA --> KSD
MM --> KSD
KC --> KSD
KSD --> VAL

subgraph subGraph2 ["Output Generation"]
    KSD
    PV
    DC
    KSD --> PV
    KSD --> DC
end

subgraph subGraph1 ["Modifier State Tracking"]
    MS
    MC
    MA
    MM
end

subgraph subGraph0 ["Key Event Processing"]
    KE
    MOD
    KC
    VAL
    KE --> MOD
    KE --> KC
end
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L645-L720](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L645-L720)

 [src/common/keyboard.ts L533-L541](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/keyboard.ts#L533-L541)

## Advanced Configuration Features

The `AdvancedTrigger` component provides additional keyboard shortcut management options through a dropdown menu interface.

### Advanced Menu Options

The advanced menu exposes three key operations:

| Action | Function | Purpose |
| --- | --- | --- |
| Reset Defaults | `reloadShortcuts(true)` | Restore factory defaults |
| Edit User JSON | `showShortcuts()` | Open JSON file in editor |
| Load User JSON | `reloadShortcuts(false)` | Reload from saved file |

```mermaid
flowchart TD

MT["Menu Trigger<br>Popover Button"]
PM["Popover Menu<br>Radix UI Popover"]
RD["Reset Defaults<br>Button"]
EJ["Edit JSON<br>Button"]
LJ["Load JSON<br>Button"]
RS["reloadShortcuts<br>Action Creator"]
SS["showShortcuts<br>Action Creator"]
KS_SERVICE["keyboardShortcuts<br>Service"]
SF["showFolder()<br>File Explorer"]
LU["loadUser()<br>JSON Parse"]
LD["loadDefaults()<br>Reset"]

RD --> RS
EJ --> SS
LJ --> RS
RS --> KS_SERVICE
SS --> SF

subgraph subGraph2 ["Main Process"]
    KS_SERVICE
    SF
    LU
    LD
    KS_SERVICE --> LU
    KS_SERVICE --> LD
end

subgraph subGraph1 ["Redux Actions"]
    RS
    SS
end

subgraph subGraph0 ["AdvancedTrigger Component"]
    MT
    PM
    RD
    EJ
    LJ
    MT --> PM
    PM --> RD
    PM --> EJ
    PM --> LJ
end
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L93-L136](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L93-L136)

 [src/main/keyboard.ts L79-L89](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/keyboard.ts#L79-L89)

## Search and Filtering System

The keyboard settings interface includes a comprehensive search system that filters shortcuts by name and description:

### Search Implementation

```mermaid
flowchart TD

SI["Search Input<br>Text Field"]
SP["searchItem State<br>Filter Value"]
PH["Placeholder Text<br>i18n Key"]
IE["isEmpty Check<br>Trim & Normalize"]
NF["Name Filter<br>cleanNames[key].name"]
DF["Description Filter<br>cleanNames[key].description"]
FL["Filtered List<br>ObjectKeys Result"]
UL["Unordered List<br>stylesGlobal.p_0"]
LI["List Items<br>Keyboard Shortcuts"]
NF_MSG["No Results<br>noShortcutFound"]

SP --> IE
FL --> UL
FL --> NF_MSG

subgraph subGraph2 ["Display Results"]
    UL
    LI
    NF_MSG
    UL --> LI
end

subgraph subGraph1 ["Filter Logic"]
    IE
    NF
    DF
    FL
    IE --> NF
    IE --> DF
    NF --> FL
    DF --> FL
end

subgraph subGraph0 ["Search Interface"]
    SI
    SP
    PH
    SI --> SP
end
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L510-L517](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L510-L517)

 [src/renderer/library/components/settings/KeyboardSettings.tsx L472-L478](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L472-L478)

## Keyboard Layout Detection

The component integrates with the Keyboard API to provide accurate key labeling based on the user's physical keyboard layout:

```mermaid
flowchart TD

KA["navigator.keyboard<br>Keyboard API"]
GLM["getLayoutMap()<br>Promise"]
KLM["KeyboardLayoutMap<br>Map"]
KC_LIST["KEY_CODES<br>Array of Key Codes"]
MAP_BUILD["Map Building<br>code -> label"]
SLM_STATE["selectLayoutMap<br>Component State"]
KD["Key Display<br>Physical Labels"]
PT["prettifyKeyboardShortcut<br>Render Method"]
ST["stringifyKeyboardShortcut<br>String Method"]

KLM --> MAP_BUILD
SLM_STATE --> KD

subgraph subGraph2 ["UI Integration"]
    KD
    PT
    ST
    KD --> PT
    KD --> ST
end

subgraph subGraph1 ["Key Code Processing"]
    KC_LIST
    MAP_BUILD
    SLM_STATE
    KC_LIST --> MAP_BUILD
    MAP_BUILD --> SLM_STATE
end

subgraph subGraph0 ["Layout Detection System"]
    KA
    GLM
    KLM
    KA --> GLM
    GLM --> KLM
end
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L202-L227](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L202-L227)

 [src/typings/keyboard.d.ts L1-L63](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/keyboard.d.ts#L1-L63)

 [src/renderer/common/keyboard.ts L49-L60](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/keyboard.ts#L49-L60)

## Duplicate Detection and Validation

The settings UI includes sophisticated validation to detect and highlight duplicate keyboard shortcuts:

### Conflict Detection Logic

The system checks for shortcuts that share the same key combination within overlapping scopes:

```mermaid
flowchart TD

SC["Scope Check<br>defaultKeyboardShortcuts[id].scope"]
SO["Scope Overlap<br>Array intersection"]
KM["Key Match<br>keyboardShortcutMatches()"]
DD["isDuplicated<br>Boolean Result"]
RB["Red Border<br>Duplicate Indicator"]
OB["Orange Border<br>Secondary Warning"]
HL["Highlighting<br>Visual Emphasis"]
RS["reader Scope<br>Reading Interface"]
BS["bookshelf Scope<br>Library Interface"]
CS["catalogs Scope<br>OPDS Interface"]

DD --> RB
DD --> OB
DD --> HL
RS --> SC
BS --> SC
CS --> SC

subgraph subGraph2 ["Scope Types"]
    RS
    BS
    CS
end

subgraph subGraph1 ["Visual Feedback"]
    RB
    OB
    HL
end

subgraph subGraph0 ["Duplicate Detection"]
    SC
    SO
    KM
    DD
    SC --> SO
    SO --> KM
    KM --> DD
end
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L522-L527](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L522-L527)

 [src/renderer/library/components/settings/KeyboardSettings.tsx L532-L533](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L532-L533)

 [src/common/keyboard.ts L14-L17](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/keyboard.ts#L14-L17)

## Internationalization Integration

The keyboard settings interface fully supports internationalization with translatable labels, descriptions, and UI text:

### Translation Structure

The component uses a comprehensive translation mapping system:

```mermaid
flowchart TD

CN["cleanNames<br>TKeyboardShortcutsMapNameDescription"]
TK["Translation Keys<br>settings.keyboard.list.*"]
I18N["i18n Function<br>__() Translator"]
SN["Shortcut Names<br>name Property"]
SD["Shortcut Descriptions<br>description Property"]
TT["Tooltip Text<br>UI Labels"]
PH_TEXT["Placeholder<br>searchPlaceholder"]
BTN_TEXT["Button Labels<br>save/cancel/edit"]
MSG_TEXT["Messages<br>noShortcutFound"]

CN --> SN
CN --> SD
CN --> TT
I18N --> PH_TEXT
I18N --> BTN_TEXT
I18N --> MSG_TEXT

subgraph subGraph2 ["UI Elements"]
    PH_TEXT
    BTN_TEXT
    MSG_TEXT
end

subgraph subGraph1 ["Shortcut Metadata"]
    SN
    SD
    TT
end

subgraph subGraph0 ["Translation System"]
    CN
    TK
    I18N
    TK --> I18N
    I18N --> CN
end
```

Sources: [src/renderer/library/components/settings/KeyboardSettings.tsx L249-L470](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L249-L470)

 [src/renderer/library/components/settings/KeyboardSettings.tsx L514](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L514-L514)

 [src/renderer/library/components/settings/KeyboardSettings.tsx L52](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/settings/KeyboardSettings.tsx#L52-L52)