# LCP Rights Management

> **Relevant source files**
> * [src/common/views/publication.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/views/publication.ts)
> * [src/main/converter/publication.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/converter/publication.ts)
> * [src/main/db/document/publication.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/db/document/publication.ts)
> * [src/main/db/repository/publication.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/db/repository/publication.ts)
> * [src/main/redux/sagas/api/publication/import/importFromLink.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/api/publication/import/importFromLink.ts)
> * [src/main/redux/sagas/api/publication/import/importPublicationFromFs.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/api/publication/import/importPublicationFromFs.ts)
> * [src/main/services/lcp.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts)
> * [src/main/storage/publication-storage.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/storage/publication-storage.ts)

## Purpose and Scope

This document describes the Lightweight Content Protection (LCP) rights management system within Thorium Reader. It covers how DRM-protected content is imported, unlocked, and managed, including the license renewal and return functionality. For information about importing publications in general, see [Publication Management](/edrlab/thorium-reader/3.2-publication-management).

The LCP system enables Thorium Reader to handle protected content in various formats (EPUB, PDF, audiobooks) while enforcing rights defined in LCP licenses, such as lending periods and usage restrictions.

## Overview of LCP Rights Management

LCP (Lightweight Content Protection) is a DRM system developed by the Readium Foundation that protects digital publications while maintaining a user-friendly experience. Thorium Reader implements the LCP specification to support:

* Importing protected publications
* Unlocking content with user passphrases
* Managing license status (checking, renewing, returning)
* Enforcing usage rights like expiration dates

```mermaid
flowchart TD

LcpManager["LcpManager<br>@injectable()"]
LSDManager["LSDManager<br>(License Status Document)"]
SecretStorage["lcpHashesFilePath<br>(Encrypted Secrets)"]
PublicationViewConverter["PublicationViewConverter"]
PublicationStorage["PublicationStorage"]
PublicationRepository["PublicationRepository"]
ImportFS["importPublicationFromFS()"]
UnlockPublication["unlockPublication()"]
TryUserKeys["r2Publication.LCP.tryUserKeys()"]
SaveSecret["saveSecret()"]
CheckLicense["checkPublicationLicenseUpdate()"]
RenewLicense["renewPublicationLicense()"]
ReturnPublication["returnPublication()"]
ProcessStatusDoc["processStatusDocument()"]
LSDServer["LSD Status Server<br>(Renew/Return)"]
R2LCPLibrary["@r2-lcp-js Library<br>(Native DRM)"]

LcpManager --> PublicationViewConverter
LcpManager --> PublicationStorage
LcpManager --> PublicationRepository
ImportFS --> LcpManager
LcpManager --> UnlockPublication
LcpManager --> CheckLicense
LcpManager --> RenewLicense
LcpManager --> ReturnPublication
LSDManager --> LSDServer
TryUserKeys --> R2LCPLibrary

subgraph subGraph4 ["External LCP Services"]
    LSDServer
    R2LCPLibrary
end

subgraph subGraph3 ["License Operations"]
    RenewLicense
    ReturnPublication
    ProcessStatusDoc
    RenewLicense --> ProcessStatusDoc
    ReturnPublication --> ProcessStatusDoc
end

subgraph subGraph2 ["Authentication & Rights"]
    UnlockPublication
    TryUserKeys
    SaveSecret
    CheckLicense
    UnlockPublication --> TryUserKeys
    TryUserKeys --> SaveSecret
end

subgraph subGraph1 ["Publication Management"]
    PublicationViewConverter
    PublicationStorage
    PublicationRepository
    ImportFS
end

subgraph subGraph0 ["Core LCP Services"]
    LcpManager
    LSDManager
    SecretStorage
    LcpManager --> LSDManager
    LcpManager --> SecretStorage
end
```

Sources:

