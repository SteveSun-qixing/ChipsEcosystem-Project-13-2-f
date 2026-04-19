# Internationalization

> **Relevant source files**
> * [src/resources/locales/de.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/de.json)
> * [src/resources/locales/en.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json)
> * [src/resources/locales/es.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/es.json)
> * [src/resources/locales/fr.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/fr.json)
> * [src/resources/locales/it.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/it.json)
> * [src/resources/locales/ja.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/ja.json)
> * [src/resources/locales/lt.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/lt.json)
> * [src/resources/locales/nl.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/nl.json)
> * [src/resources/locales/pt-br.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/pt-br.json)
> * [src/resources/locales/pt-pt.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/pt-pt.json)
> * [src/resources/locales/ru.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/ru.json)
> * [src/resources/locales/zh-cn.json](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/zh-cn.json)
> * [src/typings/en.translation-keys.d.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation-keys.d.ts)
> * [src/typings/en.translation.d.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation.d.ts)

This document describes the internationalization (i18n) system in Thorium Reader. It covers how the application supports multiple languages, how translation files are structured and loaded, and how the UI components access translated strings. For information about specific language preferences in the reader configuration, see page [Reader Configuration](/edrlab/thorium-reader/2.5-reader-configuration).

## Overview

Thorium Reader has a comprehensive internationalization system that supports 39+ languages through JSON locale files. The application uses the i18next library to handle translations and provides a custom translator service to make translations available throughout the application. This system integrates with both the Library Renderer and Reader Renderer processes as part of the overall Electron architecture.

**I18N System Architecture**

```mermaid
flowchart TD

enJson["en.json"]
frJson["fr.json"]
deJson["de.json"]
otherLocales["37+ other locale files"]
translatorTs["translator.ts"]
i18nextInstance["i18nextInstance"]
i18nextInstanceEN["i18nextInstanceEN (fallback)"]
translationKeysTs["en.translation-keys.d.ts<br>TTranslatorKeyParameter"]
translationTs["en.translation.d.ts<br>TFunction interface"]
libraryRenderer["Library Renderer<br>Publication Management UI"]
readerRenderer["Reader Renderer<br>Reading Interface UI"]
reduxState["Redux State<br>language preference"]

enJson --> i18nextInstance
frJson --> i18nextInstance
deJson --> i18nextInstance
otherLocales --> i18nextInstance
enJson --> i18nextInstanceEN
translationKeysTs --> translatorTs
translationTs --> translatorTs
translatorTs --> libraryRenderer
translatorTs --> readerRenderer
reduxState --> translatorTs

subgraph subGraph3 ["Application Layer"]
    libraryRenderer
    readerRenderer
    reduxState
end

subgraph subGraph2 ["Type Safety Layer"]
    translationKeysTs
    translationTs
end

subgraph subGraph1 ["Translation Service Layer"]
    translatorTs
    i18nextInstance
    i18nextInstanceEN
    i18nextInstance --> translatorTs
    i18nextInstanceEN --> translatorTs
end

subgraph subGraph0 ["Translation Resources"]
    enJson
    frJson
    deJson
    otherLocales
end
```

Sources:

