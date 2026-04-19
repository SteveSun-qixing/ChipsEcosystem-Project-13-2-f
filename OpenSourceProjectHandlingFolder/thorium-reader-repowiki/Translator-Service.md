# Translator Service

> **Relevant source files**
> * [scripts/csvToJson.py](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/csvToJson.py)
> * [scripts/readme.md](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/readme.md?plain=1)
> * [src/common/services/translator.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts)
> * [src/renderer/common/components/dialog/publicationInfos/formatPublicationLanguage.tsx](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/components/dialog/publicationInfos/formatPublicationLanguage.tsx)

The Translator Service provides internationalization (i18n) capabilities for Thorium Reader, supporting 39+ languages through type-safe translation functions. It implements a wrapper around i18next with fallback mechanisms, multi-language content handling, and seamless integration across main and renderer processes.

For general internationalization overview including locale files, see [Internationalization](/edrlab/thorium-reader/7-internationalization). For language selection UI, see [Language Selection](/edrlab/thorium-reader/7.3-language-selection).

## Core Architecture

The translator service is built on top of i18next and provides a centralized translation system with English fallback support. It loads all language catalogs at initialization and provides type-safe translation functions throughout the application.

```mermaid
flowchart TD

TS["translator.ts"]
I18N["i18nextInstance"]
I18NEN["i18nextInstanceEN (fallback)"]
AL["availableLanguages"]
EN["en.json"]
FR["fr.json"]
DE["de.json"]
ES["es.json"]
MORE["...35+ more locales"]
TRANSLATE["translate()"]
SETLOCALE["setLocale()"]
HELPER["translateContentFieldHelper()"]
GETTR["getTranslator()"]
KEYS["TTranslatorKeyParameter"]
FUNC["I18nFunction"]

EN --> I18N
FR --> I18N
DE --> I18N
ES --> I18N
MORE --> I18N
EN --> I18NEN
I18N --> TRANSLATE
I18NEN --> TRANSLATE
AL --> SETLOCALE
I18N --> SETLOCALE
KEYS --> TRANSLATE
FUNC --> GETTR
TS --> TRANSLATE
TS --> SETLOCALE
TS --> HELPER
TS --> GETTR

subgraph subGraph3 ["Type Safety"]
    KEYS
    FUNC
end

subgraph subGraph2 ["Translation API"]
    TRANSLATE
    SETLOCALE
    HELPER
    GETTR
end

subgraph subGraph1 ["Language Catalogs"]
    EN
    FR
    DE
    ES
    MORE
end

subgraph subGraph0 ["Translator Service Core"]
    TS
    I18N
    I18NEN
    AL
    TS --> I18N
    TS --> I18NEN
    TS --> AL
end
```

Sources: [src/common/services/translator.ts L1-L285](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L1-L285)

## i18next Integration

The service creates two i18next instances for robust translation handling with fallback support. The main instance handles the current locale while a dedicated English instance ensures fallback translations are always available.

```mermaid
flowchart TD

REQUEST["translate(key, options)"]
CHECK["i18nextInstance.t()"]
FALLBACK_CHECK["label.length > 0?"]
ENGLISH["i18nextInstanceEN.t()"]
RETURN["return translation"]
CONFIG["init() config"]
RESOURCES["resources object"]
FALLBACK["fallbackLng: 'en'"]
COMPAT["compatibilityJSON: 'v4'"]
MAIN["i18nextInstance"]
CLONE["i18nextInstanceEN"]
CHANGE["changeLanguage()"]

CONFIG --> MAIN

subgraph subGraph1 ["Instance Management"]
    MAIN
    CLONE
    CHANGE
    MAIN --> CLONE
    CHANGE --> MAIN
end

subgraph subGraph0 ["i18next Configuration"]
    CONFIG
    RESOURCES
    FALLBACK
    COMPAT
    RESOURCES --> CONFIG
    FALLBACK --> CONFIG
    COMPAT --> CONFIG
end

subgraph subGraph2 ["Translation Process"]
    REQUEST
    CHECK
    FALLBACK_CHECK
    ENGLISH
    RETURN
    REQUEST --> CHECK
    CHECK --> FALLBACK_CHECK
    FALLBACK_CHECK --> ENGLISH
    FALLBACK_CHECK --> RETURN
    ENGLISH --> RETURN
end
```