* [src/main/services/lcp.ts L64-L88](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L64-L88)
* [src/main/services/lcp.ts L142-L164](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L142-L164)
* [src/main/services/lcp.ts L724-L826](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L724-L826)
* [src/main/redux/sagas/api/publication/import/importPublicationFromFs.ts L197-L306](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/api/publication/import/importPublicationFromFs.ts#L197-L306)

## LCP Manager Architecture

The central component of the LCP rights management system is the `LcpManager` class, which coordinates all LCP-related operations. It interacts with the `LSDManager` to handle License Status Document operations and maintains a secure storage for LCP secrets (passphrases).

```mermaid
classDiagram
    class LcpManager {
        -publicationViewConverter: PublicationViewConverter
        -publicationStorage: PublicationStorage
        -publicationRepository: PublicationRepository
        -store: Store<RootState>
        -lsdManager: LSDManager
        -translator: getTranslator()
        +getAllSecrets() : : Promise<TLCPSecrets>
        +saveSecret(doc, lcpHashedPassphrase) : : Promise<void>
        +unlockPublication(doc, passphrase) : : Promise<result>
        +checkPublicationLicenseUpdate(doc) : : Promise<PublicationDocument>
        +renewPublicationLicense(doc) : : Promise<PublicationDocument>
        +returnPublication(doc) : : Promise<PublicationDocument>
        +injectLcplIntoZip(epubPath, lcp) : : Promise<void>
        +updateDocumentLcp(doc, r2LCP, skip) : : void
        +convertUnlockPublicationResultToString() : : string
        -getSecrets(doc) : : Promise<string[]>
        -injectLcplIntoZip_(epubPath, lcpStr) : : Promise<void>
    }
    class PublicationViewConverter {
        +updateLcpCache(doc, r2LCP) : : void
        +updatePublicationCache(doc, r2Pub) : : void
        +unmarshallR2Publication(doc) : : Promise<R2Publication>
        +removeFromMemoryCache(identifier) : : void
    }
    class PublicationStorage {
        +getPublicationEpubPath(identifier) : : string
        +storePublication(identifier, srcPath) : : Promise<File[]>
        +buildPublicationPath(identifier) : : string
    }
    class PublicationRepository {
        +save(doc) : : Promise<PublicationDocument>
        +get(identifier) : : Promise<PublicationDocument>
        +findAll() : : Promise<PublicationDocument[]>
    }
    LcpManager --> PublicationViewConverter : @inject
    LcpManager --> PublicationStorage : @inject
    LcpManager --> PublicationRepository : @inject
```

Sources:

* [src/main/services/lcp.ts L64-L88](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L64-L88)
* [src/main/services/lcp.ts L142-L164](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L142-L164)
* [src/main/services/lcp.ts L724-L826](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L724-L826)
* [src/main/converter/publication.ts L44-L334](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/converter/publication.ts#L44-L334)
* [src/main/storage/publication-storage.ts L35-L360](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/storage/publication-storage.ts#L35-L360)
* [src/main/db/repository/publication.ts L35-L287](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/db/repository/publication.ts#L35-L287)

### LCP Secrets Management

The `LcpManager` stores and manages LCP secrets (hashed passphrases) securely using the `CONFIGREPOSITORY_LCP_SECRETS` storage system:

| Feature | Implementation |
| --- | --- |
| Storage Location | `lcpHashesFilePath` (filesystem) |
| Encryption | `encryptPersist()` / `decryptPersist()` |
| Key Structure | Publication identifier → { passphrase, provider } |
| Sharing | Provider-based passphrase reuse across publications |

```
type TLCPSecrets = Record<string, { passphrase?: string, provider?: string }>;
```

The secrets management enables:

1. **Persistent Access**: Users don't need to re-enter passphrases for known publications
2. **Provider Sharing**: Passphrases from the same LCP provider can be reused across different publications
3. **Secure Storage**: All secrets are encrypted using `encryptPersist()` before filesystem storage

Sources:

* [src/main/services/lcp.ts L55-L62](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L55-L62)
* [src/main/services/lcp.ts L94-L164](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L94-L164)
* [src/main/fs/persistCrypto.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/fs/persistCrypto.ts)  (referenced in imports)

## LCP Rights Management

### License Rights Structure

LCP rights are defined in the `LcpRights` interface and include:

| Right | Description |
| --- | --- |
| print | Number of pages that can be printed |
| copy | Number of characters that can be copied |
| start | Start date of license validity |
| end | End date of license validity (expiration) |

These rights are enforced by the Readium LCP native module when accessing protected content.

Sources:

* [src/common/models/lcp.ts L21-L26](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/lcp.ts#L21-L26)
* [src/main/services/lcp.ts L856-L865](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L856-L865)

### License Status Document (LSD)

The LSD component enables the management of license status, including:

1. Checking license status with the LSD server
2. Renewing licenses to extend the lending period
3. Returning publications early to release loans

The `LSDManager` class (injected into `LcpManager`) handles these operations by communicating with LCP provider servers.

Sources:

* [src/main/services/lcp.ts L435-L645](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L435-L645)
* [src/common/models/lcp.ts L12-L19](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/lcp.ts#L12-L19)
* [src/common/models/lcp.ts L52-L74](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/models/lcp.ts#L52-L74)

## Publication Import Process with LCP

### Importing LCP-Protected Content

Thorium Reader supports importing LCP-protected content through multiple pathways:

| Content Type | File Extensions | Import Function |
| --- | --- | --- |
| LCPL License Files | `.lcpl` | `importLcplFromFS()` |
| Protected EPUB | `.epub` with embedded license | `EpubParsePromise()` |
| Protected Audiobooks | `.lcpa`, `.lcpau` | `extractFileFromZipToBuffer()` |
| Protected PDF | `.lcppdf` | `extractFileFromZipToBuffer()` |

```mermaid
flowchart TD

LCPLFile["LCPL License File<br>(.lcpl)"]
ProtectedEPUB["Protected EPUB<br>(embedded license.lcpl)"]
ProtectedAudio["Protected Audiobook<br>(.lcpa/.lcpau)"]
ProtectedPDF["Protected PDF<br>(.lcppdf)"]
ImportLCPL["importLcplFromFS()"]
ImportPubFS["importPublicationFromFS()"]
ExtractFromZip["extractFileFromZipToBuffer()"]
EpubParse["EpubParsePromise()"]
InjectLCP["injectLcplIntoZip_()"]
DeserializeLCP["TaJsonDeserialize(r2LCPJson, LCP)"]
InitLCP["r2LCP.init()"]
UpdateCache["updateLcpCache()"]
StorePublication["publicationStorage.storePublication()"]
SaveSecret["lcpManager.saveSecret()"]
CheckUpdate["checkPublicationLicenseUpdate()"]

LCPLFile --> ImportLCPL
ProtectedEPUB --> ImportPubFS
ProtectedAudio --> ImportPubFS
ProtectedPDF --> ImportPubFS
ImportLCPL --> InjectLCP
ExtractFromZip --> DeserializeLCP
EpubParse --> DeserializeLCP
UpdateCache --> StorePublication

subgraph subGraph3 ["Storage & Verification"]
    StorePublication
    SaveSecret
    CheckUpdate
    StorePublication --> SaveSecret
    StorePublication --> CheckUpdate
end

subgraph subGraph2 ["LCP Processing"]
    InjectLCP
    DeserializeLCP
    InitLCP
    UpdateCache
    InjectLCP --> DeserializeLCP
    DeserializeLCP --> InitLCP
    InitLCP --> UpdateCache
end

subgraph subGraph1 ["Import Functions"]
    ImportLCPL
    ImportPubFS
    ExtractFromZip
    EpubParse
    ImportPubFS --> EpubParse
    ImportPubFS --> ExtractFromZip
end

subgraph subGraph0 ["Import Sources"]
    LCPLFile
    ProtectedEPUB
    ProtectedAudio
    ProtectedPDF
end
```

Sources:

* [src/main/redux/sagas/api/publication/import/importPublicationFromFs.ts L47-L306](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/api/publication/import/importPublicationFromFs.ts#L47-L306)
* [src/main/redux/sagas/api/publication/import/importLcplFromFs.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/api/publication/import/importLcplFromFs.ts)  (referenced in imports)
* [src/main/services/lcp.ts L166-L207](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L166-L207)
* [src/main/services/lcp.ts L209-L213](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L209-L213)

### LCPL Import Process

When importing an LCPL license file:

1. The file is parsed and validated
2. The linked publication is downloaded from the provider
3. The LCP license is injected into the publication
4. The publication is stored with its LCP license

For direct import of protected publications, the embedded license is extracted and processed similarly.

Sources:

* [src/main/redux/sagas/api/publication/import/importLcplFromFs.ts L32-L147](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/api/publication/import/importLcplFromFs.ts#L32-L147)
* [src/main/services/lcp.ts L210-L225](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L210-L225)

## LCP Authentication

### Unlocking Publications

The unlocking process verifies the user's passphrase against the LCP license:

1. User enters passphrase in the UI
2. Passphrase is hashed and sent to `LcpManager.unlockPublication()`
3. The hashed passphrase is tried against the LCP license
4. If successful, the passphrase is saved for future use
5. If unsuccessful, an error message is displayed

```mermaid
sequenceDiagram
  participant User
  participant UI Dialog
  participant Redux Saga
  participant LcpManager
  participant R2 LCP Library

  User->>UI Dialog: Enter passphrase
  UI Dialog->>Redux Saga: Dispatch unlockPublicationWithPassphrase
  Redux Saga->>LcpManager: unlockPublication(doc, passphrase)
  LcpManager->>LcpManager: Hash passphrase
  LcpManager->>R2 LCP Library: tryUserKeys([hashedPassphrase])
  loop [Successful unlock]
    R2 LCP Library-->>LcpManager: Success
    LcpManager->>LcpManager: saveSecret(doc, hashedPassphrase)
    LcpManager-->>Redux Saga: undefined (success)
    Redux Saga->>Redux Saga: Dispatch openReader
    R2 LCP Library-->>LcpManager: Error code
    LcpManager-->>Redux Saga: Error message
    Redux Saga->>UI Dialog: Show error, request passphrase again
  end
```

Sources:

* [src/main/services/lcp.ts L725-L826](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L725-L826)
* [src/main/redux/sagas/lcp.ts L40-L98](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/lcp.ts#L40-L98)

### Error Handling

The system handles various LCP-related errors, including:

* Incorrect passphrase
* Expired license
* Revoked certificate
* Invalid signature

Error codes are converted to user-friendly messages for display.

Sources:

* [src/main/services/lcp.ts L650-L719](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L650-L719)

## LCP License Management

### License Renewal

Publications with renewable licenses can have their lending period extended:

1. User initiates renewal from the publication info UI
2. `LcpManager.renewPublicationLicense()` is called
3. The system checks for a valid renewal link in the LSD
4. If available, `lsdManager.lsdRenew()` is called to contact the LSD server
5. The updated license is saved and the UI is updated

Sources:

* [src/main/services/lcp.ts L435-L545](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L435-L545)
* [src/main/redux/sagas/lcp.ts L20-L28](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/lcp.ts#L20-L28)

### License Return

Publications can be returned before their expiration date:

1. User initiates return from the publication info UI
2. `LcpManager.returnPublication()` is called
3. The system checks for a valid return link in the LSD
4. If available, `lsdManager.lsdReturn()` is called to contact the LSD server
5. The license status is updated to reflect the return

Sources:

* [src/main/services/lcp.ts L547-L648](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L547-L648)
* [src/main/redux/sagas/lcp.ts L30-L38](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/lcp.ts#L30-L38)

### License Status Check

The system periodically checks license status:

1. `checkPublicationLicenseUpdate()` is called to verify license status
2. The LCP license is updated with the latest information from the LSD server
3. License status changes are reflected in the UI

Sources:

* [src/main/services/lcp.ts L374-L433](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L374-L433)
* [src/main/redux/sagas/api/publication/import/importPublicationFromFs.ts L290](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/api/publication/import/importPublicationFromFs.ts#L290-L290)

## OPDS Integration for LCP Content

Thorium Reader supports acquiring LCP-protected content from OPDS catalogs:

1. Protected content is identified in OPDS feeds
2. User initiates download/import
3. LCP license is processed during import
4. User is prompted for passphrase if needed

The UI distinguishes between different content types, including LCP-protected formats.

Sources:

* [src/renderer/library/components/dialog/publicationInfos/opdsControls/OpdsControls.tsx L49-L339](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/dialog/publicationInfos/opdsControls/OpdsControls.tsx#L49-L339)
* [src/renderer/library/components/dialog/publicationInfos/opdsControls/OpdsLinkProperties.tsx L37-L159](https://github.com/edrlab/thorium-reader/blob/02b67755/src/renderer/library/components/dialog/publicationInfos/opdsControls/OpdsLinkProperties.tsx#L37-L159)

## Technical Implementation Details

### State Management

LCP-related state is managed in Redux:

```
interface ILcpState {    publicationFileLocks: {        [identifier: string]: boolean;    };}
```

This prevents concurrent operations on the same publication that could cause conflicts.

Sources:

* [src/common/redux/states/lcp.ts L8-L13](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/states/lcp.ts#L8-L13)
* [src/common/redux/reducers/lcp.ts L17-L34](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/redux/reducers/lcp.ts#L17-L34)

### File Handling and Storage

Protected content is stored using a specialized file handling system:

| Operation | Function | Purpose |
| --- | --- | --- |
| Publication Storage | `storePublication()` | Stores protected files in publication directories |
| License Injection | `injectLcplIntoZip_()` | Injects LCPL license into publication ZIP files |
| License Caching | `updateLcpCache()` | Writes LCP license to `license.lcpl` in pub folder |
| Path Resolution | `getPublicationEpubPath()` | Resolves publication file paths by extension |

The system supports various LCP-protected formats:

```javascript
// Extension mapping for protected contentconst isAudioBookLcp = new RegExp(`\\${acceptedExtensionObject.audiobookLcp}$`, "i").test(extension);const isLcpPdf = new RegExp(`\\${acceptedExtensionObject.pdfLcp}$`, "i").test(extension);
```

License injection logic varies by content type:

* **EPUB/WebPub**: License placed in `META-INF/license.lcpl`
* **Audiobooks/PDF/Divina**: License placed in root `license.lcpl`

Sources:

* [src/main/storage/publication-storage.ts L53-L301](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/storage/publication-storage.ts#L53-L301)
* [src/main/services/lcp.ts L166-L207](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/services/lcp.ts#L166-L207)
* [src/main/converter/publication.ts L59-L95](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/converter/publication.ts#L59-L95)
* [src/common/extension.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/extension.ts)  (referenced in imports)

### LCP Utils

Utility functions provide helper functionality:

* `lcpLicenseIsNotWellFormed()`: Validates LCP license structure
* `toSha256Hex()`: Creates hash for passphrases
* Content type detection for protected formats

Sources:

* [src/common/lcp.ts L12-L22](https://github.com/edrlab/thorium-reader/blob/02b67755/src/common/lcp.ts#L12-L22)
* [src/utils/mimeTypes.ts L1-L1934](https://github.com/edrlab/thorium-reader/blob/02b67755/src/utils/mimeTypes.ts#L1-L1934)

## Conclusion

The LCP rights management system in Thorium Reader provides comprehensive support for protected content while maintaining a user-friendly experience. It implements the Readium LCP specification to handle license acquisition, verification, and management, allowing users to access protected content from various sources while respecting publishers' rights constraints.