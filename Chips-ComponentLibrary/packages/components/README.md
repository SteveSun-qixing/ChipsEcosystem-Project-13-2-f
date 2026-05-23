# @chips/components

Base interactive components and contract helpers.

## Components

- `ChipsButton`
- `ChipsInput`
- `ChipsCheckbox`
- `ChipsRadioGroup`
- `ChipsSwitch`
- `ChipsSelect`
- `ChipsDialog`
- `ChipsPopover`
- `ChipsTabs`
- `ChipsMenu`
- `ChipsToolbar`
- `ChipsToolbarItem`
- `ChipsMenuBar`
- `ChipsContextMenu`
- `ChipsShortcut`
- `ChipsCommandPalette`

## Command Consumers

Command consumer components render Host command views and invoke actions through an injected adapter.

- Use `ChipsCommandProvider` to inject `createCommandAdapter(client)` and i18n.
- Use `ChipsToolbar / ChipsToolbarItem` for `toolbarPlacement`.
- Use `ChipsMenuBar / ChipsContextMenu` for `menuPlacement`.
- Use `ChipsCommandPalette` for palette search over command views.
- Use `ChipsShortcut` only to display accelerator text; Host still owns shortcut registration.

## Helpers

- `resolveInteractiveState`
- `interactiveStateReducer`
- `buildComponentContract`
- `validateComponentA11y`
- `P0_BASE_INTERACTIVE_COMPONENTS`
- `createCommandAdapter`
- `resolveCommandToolbarItems`
- `resolveCommandMenuGroups`
- `resolveCommandPaletteItems`