Sources: [src/common/services/translator.ts L45-L174](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L45-L174)

 [src/common/services/translator.ts L176-L181](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L176-L181)

 [src/common/services/translator.ts L231-L237](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L231-L237)

## Language Support

The service supports 39 languages through imported JSON catalog files. Each language is mapped to a human-readable display name in the `availableLanguages` object.

| Language Code | Display Name | Catalog Import |
| --- | --- | --- |
| en | English | `enCatalog` |
| fr | Français (French) | `frCatalog` |
| de | Deutsch (German) | `deCatalog` |
| es | Español (Spanish) | `esCatalog` |
| zh-CN | 简体中文 - 中国 | `zhCnCatalog` |
| zh-TW | 繁體中文 - 台灣 | `zhTwCatalog` |
| pt-BR | Português Brasileiro | `ptBrCatalog` |
| pt-PT | Português (Portuguese - Portugal) | `ptPtCatalog` |
| ... | ... | ... |

The complete language mapping includes European, Asian, Middle Eastern, and regional variants with proper Unicode display names.

Sources: [src/common/services/translator.ts L9-L37](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L9-L37)

 [src/common/services/translator.ts L186-L216](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L186-L216)

## Translation API

The service exposes a clean API through the `translator` object and `getTranslator()` factory function. The main translation functions handle different use cases from simple key lookup to complex multi-language content processing.

### Core Translation Functions

```mermaid
flowchart TD

GETTR["getTranslator()"]
TRANSLATOR["translator object"]
TRANS["translate(message, options)"]
UNDERSCORE["__(message, options)"]
SETLOC["setLocale(newLocale)"]
HELPER["translateContentFieldHelper()"]
MULTILANG["IStringMap handling"]
LOCALE_MATCH["locale matching logic"]
PARAM["TTranslatorKeyParameter"]
I18NFUNC["I18nFunction type"]
OPTIONS["TOptions from i18next"]

TRANSLATOR --> TRANS
TRANSLATOR --> UNDERSCORE
TRANSLATOR --> SETLOC
TRANS --> HELPER
PARAM --> TRANS
OPTIONS --> TRANS

subgraph subGraph3 ["Type Safety"]
    PARAM
    I18NFUNC
    OPTIONS
    PARAM --> I18NFUNC
end

subgraph subGraph2 ["Content Helpers"]
    HELPER
    MULTILANG
    LOCALE_MATCH
    HELPER --> MULTILANG
    HELPER --> LOCALE_MATCH
end

subgraph subGraph1 ["Translation Methods"]
    TRANS
    UNDERSCORE
    SETLOC
end

subgraph subGraph0 ["Public API"]
    GETTR
    TRANSLATOR
    GETTR --> TRANSLATOR
end
```

Sources: [src/common/services/translator.ts L218-L237](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L218-L237)

 [src/common/services/translator.ts L279-L284](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L279-L284)

 [src/common/services/translator.ts L240-L277](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L240-L277)

### Locale Management

The `setLocale()` function handles language switching with proper async handling and change detection:

```mermaid
flowchart TD

INPUT["setLocale(newLocale)"]
CHECK["language !== newLocale?"]
CHANGE["changeLanguage(newLocale)"]
RETURN["return"]
AWAIT["await completion"]

subgraph subGraph0 ["setLocale Process"]
    INPUT
    CHECK
    CHANGE
    RETURN
    AWAIT
    INPUT --> CHECK
    CHECK --> CHANGE
    CHECK --> RETURN
    CHANGE --> AWAIT
    AWAIT --> RETURN
end
```

Sources: [src/common/services/translator.ts L220-L229](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L220-L229)

