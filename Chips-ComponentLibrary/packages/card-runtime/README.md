# @chips/card-runtime

Card runtime iframe components:

- `CardCoverFrame`
- `CompositeCardWindow`

Core helpers:

- `validateCardDisplayAdapter`
- `loadCoverFrameData`
- `loadCompositeWindowData`
- `parseCompositeFrameMessage`
- `resolveIframeSandboxPolicy`
- `isAllowedFrameOrigin`

SDK mode contract:

- `CompositeWindowMode.VIEW`
- `CompositeWindowMode.PREVIEW`

Composite iframe event contract:

- `ready`
- `resize`
- `node-error`
- `fatal-error`

Adapter contract (for SDK not-yet-available phase):

- `resolveCoverFrame({ cardId, cardFile, cardName, signal })`
- `resolveCompositeWindow({ cardFile, mode, signal })` (`mode` only supports `view | preview`)

SDK blocker tracking:

- `工单001-SDK-UNIFIED-CARD-DISPLAY-API`
