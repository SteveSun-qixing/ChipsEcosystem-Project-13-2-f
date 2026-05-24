# @chips/tokens

Token source files for `ref/sys/comp/motion/layout` layers.

`tokens/sys.json` is the public source for shared semantic runtime values,
including `chips.sys.icon.color/size/fill/wght/grad/opsz`. Theme packs may
override their concrete values, but public sys token keys must land here before
theme packages consume them.

## Source

- `tokens/ref.json`
- `tokens/sys.json`
- `tokens/motion.json`
- `tokens/layout.json`
- `tokens/comp/*.json`

Current component token sources include:

- `tokens/comp/button.json`
- `tokens/comp/input.json`
- `tokens/comp/checkbox.json`
- `tokens/comp/radio.json`
- `tokens/comp/switch.json`
- `tokens/comp/select.json`
- `tokens/comp/card-cover-frame.json`
- `tokens/comp/composite-card-window.json`

## Build Artifacts

- `dist/css/variables.css`
- `dist/json/tokens.json`
- `dist/ts/token-keys.d.ts`
- `dist/report/token-diff.md`