## Multi-Language Content Handling

The `translateContentFieldHelper()` function processes publication metadata that may contain multiple language variants, implementing a sophisticated fallback strategy for optimal user experience.

```mermaid
flowchart TD

INPUT["field: string | IStringMap"]
STRING_CHECK["typeof field === 'string'?"]
DIRECT_MATCH["field[locale]?"]
SIMPLIFIED["simplified locale match"]
ENGLISH["English fallback"]
FIRST["first available key"]
EMPTY["return ''"]
RETURN["return field"]

STRING_CHECK --> RETURN
DIRECT_MATCH --> RETURN
SIMPLIFIED --> RETURN
ENGLISH --> RETURN
FIRST --> RETURN

subgraph subGraph0 ["Content Field Processing"]
    INPUT
    STRING_CHECK
    DIRECT_MATCH
    SIMPLIFIED
    ENGLISH
    FIRST
    EMPTY
    INPUT --> STRING_CHECK
    STRING_CHECK --> DIRECT_MATCH
    DIRECT_MATCH --> SIMPLIFIED
    SIMPLIFIED --> ENGLISH
    ENGLISH --> FIRST
    FIRST --> EMPTY
end
```

The function implements a four-tier fallback strategy:

1. Direct locale match (e.g., `pt-BR`)
2. Simplified locale match (e.g., `pt` for `pt-BR`)
3. English locale variants (`en`, `en-US`, etc.)
4. First available key

Sources: [src/common/services/translator.ts L240-L277](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L240-L277)

## Type Safety Integration

The service integrates with TypeScript through generated types that provide compile-time safety for translation keys and parameters.

| Type | Purpose | Source |
| --- | --- | --- |
| `TTranslatorKeyParameter` | Valid translation keys | `en.translation-keys` |
| `I18nFunction` | Translation function signature | Local definition |
| `TOptions` | i18next options type | `i18next` package |

The `I18nFunction` type ensures consistent translation function signatures across the application:

```typescript
export type I18nFunction = (_: TTranslatorKeyParameter, __?: {}) => string;
```

Sources: [src/common/services/translator.ts L40](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L40-L40)

 [src/common/services/translator.ts L218](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/services/translator.ts#L218-L218)

## Usage in Components

Components access the translator service through the `getTranslator()` function and use the `availableLanguages` object for language display. The service integrates seamlessly with React components for dynamic language switching.

```mermaid
flowchart TD

IMPORT["import { availableLanguages }"]
COMPONENT["React.FC component"]
MAPPING["languages.map()"]
DISPLAY["language display"]
SPLIT["lang.split('-')[0]"]
LOOKUP["availableLanguages[l]"]
FALLBACK["|| lang"]
FORMAT["display formatting"]

MAPPING --> SPLIT
FORMAT --> DISPLAY

subgraph subGraph1 ["Language Processing"]
    SPLIT
    LOOKUP
    FALLBACK
    FORMAT
    SPLIT --> LOOKUP
    LOOKUP --> FALLBACK
    FALLBACK --> FORMAT
end

subgraph subGraph0 ["Component Usage"]
    IMPORT
    COMPONENT
    MAPPING
    DISPLAY
    IMPORT --> COMPONENT
    COMPONENT --> MAPPING
end
```

Sources: [src/renderer/common/components/dialog/publicationInfos/formatPublicationLanguage.tsx L11](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/components/dialog/publicationInfos/formatPublicationLanguage.tsx#L11-L11)

 [src/renderer/common/components/dialog/publicationInfos/formatPublicationLanguage.tsx L33-L34](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/common/components/dialog/publicationInfos/formatPublicationLanguage.tsx#L33-L34)

## Build-Time Language Processing

The system includes Python scripts for processing language data from CSV sources into JSON format for use in the translator service.

Sources: [scripts/csvToJson.py L1-L25](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/csvToJson.py#L1-L25)

 [scripts/readme.md L1-L16](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/readme.md?plain=1#L1-L16)