* [src/common/services/translator.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts)
* [src/resources/locales/en.json L1-L10](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L1-L10)
* [src/resources/locales/fr.json L1-L10](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/fr.json#L1-L10)
* [src/typings/en.translation.d.ts L1-L10](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation.d.ts#L1-L10)
* [src/typings/en.translation-keys.d.ts L1-L5](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation-keys.d.ts#L1-L5)

## Locale Files

The translation strings are stored in JSON files located in the `src/resources/locales/` directory. Each supported language has its own file, named with the language code (e.g., `en.json` for English, `fr.json` for French).

### Structure

Each locale file follows the same structure with nested objects representing keys for different parts of the application. This hierarchical organization helps keep translations organized by feature or component.

**Locale File Hierarchical Structure**

```mermaid
flowchart TD

root["Root JSON Object"]
accessibility["accessibility"]
app["app"]
catalog["catalog"]
dialog["dialog"]
header["header"]
library["library"]
message["message"]
opds["opds"]
publication["publication"]
reader["reader"]
appEdit["app.edit<br>(copy, cut, paste)"]
appSession["app.session<br>(exit dialog)"]
catalogOpds["catalog.opds<br>(auth, info)"]
libraryLcp["library.lcp<br>(password, hints)"]
readerAnnotations["reader.annotations<br>(colors, filters)"]
readerSettings["reader.settings<br>(font, display)"]

app --> appEdit
app --> appSession
catalog --> catalogOpds
library --> libraryLcp
reader --> readerAnnotations
reader --> readerSettings

subgraph subGraph1 ["Key Subsections"]
    appEdit
    appSession
    catalogOpds
    libraryLcp
    readerAnnotations
    readerSettings
end

subgraph subGraph0 ["Locale File Organization"]
    root
    accessibility
    app
    catalog
    dialog
    header
    library
    message
    opds
    publication
    reader
    root --> accessibility
    root --> app
    root --> catalog
    root --> dialog
    root --> header
    root --> library
    root --> message
    root --> opds
    root --> publication
    root --> reader
end
```

Example structure from `en.json`:

```json
{    "accessibility": {        "bookMenu": "Menu",        "closeDialog": "Close",        "importFile": "Import publication"    },    "app": {        "edit": {            "copy": "Copy",            "cut": "Cut",            "paste": "Paste"        },        "hide": "Hide {{- appName}}"    },    "reader": {        "annotations": {            "Color": "Color",            "addNote": "Annotate"        },        "settings": {            "font": "Font",            "fontSize": "Font size"        }    }}
```

Sources:

* [src/resources/locales/en.json L1-L50](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L1-L50)
* [src/resources/locales/en.json L617-L700](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L617-L700)
* [src/resources/locales/en.json L775-L850](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L775-L850)
* [src/resources/locales/fr.json L1-L50](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/fr.json#L1-L50)
* [src/resources/locales/de.json L1-L50](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/de.json#L1-L50)

### Available Languages

The application supports 39+ languages, with locale files stored in `src/resources/locales/`. Key supported languages include:

| Code | Language | File |
| --- | --- | --- |
| en | English | en.json |
| fr | Français (French) | fr.json |
| de | Deutsch (German) | de.json |
| es | Español (Spanish) | es.json |
| pt-pt | Português (Portuguese) | pt-pt.json |
| pt-br | Português do Brasil | pt-br.json |
| ja | 日本語 (Japanese) | ja.json |
| zh-cn | 中文简体 (Chinese Simplified) | zh-cn.json |
| it | Italiano (Italian) | it.json |
| nl | Nederlands (Dutch) | nl.json |
| lt | Lietuvių (Lithuanian) | lt.json |

The `availableLanguages` object in the translator service defines the mapping between language codes and display names used throughout the application.

Sources:

* [src/resources/locales/en.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L1-L1)
* [src/resources/locales/fr.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/fr.json#L1-L1)
* [src/resources/locales/de.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/de.json#L1-L1)
* [src/resources/locales/es.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/es.json#L1-L1)
* [src/resources/locales/pt-pt.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/pt-pt.json#L1-L1)
* [src/resources/locales/pt-br.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/pt-br.json#L1-L1)
* [src/resources/locales/ja.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/ja.json#L1-L1)
* [src/resources/locales/zh-cn.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/zh-cn.json#L1-L1)
* [src/resources/locales/it.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/it.json#L1-L1)
* [src/resources/locales/nl.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/nl.json#L1-L1)
* [src/resources/locales/lt.json L1](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/lt.json#L1-L1)
* [src/common/services/translator.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts)

## Translator Service

The translator service at `src/common/services/translator.ts` is the core of the internationalization system. It initializes the i18next library, loads the locale files, and provides functions for accessing translations.

**Translator Service Internal Architecture**

```mermaid
flowchart TD

translatorTs["translator.ts"]
i18nextInstance["i18nextInstance<br>(main translation instance)"]
i18nextInstanceEN["i18nextInstanceEN<br>(English fallback instance)"]
translateFunc["translate(key, options)<br>TTranslatorKeyParameter → string"]
setLocaleFunc["setLocale(locale)<br>string → Promise"]
translateContentFieldFunc["translateContentFieldHelper()<br>MultiLangString → string"]
availableLanguagesObj["availableLanguages<br>Record"]
uiComponents["UI Components<br>(Library, Reader, Settings)"]
reduxStore["Redux Store<br>(language preference state)"]
localeFiles["Locale Files<br>src/resources/locales/*.json"]
tTranslatorKeyParameter["TTranslatorKeyParameter<br>en.translation-keys.d.ts"]
tFunction["TFunction<br>en.translation.d.ts"]

localeFiles --> i18nextInstance
localeFiles --> i18nextInstanceEN
i18nextInstance --> translateFunc
i18nextInstanceEN --> translateFunc
translateFunc --> uiComponents
setLocaleFunc --> reduxStore
translateContentFieldFunc --> uiComponents
availableLanguagesObj --> uiComponents
tTranslatorKeyParameter --> translateFunc
tFunction --> uiComponents

subgraph subGraph3 ["Type Safety"]
    tTranslatorKeyParameter
    tFunction
end

subgraph subGraph2 ["External Integration"]
    uiComponents
    reduxStore
    localeFiles
end

subgraph subGraph1 ["API Functions"]
    translateFunc
    setLocaleFunc
    translateContentFieldFunc
    availableLanguagesObj
end

subgraph subGraph0 ["Core Services"]
    translatorTs
    i18nextInstance
    i18nextInstanceEN
end
```

Sources:

* [src/common/services/translator.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts)
* [src/typings/en.translation-keys.d.ts L1-L5](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation-keys.d.ts#L1-L5)
* [src/typings/en.translation.d.ts L1-L20](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation.d.ts#L1-L20)

### Key Components

| Component | Purpose | Type Signature |
| --- | --- | --- |
| `i18nextInstance` | Main translation instance with all languages | `i18n.i18n` |
| `i18nextInstanceEN` | English-only fallback instance | `i18n.i18n` |
| `translate()` | Primary translation function | `(key: TTranslatorKeyParameter, options?) => string` |
| `setLocale()` | Language switching function | `(locale: string) => Promise<void>` |
| `translateContentFieldHelper()` | Multi-language content helper | `(content: MultiLangString) => string` |
| `availableLanguages` | Language code to name mapping | `Record<string, string>` |

**Function Flow**

```mermaid
sequenceDiagram
  participant UI Component
  participant translator.ts
  participant i18nextInstance
  participant i18nextInstanceEN
  participant Locale JSON

  UI Component->>translator.ts: translate("reader.settings.font")
  translator.ts->>i18nextInstance: t("reader.settings.font")
  i18nextInstance->>Locale JSON: lookup key
  loop [Translation found]
    Locale JSON-->>i18nextInstance: "Font"
    i18nextInstance-->>translator.ts: "Font"
    i18nextInstance-->>translator.ts: undefined
    translator.ts->>i18nextInstanceEN: t("reader.settings.font")
    i18nextInstanceEN-->>translator.ts: "Font" (English fallback)
  end
  translator.ts-->>UI Component: "Font"
```

Sources:

* [src/common/services/translator.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts)
* [src/typings/en.translation-keys.d.ts L2](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation-keys.d.ts#L2-L2)

## Type Safety for Translations

Thorium Reader uses TypeScript to provide type safety for translations. This ensures that translation keys are valid and helps catch errors at compile time.

```mermaid
flowchart TD

translationKeys["TTranslatorKeyParameter<br>src/typings/en.translation-keys.d.ts"]
translationTypes["TFunction<br>src/typings/en.translation.d.ts"]
components["UI Components"]
translatorService["Translator Service"]

translationKeys --> translatorService
translationTypes --> components

subgraph Usage ["Usage"]
    components
    translatorService
    translatorService --> components
end

subgraph subGraph0 ["Type Definitions"]
    translationKeys
    translationTypes
end
```

### Translation Keys Type System

The TypeScript type system provides compile-time safety for translation keys through two complementary approaches:

**Type Definition Files**

```mermaid
flowchart TD

enTranslationKeysTs["en.translation-keys.d.ts"]
enTranslationTs["en.translation.d.ts"]
translatorTs["translator.ts"]
tTranslatorKeyParameter["TTranslatorKeyParameter<br>'accessibility' | 'accessibility.bookMenu' | ..."]
tFunction["TFunction<br>interface with nested structure"]
uiComponents["UI Components"]
translateFunction["translate() function"]

enTranslationKeysTs --> tTranslatorKeyParameter
enTranslationTs --> tFunction
tTranslatorKeyParameter --> translateFunction
tFunction --> uiComponents

subgraph Usage ["Usage"]
    uiComponents
    translateFunction
    translateFunction --> uiComponents
end

subgraph subGraph1 ["Generated Types"]
    tTranslatorKeyParameter
    tFunction
end

subgraph subGraph0 ["Type Safety System"]
    enTranslationKeysTs
    enTranslationTs
    translatorTs
end
```

**Key Type Examples:**

* `TTranslatorKeyParameter` includes keys like: * `"accessibility.bookMenu"` * `"reader.settings.font"` * `"catalog.opds.auth.login"` * `"publication.accessibility.name"`

**Nested Structure Example:**

```
interface TFunction {  (_: "reader.settings"): {    readonly "font": string,    readonly "fontSize": string,    readonly "display": string  };  (_: "reader.settings.font"): string;}
```

Sources:

* [src/typings/en.translation-keys.d.ts L1-L5](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation-keys.d.ts#L1-L5)
* [src/typings/en.translation.d.ts L1-L50](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation.d.ts#L1-L50)
* [src/typings/en.translation.d.ts L775-L850](https://github.com/edrlab/thorium-reader/blob/02b67755/src/typings/en.translation.d.ts#L775-L850)
* [src/common/services/translator.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts)

## Usage in UI Components

UI components use the translator service to access translations. This is typically done through the translator API or through a custom hook in React components.

### Usage in UI Components

UI components access translations through the translator service API. Common patterns include direct key lookups, parameterized translations, and language display formatting.

**Translation Usage Patterns**

```mermaid
flowchart TD

directKey["Direct Key Lookup<br>translate('reader.settings.font')"]
parameterized["Parameterized Translation<br>translate('app.hide', {appName: 'Thorium'})"]
nestedAccess["Nested Object Access<br>translate('reader.settings').font"]
languageFormatting["Language Display<br>availableLanguages[langCode]"]
readerSettings["reader.settings.font: 'Font'"]
appHide["app.hide: 'Hide {{- appName}}'"]
accessibility["accessibility.bookMenu: 'Menu'"]
catalogAuth["catalog.opds.auth.login: 'Login'"]

directKey --> readerSettings
parameterized --> appHide
nestedAccess --> readerSettings
directKey --> accessibility
directKey --> catalogAuth

subgraph subGraph1 ["Translation Examples from Locale Files"]
    readerSettings
    appHide
    accessibility
    catalogAuth
end

subgraph subGraph0 ["Common Usage Patterns"]
    directKey
    parameterized
    nestedAccess
    languageFormatting
end
```

**Language Display Example:**

```javascript
// Extract base language code and format display nameconst l = lang.split("-")[0] as keyof typeof availableLanguages;const ll = availableLanguages[l] || lang;
```

This pattern extracts the base language code from a full locale tag (e.g., "en" from "en-US") and maps it to a human-readable name using the `availableLanguages` object.

Sources:

* [src/resources/locales/en.json L29](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L29-L29)
* [src/resources/locales/en.json L789](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L789-L789)
* [src/resources/locales/en.json L3](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L3-L3)
* [src/resources/locales/en.json L91](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L91-L91)
* [src/common/services/translator.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts)

## Language Selection Process

Users can select their preferred language in the application settings. The selected language is stored in the Redux state and applied using the `setLocale` function.

```mermaid
sequenceDiagram
  participant User
  participant Settings UI
  participant Redux State
  participant Translator Service
  participant UI Components
  participant i18next

  User->>Settings UI: Select language
  Settings UI->>Redux State: Dispatch language change action
  Redux State->>Translator Service: Call setLocale(newLocale)
  Translator Service->>i18next: changeLanguage(newLocale)
  Translator Service-->>Redux State: Update language state
  Redux State-->>UI Components: Notify of language change
  UI Components->>Translator Service: Get translations
  Translator Service-->>UI Components: Return translated strings
  UI Components-->>User: Display UI in new language
```

When a language is selected:

1. The Redux state is updated with the new language preference
2. The `setLocale` function is called with the new locale code
3. The i18next instance changes the language
4. UI components re-render with the new translations

Sources:

* src/common/services/translator.ts:215-224

## Adding New Languages or Translations

New languages can be added to Thorium Reader by creating a new locale JSON file and updating the `availableLanguages` object in the translator service.

### Adding New Languages

**New Language Integration Process**

```mermaid
flowchart TD

step1["1. Create locale JSON file"]
step2["2. Import in translator.ts"]
step3["3. Add to i18next resources"]
step4["4. Add to availableLanguages"]
step5["5. Test translation coverage"]
newLocaleJson["new-lang.json<br>(structured translation keys)"]
translatorUpdate["translator.ts<br>(import & configure)"]
accessibility["accessibility.*"]
app["app.*"]
catalog["catalog.*"]
dialog["dialog.*"]
header["header.*"]
library["library.*"]
message["message.*"]
opds["opds.*"]
publication["publication.*"]
reader["reader.*"]

newLocaleJson --> accessibility
newLocaleJson --> app
newLocaleJson --> catalog
newLocaleJson --> dialog
newLocaleJson --> header
newLocaleJson --> library
newLocaleJson --> message
newLocaleJson --> opds
newLocaleJson --> publication
newLocaleJson --> reader

subgraph subGraph1 ["Required Structure Sections"]
    accessibility
    app
    catalog
    dialog
    header
    library
    message
    opds
    publication
    reader
end

subgraph subGraph0 ["New Language Files"]
    newLocaleJson
    translatorUpdate
end

subgraph subGraph2 ["Integration Steps"]
    step1
    step2
    step3
    step4
    step5
    step1 --> step2
    step2 --> step3
    step3 --> step4
    step4 --> step5
end
```

**Required Translation Sections:**

* `accessibility`: UI accessibility labels
* `app`: Application menu and session management
* `catalog`: Publication library management
* `dialog`: Modal dialogs and confirmations
* `header`: Main navigation and search
* `library`: LCP and publication access
* `message`: Status and error messages
* `opds`: Catalog feed management
* `publication`: Book metadata and details
* `reader`: Reading interface and settings

**Translation Management Tools:**

* `scripts/csvToJson.py`: Convert CSV translation data to JSON format
* TypeScript compiler: Validates translation key completeness

Sources:

* [scripts/csvToJson.py](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/csvToJson.py)
* [scripts/readme.md](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/readme.md?plain=1)
* [src/common/services/translator.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts)
* [src/resources/locales/en.json L1-L15](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L1-L15)
* [src/resources/locales/en.json L50-L125](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L50-L125)
* [src/resources/locales/en.json L620-L700](https://github.com/edrlab/thorium-reader/blob/02b67755/src/resources/locales/en.json#L620-L700)

## Load Flow of Translations

The following diagram shows how translations are loaded and used in the application:

```mermaid
flowchart TD

uiRender["UI Component Rendering"]
translateCall["Call translate() function"]
i18nLookup["i18next Lookup"]
fallback["Fallback to English if missing"]
displayString["Display Translated String"]
appInit["App Initialization"]
createI18n["Create i18next Instance"]
loadResources["Load Translation Resources"]
createTranslator["Create Translator API"]

subgraph subGraph1 ["Runtime Translation"]
    uiRender
    translateCall
    i18nLookup
    fallback
    displayString
    uiRender --> translateCall
    translateCall --> i18nLookup
    i18nLookup --> fallback
    fallback --> displayString
end

subgraph subGraph0 ["Application Startup"]
    appInit
    createI18n
    loadResources
    createTranslator
    appInit --> createI18n
    createI18n --> loadResources
    loadResources --> createTranslator
end
```

Sources:

* src/common/services/translator.ts:45-170
* src/common/services/translator.ts:226-232